import { useRef, useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, ChevronDown, ChevronLeft, RefreshCw, MapPin, Box, Search, ArrowRight, Check, FileText, Loader2, Info, Trash2 } from 'lucide-react';
import NoDataFoundAnimation from '../../ui/animations/NoDataFoundAnimation';
import PanelLayout from '../PanelLayout';
import { useCustomersAndBookingsQuery, useRecommendedContainersQuery, useSwapContainersQuery, useReservationMutation, useDeleteReservationMutation, useSwapReservationMutation } from '../../../api';
import type { SwapCandidate, ContainerType } from '../../../api';
import { useStore } from '../../../store/store';
import { showToast } from '../../ui/Toast';

interface ReserveContainersPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- POSITION FORMATTING HELPER ---
function formatPosition(position: string | { terminal: string; block: string; lot: number; row: number; level: number } | null | undefined): string {
    if (!position) return 'Position N/A';

    // If it's an object (from store entities)
    if (typeof position === 'object' && position.block) {
        const rowLetter = String.fromCharCode(64 + (position.row || 1)); // 1=A, 2=B, etc.
        return `${position.terminal}-${position.block}-${position.lot}-${rowLetter}-${position.level}`;
    }

    return 'Position N/A';
}

// --- BULK SWAP WORKSPACE COMPONENT ---
interface SwapWorkspaceProps {
    toSwap: { id: string, type: string }[];
    bookingRequirements: ContainerType[] | null;
    onConfirm: (mappings: Record<string, SwapCandidate>) => void;
    onCancel: () => void;
    recommendedContainers: { container_type: string, recommended_containers: string[] }[];
    swapSource: 'recommended' | 'reserved';
    onRemoveItem: (id: string) => void;
    isProcessing?: boolean;
}

