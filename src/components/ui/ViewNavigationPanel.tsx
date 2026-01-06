import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useStore } from '../../store/store';
import ViewCard from './ViewCard';
import './ViewNavigationPanel.css';

// New Icons


const CFSViewIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <path d="M10 10h4v4h-4z" />
    </svg>
);



// Icons for different view types
const MainViewIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const TopViewIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
);

const BlockViewIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);





const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

/**
 * ViewNavigationPanel - Telia-style collapsible side panel for view navigation
 */
const ViewNavigationPanel: React.FC = () => {
    const isOpen = useUIStore((state) => state.isViewPanelOpen);
    const togglePanel = useUIStore((state) => state.toggleViewPanel);
    const setViewPanelOpen = useUIStore((state) => state.setViewPanelOpen);
    const layout = useStore((state) => state.layout);
    const setSelectedBlock = useStore((state) => state.setSelectedBlock);

    // Generate view items from layout data
    const viewItems = useMemo(() => {
        const items: Array<{
            id: string;
            title: string;
            description?: string;
            icon: React.ReactNode;
            section?: string;
            event: string;
            eventData?: any;
        }> = [
                {
                    id: 'main',
                    title: 'Main View',
                    description: 'Overview of entire terminal yard',
                    icon: <MainViewIcon />,
                    section: 'General',
                    event: 'resetCameraToInitial', // Fixed event name
                },
                {
                    id: 'top',
                    title: 'Top View',
                    description: 'Bird\'s eye view from above',
                    icon: <TopViewIcon />,
                    section: 'General',
                    event: 'moveCameraToTop',
                },
            ];

        // Add views from layout entities
        if (layout?.entities) {
            // 1. BLOCKS
            // Group blocks by Terminal based on ID prefix (e.g., "trm_block_a" -> "TRM")
            const blockMap = new Map<string, { id: string; letter: string; terminal: string }>();

            layout.entities.forEach((entity) => {
                // Check if it's a container block
                if (entity.type.includes('container_block')) {
                    // 1. Determine Terminal from ID prefix using Regex
                    // matches "trm_block", "trl-1-block", "trs-block", "trl_1_block"
                    let terminal = '';

                    const termMatch = entity.id.match(/^([a-z0-9_.-]+)[-_]block/i);
                    if (termMatch) {
                        terminal = termMatch[1].toUpperCase();
                        // Normalize TRL1 to TRL-1 if it appears without hyphen
                        if (terminal === 'TRL1') terminal = 'TRL-1';
                        if (terminal === 'TRL_1') terminal = 'TRL-1'; // Check underscore variant
                    }

                    // 2. Determine Block Letter
                    let letter = '';
                    // Try Name first
                    if (entity.name) {
                        const match = entity.name.match(/Block\s*[-_]?\s*([A-Z0-9]+)/i);
                        if (match) letter = match[1].toUpperCase();
                    }
                    // Fallback to ID suffix
                    if (!letter) {
                        // Extract last part after - or _
                        const letterMatch = entity.id.match(/[-_]([a-z0-9]+)$/i);
                        if (letterMatch && letterMatch[1].length <= 3) {
                            letter = letterMatch[1].toUpperCase();
                        }
                    }

                    // Only add if we have both letter and a valid terminal (skips generic "Blocks")
                    if (letter && terminal) {
                        const key = `${terminal}-${letter}`;
                        // Store if new, or overwrite if needed (Map ensures uniqueness keys)
                        if (!blockMap.has(key)) {
                            blockMap.set(key, { id: entity.id, letter, terminal });
                        }
                    }
                }
            });

            // Add block items mapped to their terminal sections
            // Sort by Terminal Order then Block Letter
            // We'll just push them all and let the main section sorter handle sections, 
            // and we sort items within sections by letter.

            // Helper to sort keys: Terminal, then Letter
            Array.from(blockMap.values())
                .sort((a, b) => {
                    if (a.terminal !== b.terminal) return a.terminal.localeCompare(b.terminal);
                    return a.letter.localeCompare(b.letter);
                })
                .forEach((block) => {
                    items.push({
                        id: `block-${block.terminal}-${block.letter}`,
                        title: `Block ${block.letter}`,
                        description: `${block.terminal} Terminal Block ${block.letter}`,
                        icon: <BlockViewIcon />,
                        section: block.terminal, // "TRM", "TRS", "TRL", etc.
                        event: 'selectEntity',
                        eventData: { id: block.id },
                    });
                });

            // 2. CFS AREAS
            layout.entities
                .filter(e => e.type === 'cfs_area' && e.id !== 'cfs_area_2')
                .forEach(cfs => {
                    items.push({
                        id: cfs.id,
                        title: cfs.name || cfs.id,
                        description: cfs.props?.description || 'CFS Operation Area',
                        icon: <CFSViewIcon />,
                        section: 'CFS Areas',
                        event: 'selectEntity',
                        eventData: { id: cfs.id },
                    });
                });


        }

        return items;
    }, [layout]);

    // Group items by section
    const groupedItems = useMemo(() => {
        const groups: Record<string, typeof viewItems> = {};
        viewItems.forEach((item) => {
            const section = item.section || 'Other';
            if (!groups[section]) {
                groups[section] = [];
            }
            groups[section].push(item);
        });
        return groups;
    }, [viewItems]);

    const handleViewClick = (event: string, eventData?: any) => {
        if (event === 'selectEntity' && eventData?.id) {
            // Use store selection for entities (Blocks, CFS, Warehouses)
            setSelectedBlock(eventData.id);
        } else {
            // Dispatch window events for camera control (Main, Top)
            window.dispatchEvent(new CustomEvent(event, { detail: eventData }));
            // Also clear selection to ensure we exit any focused view
            if (event === 'resetCameraToInitial' || event === 'moveCameraToTop') {
                setSelectedBlock(null);
            }
        }
        setViewPanelOpen(false);
    };

    return (
        <>
            {/* Backdrop (Mobile) */}
            <div
                className={`view-panel-backdrop ${isOpen ? 'visible' : ''}`}
                onClick={() => setViewPanelOpen(false)}
            />

            {/* Toggle Button */}
            <button
                className={`view-panel-toggle ${isOpen ? 'open' : ''}`}
                onClick={togglePanel}
                aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
                type="button"
            >
                <ChevronRight size={48} strokeWidth={2.5} />
            </button>

            {/* Panel */}
            <aside className={`view-panel ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="view-panel-header">
                    <h2>Views</h2>
                    <button
                        className="view-panel-close"
                        onClick={() => setViewPanelOpen(false)}
                        aria-label="Close panel"
                        type="button"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                {/* Content */}
                <div className="view-panel-content">
                    <ul className="view-list">
                        {Object.entries(groupedItems)
                            .sort(([sectionA], [sectionB]) => {
                                // Updated sort order with Terminals
                                const order = ['General', 'TRM', 'TRS', 'TRL-1', 'TRL', 'CFS Areas'];
                                const indexA = order.indexOf(sectionA);
                                const indexB = order.indexOf(sectionB);
                                // If both found, sort by index
                                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                // If only A found, A comes first
                                if (indexA !== -1) return -1;
                                // If only B found, B comes first
                                if (indexB !== -1) return 1;
                                // Otherwise alphabetical
                                return sectionA.localeCompare(sectionB);
                            })
                            .map(([section, items]) => (
                                <React.Fragment key={section}>
                                    <li className="view-section-title">{section}</li>
                                    {items.map((item) => (
                                        <li key={item.id}>
                                            <ViewCard
                                                title={item.title}
                                                description={item.description}
                                                icon={item.icon}
                                                onClick={() => handleViewClick(item.event, item.eventData)}
                                            />
                                        </li>
                                    ))}
                                </React.Fragment>
                            ))}
                    </ul>
                </div>
            </aside>
        </>
    );
};

export default ViewNavigationPanel;
