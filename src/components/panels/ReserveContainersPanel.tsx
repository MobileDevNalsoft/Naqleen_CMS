import { useRef, useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, ChevronLeft, RefreshCw, MapPin, Box, Search, ArrowRight, Check, FileText } from 'lucide-react';
import { useCustomersAndBookingsQuery, useRecommendedContainersQuery, useSwapContainersQuery } from '../../api';
import type { SwapCandidate } from '../../api';
import { useStore } from '../../store/store';

interface ReserveContainersPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- BULK SWAP WORKSPACE COMPONENT ---
interface SwapWorkspaceProps {
    toSwap: { id: string, type: string }[];
    bookingRequirements: { container_type: string, container_count: number }[] | null;
    onConfirm: (mappings: Record<string, SwapCandidate>) => void;
    onCancel: () => void;
}

function SwapWorkspace({ toSwap, bookingRequirements, onConfirm, onCancel }: SwapWorkspaceProps) {
    // State to track replacements: { [originalId]: SwapCandidate }
    const [replacements, setReplacements] = useState<Record<string, SwapCandidate>>({});
    const [searchTerm, setSearchTerm] = useState('');

    // We only allow swapping if all are of the same type (or we handle mixed types carefully). 
    // For simplicity, assumed mixed types are allowed but search might be tricky.
    // Let's assume user likely filters by type or we just use the type of the 'active' slot.

    // Auto-select the first empty slot for search context
    const activeSlotId = useMemo(() => {
        return toSwap.find(item => !replacements[item.id])?.id || toSwap[0].id; // Fallback to first if all full
    }, [toSwap, replacements]);

    const activeItem = toSwap.find(i => i.id === activeSlotId);

    // Get the container count from bookingRequirements for the active type
    const offset = useMemo(() => {
        if (!activeItem || !bookingRequirements) return 0;
        const requirement = bookingRequirements.find(r => r.container_type === activeItem.type);
        return requirement?.container_count || 0;
    }, [bookingRequirements, activeItem]);

    const { data: candidates = [], isLoading } = useSwapContainersQuery(
        activeItem?.type || null,
        searchTerm,
        offset
    );

    const handleSelectCandidate = (candidate: SwapCandidate) => {
        // Assign to the FIRST empty slot matching this type
        const targetSlot = toSwap.find(item => !replacements[item.id] && item.type === candidate.container_type);

        if (targetSlot) {
            setReplacements(prev => ({ ...prev, [targetSlot.id]: candidate }));
            setSearchTerm(''); // Clear search for next one
        } else {
            // If all slots of this type are full, maybe replace the currently selected one?
            // For now, just ignore or show toast.
        }
    };

    const handleRemoveReplacement = (originalId: string) => {
        const newReps = { ...replacements };
        delete newReps[originalId];
        setReplacements(newReps);
    };

    const isComplete = toSwap.every(item => !!replacements[item.id]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(253, 246, 235, 0.95)', backdropFilter: 'blur(12px)' }}>
            {/* Header */}
            <div style={{ padding: '16px 24px', background: '#4B686C', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'white', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>Bulk Swap ({toSwap.length})</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Find {toSwap.length} replacements from the yard.
                </p>
            </div>

            {/* Slots List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {toSwap.map((item) => {
                    const assigned = replacements[item.id];
                    return (
                        <div key={item.id} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Original (Left) */}
                            <div style={{ flex: 1, padding: '10px', background: '#ffe4e6', border: '1px solid #fecdd3', borderRadius: '8px', fontSize: '12px', color: '#881337', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.id.split(' ')[0]}...</span>
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 4px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px' }}>{item.type}</span>
                            </div>

                            <ArrowRight size={14} color="#94a3b8" />

                            {/* New (Right) */}
                            {assigned ? (
                                <div style={{ flex: 1, padding: '10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '12px', color: '#14532d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{assigned.container_nbr.split(' ')[0]}...</span>
                                    <button
                                        onClick={() => handleRemoveReplacement(item.id)}
                                        style={{ border: 'none', background: 'none', padding: 2, cursor: 'pointer', color: '#15803d' }}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ flex: 1, padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '12px', color: '#94a3b8', background: 'white', textAlign: 'center' }}>
                                    Pending...
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Search Area */}
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.5)', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search size={14} style={{ position: 'absolute', top: 10, left: 10, color: '#94a3b8' }} />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={`Search ${activeItem?.type} containers...`}
                        style={{
                            width: '100%', padding: '8px 8px 8px 32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(75, 104, 108, 0.2)',
                            background: 'white',
                            fontSize: '13px', boxSizing: 'border-box',
                            outline: 'none',
                            color: '#334155'
                        }}
                        autoFocus
                    />
                </div>

                {/* Candidates List within the workspace */}
                {searchTerm.length >= 3 && (
                    <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '12px', background: 'white', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        {isLoading ? (
                            <div style={{ padding: '12px', fontSize: '11px', textAlign: 'center', color: '#94a3b8' }}>Searching...</div>
                        ) : candidates.length > 0 ? (
                            candidates.map(cand => (
                                <div
                                    key={cand.container_nbr}
                                    onClick={() => handleSelectCandidate(cand)}
                                    style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: '#334155' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#15803d'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#334155'; }}
                                >
                                    <strong>{cand.container_nbr}</strong>
                                    <span style={{ fontSize: '11px', opacity: 0.7 }}>{cand.position}</span>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '12px', fontSize: '11px', textAlign: 'center', color: '#94a3b8' }}>No results</div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            border: '1px solid rgba(75, 104, 108, 0.2)',
                            background: 'white',
                            color: '#4B686C',
                            cursor: 'pointer', fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fefdfb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!isComplete}
                        onClick={() => onConfirm(replacements)}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                            background: isComplete ? '#4B686C' : 'rgba(75, 104, 108, 0.1)',
                            color: isComplete ? 'white' : 'rgba(75, 104, 108, 0.4)',
                            cursor: isComplete ? 'pointer' : 'not-allowed',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        Confirm Swap
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- MAIN PANEL COMPONENT ---

export default function ReserveContainersPanel({ isOpen, onClose }: ReserveContainersPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const setHoverId = useStore(state => state.setHoverId);

    // -- Selection State --
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
    const [bookingRequirements, setBookingRequirements] = useState<{ container_type: string, container_count: number }[] | null>(null);

    // -- View State --
    const [activeTab, setActiveTab] = useState<string>('All');

    // -- Swap State --
    const [swappedMap, setSwappedMap] = useState<Record<string, { id: string, type: string, originalId: string }>>({});

    // -- Multi-Select State --
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkSwapMode, setIsBulkSwapMode] = useState(false);

    const setReserveContainers = useStore(state => ((state as any).setReserveContainers)); // Cast for now until typed properly if needed, or if Typescript picks it up auto from store.ts update we are good. Actually let's assume store is updated


    // -- Search State within Tabs --
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [containerSearchTerm, setContainerSearchTerm] = useState('');

    // -- Data Fetching --
    const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersAndBookingsQuery(isOpen);
    const { data: recommendedContainers = [], isLoading: isLoadingRecommendations, isFetching: isFetchingRecommendations } = useRecommendedContainersQuery(selectedBookingId, bookingRequirements);

    // -- Derived State from Recommendations & Swaps --
    const processedManifest = useMemo(() => {
        if (!recommendedContainers) return { tabs: [], allContainers: [] };

        const allContainers: { id: string, type: string, originalId?: string, isSwapped?: boolean }[] = [];
        const tabs: { type: string, count: number, total: number }[] = [];

        let totalCount = 0;
        let totalTarget = 0;

        recommendedContainers.forEach(group => {
            const groupContainers = group.recommended_containers.map(id => {
                if (swappedMap[id]) {
                    return { ...swappedMap[id], isSwapped: true };
                }
                return { id, type: group.container_type };
            });

            allContainers.push(...groupContainers);

            const reqt = bookingRequirements?.find(r => r.container_type === group.container_type);
            const target = reqt ? reqt.container_count : 0;

            tabs.push({
                type: group.container_type,
                count: group.recommended_containers.length,
                total: target
            });

            totalCount += group.recommended_containers.length;
            totalTarget += target;
        });

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
    useEffect(() => {
        if (processedManifest?.allContainers) {
            const mappedForStore = processedManifest.allContainers.map(c => ({ container_nbr: c.id }));
            // @ts-ignore
            if (setReserveContainers) setReserveContainers(mappedForStore);
        } else {
            // @ts-ignore
            if (setReserveContainers) setReserveContainers([]);
        }

        // Cleanup on unmount/close
        return () => {
            // @ts-ignore
            if (setReserveContainers) setReserveContainers([]);
        }
    }, [processedManifest, setReserveContainers]);

    // -- Handlers --
    const handleCustomerToggle = (custName: string) => {
        setExpandedCustomer(current => current === custName ? null : custName);
    };

    const handleBookingSelect = (bookingId: string, requirements: any[], customerName: string) => {
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
        setSelectedIds(new Set()); // Clear selection when changing tabs
    };

    const handleClearSelection = () => {
        setSelectedBookingId(null);
        setSelectedCustomerName(null);
        setBookingRequirements(null);
        setSwappedMap({});
        setSelectedIds(new Set());
        setIsBulkSwapMode(false);
    };

    const handleClose = () => {
        handleClearSelection();
        onClose();
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkConfirm = (mappings: Record<string, SwapCandidate>) => {
        setSwappedMap(prev => {
            const next = { ...prev };
            Object.entries(mappings).forEach(([origId, cand]) => {
                // If orgId was already a swapped value, find true original.
                // Simplified: assuming origId is valid.
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
    };

    const getAvatarLetter = (name: string) => name.charAt(0).toUpperCase();

    // -- Filters --
    const validContainers = useMemo(() => {
        let filtered = processedManifest.allContainers.filter(c => c.type === activeTab);
        if (containerSearchTerm) {
            const lower = containerSearchTerm.toLowerCase();
            filtered = filtered.filter(c => c.id.toLowerCase().includes(lower));
        }
        return filtered;
    }, [processedManifest, activeTab, containerSearchTerm]);


    if (!isVisible && !isOpen) return null;

    if (isBulkSwapMode) {
        // Collect full objects for the workspace
        const toSwapObjects = Array.from(selectedIds).map(id => {
            return validContainers.find(c => c.id === id) || { id, type: 'Unknown' };
        });

        return (
            <div
                ref={panelRef}
                className="glass-panel"
                style={{
                    position: 'fixed', top: '90px', right: '24px', width: '400px', maxHeight: 'calc(100vh - 114px)',
                    borderRadius: '24px', zIndex: 1000, overflow: 'hidden',
                    transition: 'all 0.4s', transform: 'translateX(0)', opacity: 1
                }}
            >
                <SwapWorkspace
                    toSwap={toSwapObjects}
                    bookingRequirements={bookingRequirements}
                    onConfirm={handleBulkConfirm}
                    onCancel={() => setIsBulkSwapMode(false)}
                />
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                
                .glass-panel {
                    background: rgba(253, 246, 235, 0.95);
                    backdrop-filter: blur(24px) saturate(180%);
                    border: 1px solid rgba(75, 104, 108, 0.1);
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0,0,0,0.05);
                }
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

            <div
                ref={panelRef}
                className="glass-panel"
                style={{
                    position: 'fixed', top: '90px', right: '24px', width: '400px', maxHeight: 'calc(100vh - 114px)',
                    borderRadius: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isOpen ? 'translateX(0)' : 'translateX(440px)', opacity: isOpen ? 1 : 0, overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    background: '#4B686C',
                    position: 'relative',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                background: 'rgba(243, 239, 239, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '20px',
                                marginBottom: '4px'
                            }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e7e7e7ff', boxShadow: '0 0 6px #e7e7e7ff' }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#e7e7e7ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {selectedCustomerName || 'RESERVATION'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{
                                    fontSize: '24px',
                                    fontWeight: 800,
                                    margin: '6px 0 0 0',
                                    color: 'white',
                                    textTransform: 'uppercase',
                                    letterSpacing: '-0.5px',
                                    lineHeight: '1.2'
                                }}>
                                    {selectedBookingId ? selectedBookingId : 'BOOKINGS'}
                                </h2>
                                {selectedBookingId && !isLoadingRecommendations && (
                                    <span style={{ fontSize: '11px', margin: '14px 0 0 0', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                        Total: {bookingRequirements?.reduce((sum, req) => sum + req.container_count, 0) || 0}
                                    </span>
                                )}

                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {selectedBookingId && (
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
                            )}

                            <button
                                onClick={handleClose}
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
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                    <div style={{ padding: '8px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>{selectedIds.size} Selected</span>
                        <button
                            onClick={() => setIsBulkSwapMode(true)}
                            style={{
                                padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none',
                                borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <RefreshCw size={12} /> Swap ({selectedIds.size})
                        </button>
                    </div>
                )}

                {/* Fixed Tabs Header - Only visible when booking selected */}
                {selectedBookingId && (
                    <div style={{ padding: '12px 16px 0', background: 'transparent', zIndex: 9, position: 'relative' }}>
                        {!isSearchExpanded ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Tabs List (90%) */}
                                <div style={{ flex: 1, display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px' }} className="no-scrollbar">
                                    {processedManifest.tabs.map(tab => (
                                        <button
                                            key={tab.type}
                                            onClick={() => handleTabChange(tab.type)}
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
                )}

                {/* Body Content */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '16px' }} className="custom-scrollbar">

                    {!selectedBookingId ? (
                        // ... (Customer List Code remains same, just brief sync) ...
                        <div>
                            {isLoadingCustomers ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading bookings...</div>
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
                                                        const totalContainers = booking.container_types?.reduce((acc: number, curr: any) => acc + curr.container_count, 0) || 0;
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
                                                                    color: '#4B686C',
                                                                    background: 'white',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid rgba(75, 104, 108, 0.1)'
                                                                }}>
                                                                    {totalContainers} Cntrs
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
                            <div style={{ flex: 1 }}>
                                {isFetchingRecommendations ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: '#94a3b8', gap: '12px' }}>
                                        <RefreshCw className="spin" size={24} />
                                        <span style={{ fontSize: '13px' }}>Generating Recommendations...</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                                        {validContainers.map((container, idx) => {
                                            const isSelected = selectedIds.has(container.id);



                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => toggleSelection(container.id)}
                                                    style={{
                                                        background: container.isSwapped ? '#f0fdf4' : (isSelected ? '#f0f9ff' : 'white'),
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        border: isSelected ? '1px solid #3b82f6' : (container.isSwapped ? '1px solid #86efac' : '1px solid #e2e8f0'),
                                                        boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={() => setHoverId(container.id, 'panel')}
                                                    onMouseLeave={() => setHoverId(null)}
                                                >
                                                    {/* Selection Flag - Top Right */}
                                                    {isSelected && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                right: 0,
                                                                background: '#86efac',
                                                                width: '16px',
                                                                height: '16px',
                                                                borderBottomLeftRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                zIndex: 2
                                                            }}
                                                        >
                                                            <Check size={8} color="#14532d" strokeWidth={3} />
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px', paddingRight: '0px' }}>
                                                        <Box size={18} color={isSelected ? "#3b82f6" : "#64748b"} strokeWidth={2} />
                                                        <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                                                            {container.id || (container as any).container_id}
                                                        </span>
                                                    </div>

                                                    {/* Fake Position Data */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                                                        <MapPin size={10} />
                                                        <span>Block {['A', 'B', 'C'][idx % 3]}, R{idx % 5 + 1}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Sticky Confirmation Footer */}
                            {processedManifest.allContainers.length > 0 && (
                                <div style={{
                                    position: 'sticky',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    marginTop: '16px',
                                    marginLeft: '-16px',
                                    marginRight: '-16px',
                                    marginBottom: '0px',
                                    padding: '16px 20px 8px 20px',
                                    background: 'linear-gradient(to top, rgba(253, 246, 235, 1) 0%, rgba(253, 246, 235, 0.98) 100%)',
                                    borderTop: '1px solid rgba(75, 104, 108, 0.12)',
                                    boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)'
                                }}>
                                    {/* Confirm Button */}
                                    <button
                                        onClick={() => {
                                            // TODO: Implement reservation confirmation API call
                                            console.log('Confirming reservation for booking:', selectedBookingId);
                                            console.log('Containers:', processedManifest.allContainers.map(c => c.id));
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '14px 0px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #4B686C 0%, #3d5558 100%)',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            letterSpacing: '0.3px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            boxShadow: '0 4px 16px rgba(75, 104, 108, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(75, 104, 108, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)';
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #5a7a7e 0%, #4B686C 100%)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(75, 104, 108, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)';
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #4B686C 0%, #3d5558 100%)';
                                        }}
                                        onMouseDown={e => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                                        }}
                                        onMouseUp={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
                                        }}
                                    >
                                        <Check size={18} strokeWidth={2.5} />
                                        <span>Confirm Reservation</span>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