function SwapWorkspace({ toSwap, bookingRequirements, onConfirm, onCancel, recommendedContainers, swapSource, onRemoveItem, isProcessing = false }: SwapWorkspaceProps) {
    // State to track replacements: { [originalId]: SwapCandidate }
    const [replacements, setReplacements] = useState<Record<string, SwapCandidate>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [swapListSearchTerm, setSwapListSearchTerm] = useState('');
    const entities = useStore(state => state.entities);
    const setHoverId = useStore(state => state.setHoverId);
    const setReserveContainers = useStore(state => (state as any).setReserveContainers);

    // We only allow swapping if all are of the same type (or we handle mixed types carefully). 
    // For simplicity, assumed mixed types are allowed but search might be tricky.
    // Let's assume user likely filters by type or we just use the type of the 'active' slot.

    // Auto-select the first empty slot for search context
    const activeSlotId = useMemo(() => {
        if (!toSwap || toSwap.length === 0) return null;
        return toSwap.find(item => !replacements[item.id])?.id || toSwap[0]?.id; // Fallback to first if all full
    }, [toSwap, replacements]);

    const activeItem = toSwap.find(i => i.id === activeSlotId);

    // Get the container count from bookingRequirements for the active type




    // Get currently recommended container IDs for all types
    const currentRecommendedIds = useMemo(() => {
        return recommendedContainers.flatMap(rc => rc.recommended_containers);
    }, [recommendedContainers]);

    // Update 3D visibility - always show recommended + selected replacements, add search results while searching
    // useEffect(() => {
    //     // Get selected swap container IDs
    //     const selectedSwapIds = Object.values(replacements).map(r => r.container_nbr);

    //     if (candidates.length > 0 && searchTerm.length >= 2) {
    //         // Merge search results with recommended containers and selected swaps
    //         const searchContainerIds = candidates.map(c => c.container_nbr);
    //         const allVisibleIds = [...new Set([...currentRecommendedIds, ...selectedSwapIds, ...searchContainerIds])];
    //         setReserveContainers(allVisibleIds.map(id => ({ container_nbr: id })));
    //     } else {
    //         // Show recommended containers + selected swap containers
    //         const allVisibleIds = [...new Set([...currentRecommendedIds, ...selectedSwapIds])];
    //         setReserveContainers(allVisibleIds.map(id => ({ container_nbr: id })));
    //     }
    // }, [candidates, searchTerm, setReserveContainers, currentRecommendedIds, replacements]);

    // Update swap connection lines in 3D view when replacements change
    const [searchMode, setSearchMode] = useState<'container' | 'position'>('container');
    const [selectedTerminal, setSelectedTerminal] = useState<string>('');
    const [selectedBlock, setSelectedBlock] = useState<string>('');
    const [selectedLot, setSelectedLot] = useState<string>('');
    const [selectedRow, setSelectedRow] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    // Query for swap candidates
    // When in position mode, we fetch ALL candidates for the yard type to populate dropdowns
    const shouldFetchAll = searchMode === 'position';
    const { data: candidates = [], isLoading } = useSwapContainersQuery(
        activeItem?.type || null,
        searchTerm,
        0,
        shouldFetchAll
    );

    // Reset dropdowns when search mode changes
    useEffect(() => {
        if (searchMode === 'container') {
            setSelectedTerminal('');
            setSelectedBlock('');
            setSelectedLot('');
            setSelectedRow('');
            setSelectedLevel('');
        }
    }, [searchMode]);

    // Derived Selection Logic for Position Search
    const availableTerminals = useMemo(() => {
        if (searchMode !== 'position') return [];
        const terminals = new Set(candidates.map(c => c.position?.split('-')[0]).filter(Boolean));
        return Array.from(terminals).sort();
    }, [candidates, searchMode]);

    const availableBlocks = useMemo(() => {
        if (!selectedTerminal) return [];
        const blocks = new Set(candidates
            .filter(c => c.position?.startsWith(`${selectedTerminal}-`))
            .map(c => c.position?.split('-')[1])
            .filter(Boolean));
        return Array.from(blocks).sort();
    }, [candidates, selectedTerminal]);

    const availableLots = useMemo(() => {
        if (!selectedBlock) return [];
        const lots = new Set(candidates
            .filter(c => c.position?.startsWith(`${selectedTerminal}-${selectedBlock}-`))
            .map(c => c.position?.split('-')[2])
            .filter(Boolean));
        return Array.from(lots).sort((a, b) => parseInt(a) - parseInt(b));
    }, [candidates, selectedTerminal, selectedBlock]);

    const availableRows = useMemo(() => {
        if (!selectedLot) return [];
        const rows = new Set(candidates
            .filter(c => c.position?.startsWith(`${selectedTerminal}-${selectedBlock}-${selectedLot}-`))
            .map(c => c.position?.split('-')[3])
            .filter(Boolean));
        return Array.from(rows).sort();
    }, [candidates, selectedTerminal, selectedBlock, selectedLot]);

    const availableLevels = useMemo(() => {
        if (!selectedRow) return [];
        // Find containers at this specific T-B-L-R location
        const containersAtLoc = candidates.filter(c =>
            c.position?.startsWith(`${selectedTerminal}-${selectedBlock}-${selectedLot}-${selectedRow}-`)
        );

        // Show ALL available levels for this position, sorted.
        const distinctLevels = new Set(containersAtLoc.map(c => {
            const parts = c.position.split('-');
            return parseInt(parts[4] || '0');
        }));

        return Array.from(distinctLevels).sort((a, b) => b - a).map(String); // Sort DESC (Top to Bottom)? Or ASC? usually levels are 1..N. Let's do b-a to show highest first? Or a-b?
        // User asked "show available levels lov". Standard is likely Ascending or Descending. 
        // Let's stick to Ascending 1..N for logical order, or Descending if they want to pick top?
        // Let's do Descending (Top down) as that's often how stacks are visualized.
    }, [candidates, selectedTerminal, selectedBlock, selectedLot, selectedRow]);


    // Auto-select Terminal default (first available)
    useEffect(() => {
        if (searchMode === 'position' && !selectedTerminal && availableTerminals.length > 0) {
            setSelectedTerminal(availableTerminals[0]);
        }
    }, [searchMode, selectedTerminal, availableTerminals]);

    // Auto-select Level if only one option (top-most) is available


    const setSwapConnections = useStore(state => state.setSwapConnections);

    useEffect(() => {
        // Only create connections for items currently in the toSwap list
        const validIds = new Set(toSwap.map(item => item.id));
        const connections = Object.entries(replacements)
            .filter(([originalId]) => validIds.has(originalId))
            .map(([originalId, replacement]) => ({
                from: originalId,
                to: replacement.container_nbr
            }));
        setSwapConnections(connections);
    }, [replacements, setSwapConnections, toSwap]);

    // Restore recommended containers and clear connections on unmount
    useEffect(() => {
        return () => {
            // setReserveContainers(currentRecommendedIds.map(id => ({ container_nbr: id })));
            setSwapConnections([]);
        };
    }, [setReserveContainers, currentRecommendedIds, setSwapConnections]);

    const handleSelectCandidate = (candidate: SwapCandidate) => {
        // Assign to the FIRST empty slot matching this type
        const targetSlot = toSwap.find(item => !replacements[item.id] && item.type === candidate.container_type);

        if (targetSlot) {
            setReplacements(prev => ({ ...prev, [targetSlot.id]: candidate }));
            // setSearchTerm(''); // Kept search term to allow multiple selections
        } else {
            // If all slots of this type are full, maybe replace the currently selected one?
            // For now, just ignore or show toast.
        }
    };

    const handleRemoveReplacement = (originalId: string) => {
        const newReps = { ...replacements };
        delete newReps[originalId];
        setReplacements(newReps);
        // Clear any ghost hover highlights
        setHoverId(null);
    };

    const isComplete = toSwap.every(item => !!replacements[item.id]);


    const filteredSwapList = useMemo(() => {
        if (!swapListSearchTerm) return toSwap;
        return toSwap.filter(item => item.id.toLowerCase().includes(swapListSearchTerm.toLowerCase()));
    }, [toSwap, swapListSearchTerm]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f8fafc', overflow: 'hidden', borderRadius: '16px' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', background: '#4B686C', borderBottom: '1px solid #354d50ff', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px', color: 'white', fontWeight: 600 }}>
                            {toSwap[0]?.type} Bulk Swap ({toSwap.length})
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                            Find replacements from yard
                        </p>
                    </div>
                    <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                        {Object.keys(replacements).length} / {toSwap.length} selected
                    </div>
                </div>
                {/* Optional Search for Swap List */}
                {toSwap.length > 10 && (
                    <div style={{ marginTop: '8px', position: 'relative' }}>
                        <Search size={12} style={{ position: 'absolute', top: '7px', left: '8px', color: '#94a3b8' }} />
                        <input
                            value={swapListSearchTerm}
                            onChange={(e) => setSwapListSearchTerm(e.target.value)}
                            placeholder="Filter original containers..."
                            style={{
                                width: '100%',
                                padding: '6px 8px 6px 26px',
                                borderRadius: '4px',
                                border: 'none',
                                background: 'rgba(255,255,255,0.15)',
                                color: 'white',
                                fontSize: '12px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Compact Slots List (Max 35% height) */}
            <div style={{
                flex: '0 0 auto',
                maxHeight: '35%',
                overflowY: 'auto',
                background: 'white',
                borderBottom: '1px solid #e2e8f0'
            }}>
                {filteredSwapList.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                        No containers found matching "{swapListSearchTerm}"
                    </div>
                ) : filteredSwapList.map((item, index) => {
                    const assigned = replacements[item.id];
                    const originalPos = entities[item.id];
                    const assignedPos = assigned ? entities[assigned.container_nbr] : null;
                    const isActive = activeSlotId === item.id;
                    const isCompleted = !!assigned;

                    return (
                        <div
                            key={item.id}
                            id={`swap-row-${item.id}`}
                            onClick={() => {
                                // If clicked, maybe set this as active focus?
                                // For now, the logic auto-selects first empty, but we could add manual override later.
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                background: isActive ? '#f0f9ff' : 'white',
                                borderLeft: isActive ? '3px solid #80a4a9ff' : '3px solid transparent',
                                opacity: !isActive && !isCompleted ? 0.7 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            {/* ROW INDEX */}
                            <div style={{ width: '24px', fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                                {index + 1}
                            </div>

                            {/* ORIGINAL (Source) */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#be123c' }}>
                                        {item.id}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                        <MapPin size={9} />
                                        <span style={{ fontSize: '10px' }}>{formatPosition(originalPos)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ARROW */}
                            <div style={{ padding: '0 12px', color: isCompleted ? '#22c55e' : '#cbd5e1' }}>
                                <ArrowRight size={14} strokeWidth={isCompleted ? 2.5 : 2} />
                            </div>

                            {/* REPLACEMENT (Target) */}
                            <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, position: 'relative' }}>
                                {assigned ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                                                {assigned.container_nbr}
                                            </span>
                                            <span style={{ fontSize: '10px', color: '#166534' }}>{formatPosition(assignedPos)}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveReplacement(item.id);
                                            }}
                                            style={{ border: 'none', background: 'transparent', padding: '4px', cursor: 'pointer', color: '#15803d', display: 'flex' }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', height: '28px', border: isActive ? '1px dashed #0ea5e9' : '1px dashed #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                                        <span style={{ fontSize: '11px', color: isActive ? '#0284c7' : '#94a3b8', fontStyle: 'italic' }}>
                                            {isActive ? 'Select replacement below...' : 'Waiting...'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* REMOVE ROW */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveItem(item.id);
                                }}
                                style={{ marginLeft: '8px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                title="Remove from list"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Search & Results (Takes remaining space) */}
            <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: '#f8fafc' }}>
                <div style={{ position: 'relative', marginBottom: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Input Area (Container Search or Cascading Dropdowns) */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        height: '36px',
                        overflow: 'hidden'
                    }}>
                        {searchMode === 'container' ? (
                            <>
                                <Search size={14} style={{ marginLeft: '12px', color: '#64748b' }} />
                                <input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder={`Search by Container Number`}
                                    style={{
                                        width: '100%', padding: '0 12px',
                                        border: 'none',
                                        background: 'transparent',
                                        fontSize: '13px',
                                        outline: 'none',
                                        color: '#334155',
                                        height: '100%'
                                    }}
                                    autoFocus
                                />
                            </>
                        ) : (
                            // Position Search Dropdowns
                            <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                                {/* Terminal */}
                                <div style={{ flex: 1.2, position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                                    <select
                                        value={selectedTerminal}
                                        onChange={e => {
                                            setSelectedTerminal(e.target.value);
                                            setSelectedBlock(''); setSelectedLot(''); setSelectedRow(''); setSelectedLevel('');
                                        }}
                                        style={{ width: '100%', height: '100%', border: 'none', outline: 'none', padding: '0 8px', fontSize: '12px', cursor: 'pointer', appearance: 'none', background: 'transparent', fontWeight: 600, color: '#334155', textAlign: 'center' }}
                                    >
                                        <option value="" disabled hidden>TRM</option>
                                        {availableTerminals.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <ChevronDown size={10} style={{ position: 'absolute', right: 4, top: 12, pointerEvents: 'none', color: '#94a3b8' }} />
                                </div>
                                {/* Block */}
                                <div style={{ flex: 1, position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                                    <select
                                        value={selectedBlock}
                                        onChange={e => {
                                            setSelectedBlock(e.target.value);
                                            setSelectedLot(''); setSelectedRow(''); setSelectedLevel('');
                                        }}
                                        disabled={!selectedTerminal}
                                        style={{ width: '100%', height: '100%', border: 'none', outline: 'none', padding: '0 8px', fontSize: '12px', cursor: 'pointer', appearance: 'none', background: 'transparent', fontWeight: 600, color: '#334155', textAlign: 'center' }}
                                    >
                                        <option value="" disabled hidden>BK</option>
                                        {availableBlocks.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                    <ChevronDown size={10} style={{ position: 'absolute', right: 4, top: 12, pointerEvents: 'none', color: '#94a3b8' }} />
                                </div>
                                {/* Lot */}
                                <div style={{ flex: 1, position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                                    <select
                                        value={selectedLot}
                                        onChange={e => {
                                            setSelectedLot(e.target.value);
                                            setSelectedRow(''); setSelectedLevel('');
                                        }}
                                        disabled={!selectedBlock}
                                        style={{ width: '100%', height: '100%', border: 'none', outline: 'none', padding: '0 8px', fontSize: '12px', cursor: 'pointer', appearance: 'none', background: 'transparent', fontWeight: 600, color: '#334155', textAlign: 'center' }}
                                    >
                                        <option value="" disabled hidden>LT</option>
                                        {availableLots.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <ChevronDown size={10} style={{ position: 'absolute', right: 4, top: 12, pointerEvents: 'none', color: '#94a3b8' }} />
                                </div>
                                {/* Row */}
                                <div style={{ flex: 1, position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                                    <select
                                        value={selectedRow}
                                        onChange={e => {
                                            setSelectedRow(e.target.value);
                                            setSelectedLevel('');
                                        }}
                                        disabled={!selectedLot}
                                        style={{ width: '100%', height: '100%', border: 'none', outline: 'none', padding: '0 8px', fontSize: '12px', cursor: 'pointer', appearance: 'none', background: 'transparent', fontWeight: 600, color: '#334155', textAlign: 'center' }}
                                    >
                                        <option value="" disabled hidden>RW</option>
                                        {availableRows.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <ChevronDown size={10} style={{ position: 'absolute', right: 4, top: 12, pointerEvents: 'none', color: '#94a3b8' }} />
                                </div>
                                {/* Level */}
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <select
                                        value={selectedLevel}
                                        onChange={e => setSelectedLevel(e.target.value)}
                                        disabled={!selectedRow}
                                        style={{ width: '100%', height: '100%', border: 'none', outline: 'none', padding: '0 8px', fontSize: '12px', cursor: 'pointer', appearance: 'none', background: 'transparent', fontWeight: 600, color: '#334155', textAlign: 'center' }}
                                    >
                                        <option value="" disabled hidden>LV</option>
                                        {availableLevels.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <ChevronDown size={10} style={{ position: 'absolute', right: 4, top: 12, pointerEvents: 'none', color: '#94a3b8' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mode Toggle Button */}
                    <div
                        onClick={() => setSearchMode(prev => prev === 'container' ? 'position' : 'container')}
                        style={{
                            height: '36px',
                            padding: '0 16px',
                            background: '#9ec4ca', // Matching image roughly
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            color: '#1e293b',
                            fontSize: '13px',
                            fontWeight: 600,
                            userSelect: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        <span>{searchMode === 'container' ? 'Container' : 'Position'}</span>
                        <ChevronDown size={14} />
                    </div>
                </div>

                {/* Results List */}
                {(() => {
                    if (searchMode === 'container' && searchTerm.length < 2) {
                        return (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <Search size={24} style={{ opacity: 0.3, marginBottom: '8px', margin: '0 auto', display: 'block' }} />
                                    <span>Type {2 - searchTerm.length} more chars to search</span>
                                </div>
                            </div>
                        );
                    }

                    // Existing Filtering Logic ...
                    // Filter out containers already selected as replacements in the current bulk session
                    const alreadySelectedInReplacements = new Set(Object.values(replacements).map(r => r.container_nbr));

                    // Identify all containers currently "taken" (already reserved for this booking)
                    const allReservedIds = new Set<string>();
                    bookingRequirements?.forEach(req => {
                        req.reserved_containers?.forEach(id => allReservedIds.add(id));
                    });

                    // Flatten recommended containers and group by type
                    const currentRecommendedIds = recommendedContainers.flatMap(rc => rc.recommended_containers);

                    // Identify the specific target types for this swap
                    const targetType = activeItem?.type;

                    // 1. Find matching Recommended containers (Local)
                    // Rule: Only show these if we are swapping a RESERVED container.
                    const matchingRecommended = swapSource === 'reserved'
                        ? currentRecommendedIds.filter(id => {
                            const ent = entities[id];
                            const isSameType = !targetType || (ent?.type === targetType);
                            // Filter by search term OR position dropdowns
                            let matchesSearch = true;
                            if (searchMode === 'container') {
                                matchesSearch = id.toLowerCase().includes(searchTerm.toLowerCase());
                            } else {
                                // Position Mode Filtering for Recommended
                                // formatPosition returns "TRM-BLK-..." or "Yard"
                                // If position is not valid, it likely fails matches. 
                                // Actually better to use ent values directly if available, referencing the store entities.
                                if (ent) {
                                    if (selectedTerminal && ent.terminal !== selectedTerminal) matchesSearch = false;
                                    if (selectedBlock && ent.block !== selectedBlock) matchesSearch = false;
                                    if (selectedLot && String(ent.lot) !== selectedLot) matchesSearch = false;
                                    // Row in store is 0-based, dropdown is 1-based string? 
                                    // Wait, in previous code: `ent.row + 1` was used in API response.
                                    // formatPosition uses `pos.row + 1`. dropdowns use 1-based.
                                    // So we must compare `ent.row + 1`.
                                    if (selectedRow && String(ent.row + 1) !== selectedRow) matchesSearch = false;
                                    if (selectedLevel && String(ent.level) !== selectedLevel) matchesSearch = false;
                                } else {
                                    // If no entity data, we can't match position, so hide it? 
                                    // Or show it? Probably hide if filtering is active.
                                    if (selectedTerminal) matchesSearch = false;
                                }
                            }

                            return matchesSearch &&
                                isSameType &&
                                !alreadySelectedInReplacements.has(id);
                        })
                        : [];

                    // 2. Filter API Candidates
                    // Rule: Exclude anything already reserved, already recommended, or already selected as replacement.
                    const forbiddenIds = new Set([
                        ...allReservedIds,
                        ...currentRecommendedIds,
                        ...alreadySelectedInReplacements
                    ]);

                    let filteredCandidates = candidates.filter(c => !forbiddenIds.has(c.container_nbr));

                    // Apply Search Mode Logic
                    if (searchMode === 'container') {
                        // Already filtered by API 'query' param, but double check forbidden
                        filteredCandidates = filteredCandidates;
                    } else {
                        // Position Mode Filtering
                        // We have ALL candidates, so we must filter by dropdown selections
                        if (selectedTerminal) {
                            filteredCandidates = filteredCandidates.filter(c => c.position?.split('-')[0] === selectedTerminal);
                        }
                        if (selectedBlock) {
                            filteredCandidates = filteredCandidates.filter(c => c.position?.split('-')[1] === selectedBlock);
                        }
                        if (selectedLot) {
                            filteredCandidates = filteredCandidates.filter(c => c.position?.split('-')[2] === selectedLot);
                        }
                        if (selectedRow) {
                            filteredCandidates = filteredCandidates.filter(c => c.position?.split('-')[3] === selectedRow);
                        }
                        if (selectedLevel) {
                            filteredCandidates = filteredCandidates.filter(c => c.position?.split('-')[4] === selectedLevel);
                        }
                    }
                    const hasResults = matchingRecommended.length > 0 || filteredCandidates.length > 0;

                    if (isLoading) {
                        return (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <Loader2 className="animate-spin" size={20} />
                            </div>
                        );
                    }

                    if (!hasResults) {
                        return (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                                No Containers Found
                            </div>
                        );
                    }

                    return (
                        <div style={{ flex: 1, minHeight: 0, maxHeight: 'calc(100% - 8px)', overflowY: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '8px' }}>
                            {/* Recommended Matches - Integrated with Blue Styling */}
                            {matchingRecommended.length > 0 && (
                                <>
                                    {matchingRecommended.map(id => (
                                        <div
                                            key={id}
                                            onClick={() => handleSelectCandidate({
                                                container_nbr: id,
                                                container_type: (entities[id] as any)?.type || activeItem?.type || 'Unknown',
                                                position: entities[id] ? formatPosition(entities[id]) : 'Yard'
                                            })}
                                            style={{
                                                padding: '10px 12px',
                                                borderBottom: '1px solid #e2e8f0',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: '#eff6ff', // Light blue background for recommended
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; setHoverId(id, 'panel'); }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; setHoverId(null); }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {/* Blue Box icon for recommended */}
                                                <Box size={14} color="#3b82f6" />
                                                <span style={{ fontWeight: 600, color: '#1e40af' }}>{id}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#60a5fa' }}>{formatPosition(entities[id])}</span>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* API Matches */}
                            {filteredCandidates.length > 0 && (
                                <>
                                    {filteredCandidates.map(cand => (
                                        <div
                                            key={cand.container_nbr}
                                            onClick={() => handleSelectCandidate(cand)}
                                            style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#334155', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; setHoverId(cand.container_nbr, 'panel'); }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; setHoverId(null); }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Box size={14} color="#475569" />
                                                <span style={{ fontWeight: 600, color: '#334155' }}>{cand.container_nbr}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>{cand.position}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    );

                })()}
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '12px 16px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                    onClick={onCancel}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: 'white',
                        color: '#475569',
                        cursor: 'pointer', fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    Cancel
                </button>
                <button
                    disabled={!isComplete || isProcessing}
                    onClick={() => onConfirm(replacements)}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                        background: isComplete && !isProcessing ? '#4B686C' : '#e2e8f0',
                        color: isComplete && !isProcessing ? 'white' : '#94a3b8',
                        cursor: isComplete && !isProcessing ? 'pointer' : 'not-allowed',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={14} className="spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <RefreshCw size={14} />
                            Confirm Swap
                        </>
                    )}
                </button>
            </div>
        </div >
    );
}

// --- MAIN PANEL COMPONENT ---

export default function ReserveContainersPanel({ isOpen, onClose }: ReserveContainersPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const setHoverId = useStore(state => state.setHoverId);
    const entities = useStore(state => state.entities);

    // -- Selection State --
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
    const [bookingRequirements, setBookingRequirements] = useState<ContainerType[] | null>(null);

    // -- View State --
    const [activeTab, setActiveTab] = useState<string>('All');
    const [subTab, setSubTab] = useState<'reserved' | 'recommended' | 'bin'>('recommended');

    // -- Swap State --
    const [swappedMap, setSwappedMap] = useState<Record<string, { id: string, type: string, originalId: string }>>({});

    // -- Discard/Bin State --
    const [discardedByType, setDiscardedByType] = useState<Record<string, Set<string>>>({});

    // -- Multi-Select State --
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedReservedIds, setSelectedReservedIds] = useState<Set<string>>(new Set());
    const [isBulkSwapMode, setIsBulkSwapMode] = useState(false);
    const [swapSource, setSwapSource] = useState<'recommended' | 'reserved'>('recommended');




    // -- Search State within Tabs --
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [containerSearchTerm, setContainerSearchTerm] = useState('');
    const [isOverflowDropdownOpen, setIsOverflowDropdownOpen] = useState(false);
    const MAX_VISIBLE_TABS = 3;
    const overflowDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (overflowDropdownRef.current && !overflowDropdownRef.current.contains(event.target as Node)) {
                setIsOverflowDropdownOpen(false);
            }
        };
        if (isOverflowDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOverflowDropdownOpen]);

    // Cleanup: Reset temporary states when panel closes to prevent blocking overlays
    useEffect(() => {
        if (!isOpen) {
            setIsBulkSwapMode(false);
            setSwapSource('recommended');
            setIsSearchExpanded(false);
            setContainerSearchTerm('');
            setIsOverflowDropdownOpen(false);
            setContainerSearchTerm('');
            setIsOverflowDropdownOpen(false);
            setSelectedIds(new Set());
            setSelectedReservedIds(new Set());
        }
    }, [isOpen]);

    // -- Data Fetching --
    const queryClient = useQueryClient();
    const { data: customers = [], isLoading: isLoadingCustomers, isRefetching: isRefetchingCustomers } = useCustomersAndBookingsQuery(isOpen);

    // -- Sync bookingRequirements with updated customers data --
    useEffect(() => {
        if (selectedBookingId && customers.length > 0) {
            // Find the selected booking in the fresh data
            for (const cust of customers) {
                const booking = cust.bookings?.find((b: any) => b.booking_id === selectedBookingId);
                if (booking) {
                    setBookingRequirements(booking.container_types);
                    break;
                }
            }
        }
    }, [customers, selectedBookingId]);

    const isRefreshing = isRefetchingCustomers || isLoadingCustomers;

    // Calculate effective requirements (total needed - already reserved)
    const effectiveRequirements = useMemo(() => {
        if (!bookingRequirements) return null;
        return bookingRequirements.map(req => ({
            container_type: req.container_type,
            container_count: Math.max(0, req.container_count - (req.reserved_containers?.length || 0))
        })).filter(req => req.container_count > 0);
    }, [bookingRequirements]);

    const { data: recommendedContainers = [], isLoading: isLoadingRecommendations, isFetching: isFetchingRecommendations } = useRecommendedContainersQuery(selectedBookingId, effectiveRequirements);

    // -- Reservation Mutation --
    const reservationMutation = useReservationMutation();
    const deleteReservationMutation = useDeleteReservationMutation();
    const swapReservationMutation = useSwapReservationMutation();

    // -- Handle Delete Reservation --
    const handleDeleteReservations = async () => {
        if (!selectedBookingId || selectedReservedIds.size === 0) return;

        const containersToDelete = Array.from(selectedReservedIds);

        try {
            const result = await deleteReservationMutation.mutateAsync({
                booking_id: selectedBookingId,
                unreserve_containers: containersToDelete
            });

            if (result.response_code === 200) {
                showToast('success', result.response_message || `Successfully unreserved ${result.success_count} containers`);
                // Update 3D view colors immediately
                const updateEntityStatus = useStore.getState().updateEntityStatus;
                updateEntityStatus(containersToDelete.map(id => ({ id, status: '' })));
                // Clear selections and refresh
                setSelectedReservedIds(new Set());
                queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
                queryClient.invalidateQueries({ queryKey: ['containers'] }); // Refresh 3D view colors
            } else if (result.response_code === 207) {
                showToast('warning', result.response_message || `Partial success: ${result.success_count} unreserved, ${result.fail_count} failed`);
                // Update 3D view colors for potentially succeeded items
                const updateEntityStatus = useStore.getState().updateEntityStatus;
                updateEntityStatus(containersToDelete.map(id => ({ id, status: '' })));
                setSelectedReservedIds(new Set()); // Consider keeping if you want retry, but usually refresh is safer
                queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
                queryClient.invalidateQueries({ queryKey: ['containers'] }); // Refresh 3D view colors
            } else {
                showToast('error', result.response_message || 'Failed to unreserve containers');
            }
        } catch (error: any) {
            showToast('error', error?.message || 'An unexpected error occurred');
        }
    };

    // -- Handle Confirm Reservation --
    const handleConfirmReservation = async () => {
        if (!selectedBookingId || processedManifest.allContainers.length === 0) return;

        // Collect all container IDs (including swapped ones)
        const containerIds = processedManifest.allContainers.map(c => c.id);

        // Filter out containers that are already reserved
        const alreadyReservedIds = new Set<string>();
        if (bookingRequirements) {
            bookingRequirements.forEach(req => {
                req.reserved_containers?.forEach(id => alreadyReservedIds.add(id));
            });
        }

        // Filter out discarded containers (from all types)
        const allDiscardedIds = new Set<string>();
        Object.values(discardedByType).forEach(discardedSet => {
            discardedSet.forEach(id => allDiscardedIds.add(id));
        });

        const newContainersToReserve = containerIds.filter(id =>
            !alreadyReservedIds.has(id) && !allDiscardedIds.has(id)
        );

        if (newContainersToReserve.length === 0) {
            showToast('error', 'No new containers selected for reservation');
            return;
        }

        try {
            const result = await reservationMutation.mutateAsync({
                booking_id: selectedBookingId,
                reserve_containers: newContainersToReserve
            });

            if (result.response_code === 200) {
                showToast('success', result.response_message || `Successfully reserved ${result.success_count} containers`);
                // Update 3D view colors immediately
                const updateEntityStatus = useStore.getState().updateEntityStatus;
                updateEntityStatus(newContainersToReserve.map(id => ({ id, status: 'R' })));
                // Return to bookings view and refresh data
                handleClearSelection();
                queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
                queryClient.invalidateQueries({ queryKey: ['containers'] }); // Refresh 3D view colors
            } else if (result.response_code === 207) {
                // Partial success - stay on current view to allow retry
                showToast('warning', result.response_message || `Partial success: ${result.success_count} reserved, ${result.fail_count} failed`);
            } else {
                showToast('error', result.response_message || 'Failed to reserve containers');
            }
        } catch (error: any) {
            showToast('error', error?.message || 'An unexpected error occurred');
        }
    };

    // -- Derived State from Recommendations & Swaps --
    const processedManifest = useMemo(() => {
        if (!recommendedContainers) return { tabs: [], allContainers: [] };

        const allContainers: { id: string, type: string, originalId?: string, isSwapped?: boolean }[] = [];
        const tabs: { type: string, count: number, total: number }[] = [];

        // 0. Add Reserved Containers to allContainers
        if (bookingRequirements) {
            bookingRequirements.forEach(req => {
                if (req.reserved_containers) {
                    req.reserved_containers.forEach(id => {
                        allContainers.push({ id, type: req.container_type });
                    });
                }
            });
        }

        // 1. Map recommendations to allContainers (for the grid/3D)
        if (recommendedContainers) {
            recommendedContainers.forEach(group => {
                const groupContainers = group.recommended_containers.map(id => {
                    if (swappedMap[id]) {
                        return { ...swappedMap[id], isSwapped: true };
                    }
                    return { id, type: group.container_type };
                });
                allContainers.push(...groupContainers);
            });
        }

        // 2. Build tabs based on Requirements (Source of Truth)
        if (bookingRequirements) {
            bookingRequirements.forEach(req => {
                const type = req.container_type;
                const reservedCount = req.reserved_containers?.length || 0;
                const target = req.container_count;

                // Find recommendations for this type
                const recGroup = recommendedContainers?.find(g => g.container_type === type);
                const recCount = recGroup?.recommended_containers.length || 0;

                // Count is Reserved + Recommended
                // Note: Swapped containers still count as 1 recommended slot
                const currentCount = reservedCount + recCount;

                tabs.push({
                    type,
                    count: currentCount,
                    total: target
                });
            });
        }

        // 'All' tab removed as requested

        return { tabs, allContainers };
    }, [recommendedContainers, bookingRequirements, swappedMap]);



    // -- Effects --
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            if (isVisible) {
                window.dispatchEvent(new CustomEvent('resetCameraToInitial'));
            }
            const timer = setTimeout(() => setIsVisible(false), 400);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isVisible]);

    // -- Sync to Store for 3D Visualization --
    // -- Sync to Store for 3D Visualization --
    // useEffect(() => {
    //     if (processedManifest?.allContainers) {
    //         const mappedForStore = processedManifest.allContainers.map(c => ({ container_nbr: c.id }));
    //         // @ts-ignore
    //         if (setReserveContainers) setReserveContainers(mappedForStore);
    //     } else {
    //         // @ts-ignore
    //         if (setReserveContainers) setReserveContainers([]);
    //     }

    //     // Cleanup on unmount/close
    //     return () => {
    //         // @ts-ignore
    //         if (setReserveContainers) setReserveContainers([]);
    //     }
    // }, [processedManifest, setReserveContainers]);

    // -- Handlers --
    const handleCustomerToggle = (custName: string) => {
        setExpandedCustomer(current => current === custName ? null : custName);
    };

    const handleBookingSelect = (bookingId: string, requirements: ContainerType[], customerName: string) => {
        setSelectedBookingId(bookingId);
        setSelectedCustomerName(customerName);
        setBookingRequirements(requirements);
        // Default to the first container type
        if (requirements && requirements.length > 0) {
            setActiveTab(requirements[0].container_type);
        }
        setSwappedMap({});
        setSelectedIds(new Set());
    };

    const handleTabChange = (type: string) => {
        setActiveTab(type);
        setActiveTab(type);
        setSelectedIds(new Set()); // Clear selection when changing tabs
        setSelectedReservedIds(new Set());
    };

    const handleClearSelection = () => {
        setSelectedBookingId(null);
        setSelectedCustomerName(null);
        setBookingRequirements(null);
        setSwappedMap({});
        setSwappedMap({});
        setSelectedIds(new Set());
        setSelectedReservedIds(new Set());
        setIsBulkSwapMode(false);
    };

    const handleClose = () => {
        handleClearSelection();
        setExpandedCustomer(null);
        onClose();
    };

    const toggleSelection = (id: string) => {
        // Enforce mutual exclusivity
        if (selectedReservedIds.size > 0) {
            showToast('error', 'Cannot select recommended containers while reserving containers are selected');
            return;
        }

        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleReservedSelection = (id: string) => {
        // Enforce mutual exclusivity
        if (selectedIds.size > 0) {
            showToast('error', 'Cannot select reserved containers while recommended containers are selected');
            return;
        }

        const newSet = new Set(selectedReservedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedReservedIds(newSet);
    };

    const handleBulkConfirm = async (mappings: Record<string, SwapCandidate>) => {
        if (swapSource === 'recommended') {
            setSwappedMap(prev => {
                const next = { ...prev };
                Object.entries(mappings).forEach(([origId, cand]) => {
                    next[origId] = {
                        id: cand.container_nbr,
                        type: cand.container_type,
                        originalId: origId
                    };
                });
                return next;
            });
            setIsBulkSwapMode(false);
            setSelectedIds(new Set());
        } else {
            // --- Reserved Swap Flow (API Trigger) ---
            if (!selectedBookingId) return;

            const unreserveList: string[] = [];
            const reserveList: string[] = [];

            Object.entries(mappings).forEach(([origId, cand]) => {
                unreserveList.push(origId);
                reserveList.push(cand.container_nbr);
            });

            if (unreserveList.length === 0) return;

            try {
                const result = await swapReservationMutation.mutateAsync({
                    booking_id: selectedBookingId,
                    unreserve_containers: unreserveList,
                    reserve_containers: reserveList
                });

                if (result.response_code === 200) {
                    showToast('success', result.response_message || `Successfully swapped ${result.success_count} containers`);
                    // Clear state and refresh
                    setIsBulkSwapMode(false);
                    setSelectedReservedIds(new Set());
                    // Invalidate all relevant queries to refresh UI and 3D view
                    queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
                    queryClient.invalidateQueries({ queryKey: ['recommendedContainers'] });
                    queryClient.invalidateQueries({ queryKey: ['containers'] });
                    // Update 3D view colors immediately
                    const updateEntityStatus = useStore.getState().updateEntityStatus;
                    const statusUpdates = [
                        ...unreserveList.map(id => ({ id, status: '' })),  // Mark unreserved as available
                        ...reserveList.map(id => ({ id, status: 'R' }))    // Mark new reservations as Reserved
                    ];
                    updateEntityStatus(statusUpdates);
                } else if (result.response_code === 207) {
                    showToast('warning', result.response_message || `Partial swap: ${result.success_count} swapped, ${result.fail_count} failed`);
                    // Might want to close or keep open depending on UX. Closing for now.
                    setIsBulkSwapMode(false);
                    setSelectedReservedIds(new Set());
                    // Invalidate all relevant queries to refresh UI and 3D view
                    queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
                    queryClient.invalidateQueries({ queryKey: ['recommendedContainers'] });
                    queryClient.invalidateQueries({ queryKey: ['containers'] });
                    // Update 3D view colors immediately (partial success - still update what succeeded)
                    const updateEntityStatus = useStore.getState().updateEntityStatus;
                    const statusUpdates = [
                        ...unreserveList.map(id => ({ id, status: '' })),
                        ...reserveList.map(id => ({ id, status: 'R' }))
                    ];
                    updateEntityStatus(statusUpdates);
                } else {
                    showToast('error', result.response_message || 'Failed to swap containers');
                }
            } catch (error: any) {
                showToast('error', error?.message || 'An unexpected error occurred during swap');
            }
        }
    };

    const getAvatarLetter = (name: string) => name.charAt(0).toUpperCase();

    // -- Bulk Selection Handlers --
    const handleSelectAll = (isReserved: boolean) => {
        if (isReserved) {
            setSelectedReservedIds(new Set(reservedContainersForTab));
        } else {
            const allIds = validContainers.map(c => c.id);
            setSelectedIds(new Set(allIds));
        }
    };

    const handleClearAll = (isReserved: boolean) => {
        if (isReserved) {
            setSelectedReservedIds(new Set());
        } else {
            setSelectedIds(new Set());
        }
    };

    // -- Keyboard Shortcuts --
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Select All: Ctrl + A or Cmd + A
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                handleSelectAll(subTab === 'reserved');
            }
            // Clear Selection: Escape
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClearAll(subTab === 'reserved');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [subTab, handleSelectAll, handleClearAll]);

    // -- Filters --
    const validContainers = useMemo(() => {
        let filtered = processedManifest.allContainers.filter(c => c.type === activeTab);

        // Filter out already reserved containers to prevent duplication
        if (bookingRequirements) {
            const req = bookingRequirements.find(r => r.container_type === activeTab);
            const reservedSet = new Set(req?.reserved_containers || []);
            filtered = filtered.filter(c => !reservedSet.has(c.id));
        }

        // Filter out discarded containers
        const discardedSet = discardedByType[activeTab];
        if (discardedSet) {
            filtered = filtered.filter(c => !discardedSet.has(c.id));
        }

        if (containerSearchTerm) {
            const lower = containerSearchTerm.toLowerCase();
            filtered = filtered.filter(c => c.id.toLowerCase().includes(lower));
        }
        return filtered;
    }, [processedManifest, activeTab, containerSearchTerm, bookingRequirements, discardedByType]);

    // -- Discard Handler --
    const handleDiscard = () => {
        if (selectedIds.size === 0) return;

        // Add selected IDs to discarded set for current type
        setDiscardedByType(prev => {
            const currentDiscarded = new Set(prev[activeTab] || []);
            selectedIds.forEach(id => currentDiscarded.add(id));
            return {
                ...prev,
                [activeTab]: currentDiscarded
            };
        });

        // Clear selection
        setSelectedIds(new Set());
        showToast('success', `${selectedIds.size} containers moved to bin`);
    };

    // -- Restore Handlers --
    const handleRestore = () => {
        if (selectedIds.size === 0) return;

        setDiscardedByType(prev => {
            const current = new Set(prev[activeTab] || []);
            selectedIds.forEach(id => current.delete(id));
            if (current.size === 0) {
                const { [activeTab]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [activeTab]: current };
        });

        const count = selectedIds.size;
        setSelectedIds(new Set());
        showToast('success', `${count} containers restored`);
    };

    const handleRestoreAll = () => {
        const discardedCount = discardedByType[activeTab]?.size || 0;
        if (discardedCount === 0) return;

        setDiscardedByType(prev => {
            const { [activeTab]: _, ...rest } = prev;
            return rest;
        });

        // Also clear any selection that might be lingering
        setSelectedIds(new Set());
        showToast('success', `All ${discardedCount} containers restored`);
    };

    const reservedContainersForTab = useMemo(() => {
        if (!bookingRequirements || !activeTab) return [];
        const req = bookingRequirements.find(r => r.container_type === activeTab);
        let list = req?.reserved_containers || [];

        if (containerSearchTerm) {
            const lower = containerSearchTerm.toLowerCase();
            list = list.filter(id => id.toLowerCase().includes(lower));
        }
        return list;
    }, [bookingRequirements, activeTab, containerSearchTerm]);



    if (!isVisible && !isOpen) return null;

    if (isBulkSwapMode) {
        // Collect full objects for the workspace
        let toSwapObjects: { id: string, type: string }[] = [];

        if (swapSource === 'reserved') {
            toSwapObjects = Array.from(selectedReservedIds).map(id => {
                // Find containing requirement to get type
                const req = bookingRequirements?.find(r => r.reserved_containers?.includes(id));
                return {
                    id,
                    type: req?.container_type || 'Unknown'
                };
            });
        } else {
            toSwapObjects = Array.from(selectedIds).map(id => {
                const found = processedManifest.allContainers.find(c => c.id === id);
                return {
                    id,
                    type: found?.type || activeTab
                };
            });
        }

        return (
            <div
                ref={panelRef}
                className="glass-panel"
                style={{
                    position: 'fixed', top: '90px', right: '24px', width: '400px', maxHeight: 'calc(100vh - 114px)',
                    borderRadius: '24px', zIndex: 1000, overflow: 'hidden',
                    transition: 'all 0.4s', transform: 'translateX(0)', opacity: 1,
                    display: 'flex', flexDirection: 'column'
                }}
            >
                <SwapWorkspace
                    toSwap={toSwapObjects}
                    bookingRequirements={bookingRequirements}
                    recommendedContainers={recommendedContainers}
                    swapSource={swapSource}
                    onConfirm={handleBulkConfirm}
                    onCancel={() => setIsBulkSwapMode(false)}
                    isProcessing={swapReservationMutation.isPending}
                    onRemoveItem={(idToRemove) => {
                        if (swapSource === 'reserved') {
                            const newSet = new Set(selectedReservedIds);
                            newSet.delete(idToRemove);
                            setSelectedReservedIds(newSet);

                            // If empty, close panel
                            if (newSet.size === 0) setIsBulkSwapMode(false);
                        } else {
                            const newSet = new Set(selectedIds);
                            newSet.delete(idToRemove);
                            setSelectedIds(newSet);

                            // If empty, close panel
                            if (newSet.size === 0) setIsBulkSwapMode(false);
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .selection-checkbox {
                    width: 16px; height: 16px; border-radius: 4px; border: 2px solid #cbd5e1;
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s;
                }
                .selection-checkbox.checked {
                    background: #4B686C; border-color: #4B686C;
                }
            `}</style>

            <PanelLayout
                title={selectedBookingId ? selectedBookingId : 'BOOKINGS'}
                category={selectedCustomerName || 'RESERVATION'}

                subtitle={selectedBookingId && !isLoadingRecommendations ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            fontSize: '11px',
                            background: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            Reserved: {bookingRequirements?.reduce((sum, req) => sum + (req.reserved_containers?.length || 0), 0) || 0} / Total: {bookingRequirements?.reduce((sum, req) => sum + req.container_count, 0) || 0}
                        </span>

                        {/* Info Icon with Shortcut Tooltip */}
                        <div
                            title="Keyboard Shortcuts: Ctrl + A to Select All, Esc to Clear"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'help',
                                opacity: 0.8,
                                color: 'white'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                        >
                            <Info size={14} />
                        </div>
                    </div>
                ) : undefined}
                isOpen={isOpen}
                onClose={handleClose}
                allowExpansion={true}
                headerActions={
                    selectedBookingId ? (
                        <button
                            onClick={handleClearSelection}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '50%',
                                width: '36px', height: '36px',
                                minWidth: '36px', minHeight: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                padding: 0
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                            }}
                            title="Back to Bookings"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    ) : undefined
                }
                footerActions={
                    selectedBookingId && processedManifest.allContainers.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                            {/* Confirm Button */}
                            {/* Actions for Recommended Selection */}
                            {selectedReservedIds.size === 0 && (
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>

                                    {/* Bin Tab Restore Actions */}
                                    {subTab === 'bin' && (
                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            <button
                                                onClick={handleRestoreAll}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 12px',
                                                    background: '#fff1f2',
                                                    border: '1px solid #fda4af',
                                                    borderRadius: '12px',
                                                    color: '#be123c',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(190, 18, 60, 0.1)',
                                                    transition: 'all 0.2s',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}
                                            >
                                                <RefreshCw size={14} />
                                                Restore All
                                            </button>

                                            {selectedIds.size > 0 && (
                                                <button
                                                    onClick={handleRestore}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 12px',
                                                        background: '#22c55e',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                                                        transition: 'all 0.2s',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                    }}
                                                >
                                                    <Check size={14} />
                                                    Restore ({selectedIds.size})
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Reserve Button */}
                                    {(() => {
                                        const totalRequired = bookingRequirements?.reduce((sum, req) => sum + req.container_count, 0) || 0;
                                        const totalReserved = bookingRequirements?.reduce((sum, req) => sum + (req.reserved_containers?.length || 0), 0) || 0;
                                        const isFulfilled = totalReserved >= totalRequired && totalRequired > 0;

                                        // Hide Reserve if:
                                        // 1. Fulfilled
                                        // 2. Any item selected (implies Swap/Discard mode)
                                        // 3. Bin tab active (Reserve not applicable)
                                        if (isFulfilled || selectedIds.size > 0 || subTab === 'bin') return null;

                                        return (
                                            <button
                                                onClick={handleConfirmReservation}
                                                disabled={reservationMutation.isPending}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 12px',
                                                    background: reservationMutation.isPending ? 'rgba(247, 207, 155, 0.5)' : 'var(--secondary-gradient)',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    color: 'var(--primary-color)',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    cursor: reservationMutation.isPending ? 'not-allowed' : 'pointer',
                                                    transition: 'all 0.2s',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                                }}
                                            >
                                                {reservationMutation.isPending ? (
                                                    <>
                                                        <Loader2 size={16} className="spin" />
                                                        Processing...
                                                    </>
                                                ) : 'Reserve'}
                                            </button>
                                        );
                                    })()}

                                    {/* Swap / Discard Actions (Only in Recommended Tab) */}
                                    {selectedIds.size > 0 && subTab === 'recommended' && (
                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            <button
                                                onClick={() => {
                                                    setSwapSource('recommended');
                                                    setIsBulkSwapMode(true);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 12px',
                                                    background: '#f59e0b',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                                                    transition: 'all 0.2s',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}
                                            >
                                                <RefreshCw size={14} />
                                                Swap ({selectedIds.size})
                                            </button>

                                            <button
                                                onClick={handleDiscard}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 12px',
                                                    background: '#ffe4e6',
                                                    border: '1px solid #fda4af',
                                                    borderRadius: '12px',
                                                    color: '#be123c',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(190, 18, 60, 0.1)',
                                                    transition: 'all 0.2s',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = '#fecdd3';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = '#ffe4e6';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Discard
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Delete & Swap Reservation Buttons */}
                            {selectedReservedIds.size > 0 && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleDeleteReservations}
                                        disabled={deleteReservationMutation.isPending || swapReservationMutation.isPending}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            background: '#ef4444',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: 'white',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: deleteReservationMutation.isPending ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                                            transition: 'all 0.2s',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        {deleteReservationMutation.isPending ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <Loader2 size={16} className="spin" />
                                                Processing...
                                            </div>
                                        ) : `UnReserve (${selectedReservedIds.size})`}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setSwapSource('reserved');
                                            setIsBulkSwapMode(true);
                                        }}
                                        disabled={deleteReservationMutation.isPending || swapReservationMutation.isPending}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            background: '#f59e0b',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: 'white',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                                            transition: 'all 0.2s',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}
                                    >
                                        {swapReservationMutation.isPending ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <Loader2 size={16} className="spin" />
                                                Swapping...
                                            </div>
                                        ) : (
                                            <>
                                                <RefreshCw size={14} />
                                                Swap ({selectedReservedIds.size})
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                        </div >
                    ) : undefined
                }
            >

                {/* Fixed Tabs Header - Only visible when booking selected */}
                {
                    selectedBookingId && (
                        <div style={{ margin: '-12px -12px -24px -12px', padding: '0 12px', background: 'transparent', zIndex: 9, position: 'relative' }}>
                            {!isSearchExpanded ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {/* Tabs List with Overflow */}
                                    <div style={{ flex: 1, display: 'flex', gap: '8px', paddingBottom: '12px', position: 'relative' }}>
                                        {(() => {
                                            // Reorder tabs: put active tab first, then others
                                            const reorderedTabs = [...processedManifest.tabs].sort((a, b) => {
                                                if (a.type === activeTab) return -1;
                                                if (b.type === activeTab) return 1;
                                                return 0;
                                            });

                                            const visibleTabs = reorderedTabs.slice(0, MAX_VISIBLE_TABS);
                                            const overflowTabs = reorderedTabs.slice(MAX_VISIBLE_TABS);
                                            const hasOverflow = overflowTabs.length > 0;

                                            return (
                                                <>
                                                    {visibleTabs.map(tab => (
                                                        <button
                                                            key={tab.type}
                                                            onClick={() => { handleTabChange(tab.type); setIsOverflowDropdownOpen(false); }}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                border: activeTab === tab.type ? '1px solid #4B686C' : '1px solid rgba(75, 104, 108, 0.2)',
                                                                background: activeTab === tab.type ? '#4B686C' : 'rgba(255,255,255,0.5)',
                                                                color: activeTab === tab.type ? 'white' : '#4B686C',
                                                                fontSize: '12px', fontWeight: 600,
                                                                whiteSpace: 'nowrap', cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {tab.type}
                                                            <span style={{ marginLeft: '6px', opacity: 0.8, fontSize: '10px' }}>
                                                                {tab.count}/{tab.total}
                                                            </span>
                                                        </button>
                                                    ))}

                                                    {/* Overflow Dropdown Button */}
                                                    {hasOverflow && (
                                                        <div ref={overflowDropdownRef} style={{ position: 'relative' }}>
                                                            <button
                                                                onClick={() => setIsOverflowDropdownOpen(!isOverflowDropdownOpen)}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    borderRadius: '20px',
                                                                    border: '1px solid rgba(75, 104, 108, 0.3)',
                                                                    background: isOverflowDropdownOpen ? '#4B686C' : 'rgba(255,255,255,0.7)',
                                                                    color: isOverflowDropdownOpen ? 'white' : '#4B686C',
                                                                    fontSize: '12px', fontWeight: 600,
                                                                    whiteSpace: 'nowrap', cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="13 17 18 12 13 7"></polyline>
                                                                    <polyline points="6 17 11 12 6 7"></polyline>
                                                                </svg>
                                                                <span style={{ fontSize: '11px', fontWeight: 700 }}>+{overflowTabs.length}</span>
                                                            </button>

                                                            {/* Dropdown Menu */}
                                                            {isOverflowDropdownOpen && (
                                                                <div
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: '100%',
                                                                        left: 0,
                                                                        marginTop: '4px',
                                                                        background: 'white',
                                                                        borderRadius: '12px',
                                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                                                        border: '1px solid #e2e8f0',
                                                                        zIndex: 100,
                                                                        minWidth: '140px',
                                                                        overflow: 'hidden',
                                                                        animation: 'fadeIn 0.15s ease-out'
                                                                    }}
                                                                >
                                                                    {overflowTabs.map(tab => (
                                                                        <button
                                                                            key={tab.type}
                                                                            onClick={() => { handleTabChange(tab.type); setIsOverflowDropdownOpen(false); }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '10px 14px',
                                                                                border: 'none',
                                                                                background: 'transparent',
                                                                                color: '#334155',
                                                                                fontSize: '13px', fontWeight: 500,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                                transition: 'background 0.15s'
                                                                            }}
                                                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <span>{tab.type}</span>
                                                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                                                {tab.count}/{tab.total}
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Search Icon (10% approx, fixed width) */}
                                    <button
                                        onClick={() => setIsSearchExpanded(true)}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'white', border: '1px solid #e2e8f0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', flexShrink: 0, marginBottom: '12px',
                                            padding: 0,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div style={{ width: '100%', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease-out' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Search size={14} style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            autoFocus
                                            value={containerSearchTerm}
                                            onChange={(e) => setContainerSearchTerm(e.target.value)}
                                            placeholder={`Search in ${activeTab}...`}
                                            style={{
                                                width: '100%', padding: '8px 8px 8px 32px',
                                                borderRadius: '20px', border: '1px solid #4B686C',
                                                fontSize: '13px', outline: 'none',
                                                background: 'white', color: '#334155',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => { setIsSearchExpanded(false); setContainerSearchTerm(''); }}
                                        style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: '#f1f5f9', border: '1px solid #d8dfe5ff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', flexShrink: 0,
                                            padding: 0
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                }

                {isRefreshing ? (
                    // --- SHIMMER LOADING STATE ---
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px', animation: 'fadeIn 0.2s' }}>
                        {[1, 2].map(i => (
                            <div key={i} style={{ marginBottom: '12px', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <div className="shimmer" style={{ width: '40%', height: '16px', borderRadius: '4px', marginBottom: '12px' }}></div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div className="shimmer" style={{ width: '48px', height: '48px', borderRadius: '10px' }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div className="shimmer" style={{ width: '70%', height: '14px', borderRadius: '4px', marginBottom: '8px' }}></div>
                                        <div className="shimmer" style={{ width: '30%', height: '12px', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !selectedBookingId ? (
                        // ... (Customer List Code remains same, just brief sync) ...
                        <div>
                            {isLoadingCustomers ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading bookings...</div>
                            ) : customers.length === 0 ? (
                                <NoDataFoundAnimation title="No Bookings Found" message="No pending bookings found for any customer." />
                            ) : (
                                customers.map((customer: any) => {
                                    const isExpanded = expandedCustomer === customer.cust_name;
                                    return (
                                        <div key={customer.cust_name} style={{ marginBottom: '12px', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.15)' }}>
                                            <div onClick={() => handleCustomerToggle(customer.cust_name)} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#e3edf8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
                                                    {getAvatarLetter(customer.cust_name)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{customer.cust_name}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{customer.bookings?.length || 0} Bookings</div>
                                                </div>
                                                <ChevronDown size={16} color="#b3bbc4ff" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                            </div>
                                            {isExpanded && (
                                                <div style={{ padding: '0 16px 16px 52px' }}>
                                                    <div style={{ height: 1, background: '#d8dfe5ff', marginBottom: '8px' }} />
                                                    {customer.bookings?.map((booking: any) => {
                                                        const totalRequired = booking.container_types?.reduce((acc: number, curr: any) => acc + curr.container_count, 0) || 0;
                                                        const totalReserved = booking.container_types?.reduce((acc: number, curr: any) => acc + (curr.reserved_containers?.length || 0), 0) || 0;

                                                        // Determine status-based colors
                                                        const isComplete = totalReserved >= totalRequired && totalRequired > 0;
                                                        const isPartial = totalReserved > 0 && totalReserved < totalRequired;

                                                        let statusBg = '#f1f5f9'; // Not started (Slate-100)
                                                        let statusColor = '#64748b'; // Slate-500
                                                        let statusBorder = 'rgba(100, 116, 139, 0.2)';

                                                        if (isComplete) {
                                                            statusBg = '#dcfce7'; // Green-100
                                                            statusColor = '#166534'; // Green-800
                                                            statusBorder = 'rgba(22, 101, 52, 0.2)';
                                                        } else if (isPartial) {
                                                            statusBg = '#fef3c7'; // Amber-100
                                                            statusColor = '#92400e'; // Amber-800
                                                            statusBorder = 'rgba(146, 64, 14, 0.2)';
                                                        }

                                                        return (
                                                            <div
                                                                key={booking.booking_id}
                                                                onClick={() => handleBookingSelect(booking.booking_id, booking.container_types, customer.cust_name)}
                                                                style={{
                                                                    padding: '8px 14px',
                                                                    margin: '6px 0',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid rgba(75, 104, 108, 0.15)', // Subtle theme border
                                                                    background: '#F5F7F7', // Very light theme tint
                                                                    fontSize: '13px',
                                                                    color: '#334155',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '12px',
                                                                    transition: 'all 0.2s ease',
                                                                    position: 'relative',
                                                                    overflow: 'hidden'
                                                                }}
                                                                onMouseEnter={e => {
                                                                    e.currentTarget.style.background = 'white';
                                                                    e.currentTarget.style.borderColor = '#4B686C';
                                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 104, 108, 0.1)';
                                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                                }}
                                                                onMouseLeave={e => {
                                                                    e.currentTarget.style.background = '#F5F7F7';
                                                                    e.currentTarget.style.borderColor = 'rgba(75, 104, 108, 0.15)';
                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <div style={{
                                                                        width: '24px', height: '24px',
                                                                        borderRadius: '8px',
                                                                        background: 'white',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        border: '1px solid rgba(75, 104, 108, 0.1)'
                                                                    }}>
                                                                        <FileText size={12} color="#4B686C" strokeWidth={2} />
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontWeight: 600, color: '#2c3e50', fontSize: '13px' }}>{booking.booking_id}</span>
                                                                    </div>
                                                                </div>

                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    color: statusColor,
                                                                    background: statusBg,
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    border: `1px solid ${statusBorder}`,
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {totalReserved}/{totalRequired} Cntrs
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        // --- MANIFEST VIEW ---
                        <>
                            {/* Grid Content */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                                {/* Sub-Tabs: Reserved | Recommended */}
                                {/* Sub-Tabs: Reserved | Recommended */}
                                <div style={{
                                    display: 'flex',
                                    gap: '6px',
                                    marginBottom: '16px',
                                    background: '#f5f7f7ff',
                                    padding: '4px',
                                    borderRadius: '12px',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                                }}>
                                    {/* Reserved Tab */}
                                    <button
                                        onClick={() => {
                                            setSubTab('reserved');
                                            setSelectedIds(new Set());
                                            setSelectedReservedIds(new Set());
                                        }}
                                        onMouseEnter={(e) => {
                                            if (subTab !== 'reserved') e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (subTab !== 'reserved') e.currentTarget.style.background = 'transparent';
                                        }}
                                        style={{
                                            flex: 1,
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            background: subTab === 'reserved' ? 'white' : 'transparent',
                                            color: subTab === 'reserved' ? '#4B686C' : '#64748b',
                                            boxShadow: subTab === 'reserved' ? '0 1px 3px rgba(75, 104, 108, 0.2), 0 1px 2px rgba(75, 104, 108, 0.1)' : 'none',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transform: subTab === 'reserved' ? 'scale(1)' : 'scale(0.98)',
                                            outline: 'none'
                                        }}
                                    >
                                        Reserved
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            background: '#dcfce7', // Green-100
                                            color: '#15803d',     // Green-700
                                            minWidth: '20px',
                                            height: '20px',       // Explicit height
                                            display: 'flex',      // Flexbox for centering
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {reservedContainersForTab.length}
                                        </span>
                                    </button>

                                    {/* Recommended Tab */}
                                    <button
                                        onClick={() => {
                                            setSubTab('recommended');
                                            setSelectedIds(new Set());
                                            setSelectedReservedIds(new Set());
                                        }}
                                        onMouseEnter={(e) => {
                                            if (subTab !== 'recommended') e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (subTab !== 'recommended') e.currentTarget.style.background = 'transparent';
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            background: subTab === 'recommended' ? 'white' : 'transparent',
                                            color: subTab === 'recommended' ? '#4B686C' : '#64748b',
                                            boxShadow: subTab === 'recommended' ? '0 1px 3px rgba(75, 104, 108, 0.2), 0 1px 2px rgba(75, 104, 108, 0.1)' : 'none',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transform: subTab === 'recommended' ? 'scale(1)' : 'scale(0.98)',
                                            outline: 'none'
                                        }}
                                    >
                                        Recommended
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            background: '#e0e7ff', // Indigo-100
                                            color: '#4338ca',     // Indigo-700
                                            minWidth: '20px',
                                            height: '20px',       // Explicit height
                                            display: 'flex',      // Flexbox for centering
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {validContainers.length}
                                        </span>
                                    </button>

                                    {/* Bin Tab */}
                                    <button
                                        onClick={() => {
                                            setSubTab('bin');
                                            setSelectedIds(new Set());
                                            setSelectedReservedIds(new Set());
                                        }}
                                        onMouseEnter={(e) => {
                                            if (subTab !== 'bin') e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (subTab !== 'bin') e.currentTarget.style.background = 'transparent';
                                        }}
                                        style={{
                                            flex: 0.4, // Smaller width for icon-only tab
                                            padding: '8px 8px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            background: subTab === 'bin' ? 'white' : 'transparent',
                                            color: subTab === 'bin' ? '#be123c' : '#94a3b8',
                                            boxShadow: subTab === 'bin' ? '0 1px 3px rgba(190, 18, 60, 0.2), 0 1px 2px rgba(190, 18, 60, 0.1)' : 'none',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transform: subTab === 'bin' ? 'scale(1)' : 'scale(0.98)',
                                            outline: 'none',
                                            position: 'relative'
                                        }}
                                        title="Discarded Containers"
                                    >
                                        <Trash2 size={16} strokeWidth={2} />
                                        {(discardedByType[activeTab]?.size || 0) > 0 && (
                                            <span style={{
                                                position: 'absolute',
                                                top: '-2px',
                                                right: '-2px',
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                padding: '2px 2px',
                                                borderRadius: '10px',
                                                background: '#f43f5e',
                                                color: 'white',
                                                minWidth: '16px',
                                                height: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 4px rgba(244, 63, 94, 0.3)'
                                            }}>
                                                {discardedByType[activeTab]?.size || 0}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* Sub-Tab Content */}
                                <div style={{ flex: 1, overflow: 'auto' }}>
                                    {subTab === 'reserved' ? (
                                        // --- RESERVED TAB CONTENT ---
                                        reservedContainersForTab.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94a3b8', textAlign: 'center' }}>
                                                <Box size={40} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                                <span style={{ fontSize: '14px', fontWeight: 500 }}>No Reserved Containers</span>
                                                <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>Reserve containers from the Recommended tab</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', width: '100%' }}>
                                                {reservedContainersForTab.map((id) => {
                                                    const isSelected = selectedReservedIds.has(id);
                                                    return (
                                                        <div
                                                            key={id}
                                                            onClick={() => toggleReservedSelection(id)}
                                                            style={{
                                                                background: isSelected ? '#bbf7d0' : '#f0fdf4',
                                                                borderRadius: '12px',
                                                                padding: '6px 10px',
                                                                border: isSelected ? '1px solid #22c55e' : '1px solid #86efac',
                                                                position: 'relative',
                                                                overflow: 'hidden',
                                                                cursor: 'pointer',
                                                                boxShadow: isSelected ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : '0 2px 4px rgba(34, 197, 94, 0.05)',
                                                                transition: 'all 0.2s',
                                                                display: 'flex', flexDirection: 'column', gap: '4px'
                                                            }}
                                                            onMouseEnter={() => setHoverId(id, 'panel')}
                                                            onMouseLeave={() => setHoverId(null)}
                                                        >
                                                            {isSelected && (
                                                                <div style={{ position: 'absolute', top: 0, right: 0, background: '#4ade80', width: '16px', height: '16px', borderBottomLeftRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                                                    <Check size={8} color="#064e3b" strokeWidth={3} />
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                                                                <Box size={18} color={isSelected ? "#15803d" : "#16a34a"} strokeWidth={2} />
                                                                <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#064e3b' }}>{id}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', fontSize: '10px', color: '#16a34a' }}>
                                                                <MapPin size={10} />
                                                                <span>{formatPosition(entities[id])}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : subTab === 'bin' ? (
                                        // --- BIN TAB CONTENT ---
                                        !(discardedByType[activeTab]?.size) ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94a3b8', textAlign: 'center' }}>
                                                <Trash2 size={40} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                                <span style={{ fontSize: '14px', fontWeight: 500 }}>Bin is Empty</span>
                                                <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>Discarded containers will appear here</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', width: '100%' }}>
                                                {Array.from(discardedByType[activeTab] || []).map((id) => {
                                                    const isSelected = selectedIds.has(id);
                                                    return (
                                                        <div
                                                            key={id}
                                                            onClick={() => toggleSelection(id)}
                                                            title="Click to Select"
                                                            style={{
                                                                background: isSelected ? '#fed7aa' : '#fff1f2',
                                                                borderRadius: '12px',
                                                                padding: '6px 10px',
                                                                border: isSelected ? '1px solid #f97316' : '1px dashed #fda4af',
                                                                cursor: 'pointer',
                                                                display: 'flex', flexDirection: 'column', gap: '4px',
                                                                opacity: isSelected ? 1 : 0.8,
                                                                transition: 'all 0.2s',
                                                                boxShadow: isSelected ? '0 0 0 2px rgba(249, 115, 22, 0.2)' : 'none'
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.currentTarget.style.opacity = '1';
                                                                e.currentTarget.style.background = isSelected ? '#fdba74' : '#ffe4e6';
                                                                setHoverId(id, 'panel');
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.currentTarget.style.opacity = isSelected ? '1' : '0.8';
                                                                e.currentTarget.style.background = isSelected ? '#fed7aa' : '#fff1f2';
                                                                setHoverId(null);
                                                            }}
                                                        >
                                                            {isSelected && (
                                                                <div style={{ position: 'absolute', top: 0, right: 0, background: '#fb923c', width: '16px', height: '16px', borderBottomLeftRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                                                    <Check size={8} color="#7c2d12" strokeWidth={3} />
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Box size={18} color={isSelected ? "#ea580c" : "#be123c"} strokeWidth={2} />
                                                                <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: isSelected ? '#9a3412' : '#881337', textDecoration: 'line-through' }}>{id}</span>
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: isSelected ? '#9a3412' : '#be123c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <MapPin size={10} />
                                                                <span>{formatPosition(entities[id])}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : (
                                        // --- RECOMMENDED TAB CONTENT ---
                                        isFetchingRecommendations ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: '#94a3b8', gap: '12px' }}>
                                                <RefreshCw className="spin" size={24} />
                                                <span style={{ fontSize: '13px' }}>Generating Recommendations...</span>
                                            </div>
                                        ) : validContainers.length === 0 ? (
                                            (() => {
                                                const req = bookingRequirements?.find(r => r.container_type === activeTab);
                                                const totalRequired = req?.container_count || 0;
                                                const totalReserved = req?.reserved_containers?.length || 0;
                                                const isFulfilled = totalReserved >= totalRequired && totalRequired > 0;

                                                if (isFulfilled) {
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#15803d', textAlign: 'center' }}>
                                                            <div style={{
                                                                width: '48px', height: '48px', borderRadius: '50%',
                                                                background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                marginBottom: '12px'
                                                            }}>
                                                                <Check size={24} color="#15803d" strokeWidth={3} />
                                                            </div>
                                                            <span style={{ fontSize: '15px', fontWeight: 700 }}>Booking Fulfilled</span>
                                                            <span style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px', maxWidth: '200px' }}>
                                                                All required {activeTab} containers have been reserved.
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94a3b8', textAlign: 'center' }}>
                                                        <Box size={40} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>No Containers Available</span>
                                                        <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>No recommendations found for this container type</span>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', width: '100%' }}>
                                                {validContainers.map((container) => {
                                                    const isSelected = selectedIds.has(container.id);
                                                    return (
                                                        <div
                                                            key={container.id}
                                                            onClick={() => toggleSelection(container.id)}
                                                            style={{
                                                                background: isSelected ? '#c7d2fe' : (container.isSwapped ? '#fff7ed' : '#eef2ff'),
                                                                borderRadius: '12px',
                                                                padding: '6px 10px',
                                                                border: isSelected ? '1px solid #6366f1' : (container.isSwapped ? '1px solid #fdba74' : '1px solid #a5b4fc'),
                                                                position: 'relative',
                                                                overflow: 'hidden',
                                                                cursor: 'pointer',
                                                                boxShadow: isSelected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : '0 2px 4px rgba(99, 102, 241, 0.05)',
                                                                transition: 'all 0.2s',
                                                                display: 'flex', flexDirection: 'column', gap: '4px'
                                                            }}
                                                            onMouseEnter={() => setHoverId(container.id, 'panel')}
                                                            onMouseLeave={() => setHoverId(null)}
                                                        >
                                                            {isSelected && (
                                                                <div style={{ position: 'absolute', top: 0, right: 0, background: '#818cf8', width: '16px', height: '16px', borderBottomLeftRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                                                    <Check size={8} color="#1e1b4b" strokeWidth={3} />
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                                                                <Box size={18} color={isSelected ? "#4338ca" : (container.isSwapped ? "#ea580c" : "#4f46e5")} strokeWidth={2} />
                                                                <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: container.isSwapped ? '#7c2d12' : '#312e81' }}>
                                                                    {container.id}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', fontSize: '10px', color: container.isSwapped ? '#9a3412' : '#4f46e5' }}>
                                                                <MapPin size={10} />
                                                                <span>{formatPosition(entities[container.id])}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </>
                    )
                )}
            </PanelLayout >
        </>
    );
}
