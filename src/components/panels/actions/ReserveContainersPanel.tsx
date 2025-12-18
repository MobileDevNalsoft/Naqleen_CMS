import { useRef, useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, ChevronDown, ChevronLeft, RefreshCw, MapPin, Box, Search, ArrowRight, Check, FileText, Loader2 } from 'lucide-react';
import NoDataFoundAnimation from '../../ui/animations/NoDataFoundAnimation';
import PanelLayout from '../PanelLayout';
import { useCustomersAndBookingsQuery, useRecommendedContainersQuery, useSwapContainersQuery, useReservationMutation, useDeleteReservationMutation, useSwapReservationMutation } from '../../../api';
import type { SwapCandidateResponse, ContainerType } from '../../../api';
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
    bookingRequirements: { container_type: string, container_count: number }[] | null;
    onConfirm: (mappings: Record<string, SwapCandidateResponse>) => void;
    onCancel: () => void;
    recommendedContainerIds: string[];
}

function SwapWorkspace({ toSwap, bookingRequirements, onConfirm, onCancel, recommendedContainerIds }: SwapWorkspaceProps) {
    // State to track replacements: { [originalId]: SwapCandidate }
    const [replacements, setReplacements] = useState<Record<string, SwapCandidateResponse>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const entities = useStore(state => state.entities);
    const setHoverId = useStore(state => state.setHoverId);
    const setReserveContainers = useStore(state => state.setReserveContainers);

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

    // Update 3D visibility - always show recommended + selected replacements, add search results while searching
    useEffect(() => {
        // Get selected swap container IDs
        const selectedSwapIds = Object.values(replacements).map(r => r.container_nbr);

        if (candidates.length > 0 && searchTerm.length >= 3) {
            // Merge search results with recommended containers and selected swaps
            const searchContainerIds = candidates.map(c => c.container_nbr);
            const allVisibleIds = [...new Set([...recommendedContainerIds, ...selectedSwapIds, ...searchContainerIds])];
            setReserveContainers(allVisibleIds.map(id => ({ container_nbr: id })));
        } else {
            // Show recommended containers + selected swap containers
            const allVisibleIds = [...new Set([...recommendedContainerIds, ...selectedSwapIds])];
            setReserveContainers(allVisibleIds.map(id => ({ container_nbr: id })));
        }
    }, [candidates, searchTerm, setReserveContainers, recommendedContainerIds, replacements]);

    // Update swap connection lines in 3D view when replacements change
    const setSwapConnections = useStore(state => state.setSwapConnections);

    useEffect(() => {
        const connections = Object.entries(replacements).map(([originalId, replacement]) => ({
            from: originalId,
            to: replacement.container_nbr
        }));
        setSwapConnections(connections);
    }, [replacements, setSwapConnections]);

    // Restore recommended containers and clear connections on unmount
    useEffect(() => {
        return () => {
            setReserveContainers(recommendedContainerIds.map(id => ({ container_nbr: id })));
            setSwapConnections([]);
        };
    }, [setReserveContainers, recommendedContainerIds, setSwapConnections]);

    const handleSelectCandidate = (candidate: SwapCandidateResponse) => {
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
        // Clear any ghost hover highlights
        setHoverId(null);
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
                    const originalPos = entities[item.id];
                    const assignedPos = assigned ? entities[assigned.container_nbr] : null;
                    return (
                        <div key={item.id} style={{ marginBottom: '12px', display: 'flex', alignItems: 'stretch', gap: '8px' }}>
                            {/* Original Container (Left) */}
                            <div
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#ffe4e6',
                                    border: '1px solid #fecdd3',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={() => setHoverId(item.id, 'panel')}
                                onMouseLeave={() => setHoverId(null)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Box size={16} color="#881337" strokeWidth={2} />
                                    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#881337' }}>
                                        {item.id}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#be123c', paddingLeft: '24px' }}>
                                    <MapPin size={10} />
                                    <span>{formatPosition(originalPos)}</span>
                                </div>
                            </div>

                            <ArrowRight size={14} color="#94a3b8" style={{ alignSelf: 'center' }} />

                            {/* Replacement Container (Right) */}
                            {assigned ? (
                                <div
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#f0fdf4',
                                        border: '1px solid #86efac',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={() => setHoverId(assigned.container_nbr, 'panel')}
                                    onMouseLeave={() => setHoverId(null)}
                                >
                                    <button
                                        onClick={() => handleRemoveReplacement(item.id)}
                                        title="Remove replacement"
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            border: 'none',
                                            background: '#dcfce7',
                                            width: '20px',
                                            height: '20px',
                                            padding: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#166534',
                                            borderRadius: '50%',
                                            transition: 'all 0.2s ease',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = '#eb7b7bff';
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.transform = 'scale(1.1)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = '#dcfce7';
                                            e.currentTarget.style.color = '#166534';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                    >
                                        <X size={12} strokeWidth={2.5} />
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Box size={16} color="#15803d" strokeWidth={2} />
                                        <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#14532d' }}>
                                            {assigned.container_nbr}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#166534', paddingLeft: '24px' }}>
                                        <MapPin size={10} />
                                        <span>{formatPosition(assignedPos)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: '1px dashed #cbd5e1',
                                    borderRadius: '12px',
                                    color: '#94a3b8',
                                    background: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}>
                                    <Box size={16} strokeWidth={1.5} />
                                    <span style={{ fontSize: '11px' }}>Awaiting selection...</span>
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
                {searchTerm.length >= 3 && (() => {
                    // Filter out containers already selected as replacements
                    const alreadySelectedIds = new Set(Object.values(replacements).map(r => r.container_nbr));

                    // 1. Find matching Recommended containers (Local)
                    const matchingRecommended = recommendedContainerIds.filter(id =>
                        id.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        !alreadySelectedIds.has(id)
                    );

                    // 2. Filter API Candidates (exclude selected AND those already found in recommended to avoid dupes)
                    const recommendedSet = new Set(matchingRecommended);
                    const filteredCandidates = candidates.filter(c =>
                        !alreadySelectedIds.has(c.container_nbr) &&
                        !recommendedSet.has(c.container_nbr)
                    );

                    const hasResults = matchingRecommended.length > 0 || filteredCandidates.length > 0;

                    return (
                        <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '12px', background: 'white', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                            {isLoading ? (
                                <div style={{ padding: '12px', fontSize: '11px', textAlign: 'center', color: '#94a3b8' }}>Searching...</div>
                            ) : hasResults ? (
                                <>
                                    {/* Recommended Matches Section */}
                                    {matchingRecommended.length > 0 && (
                                        <>
                                            <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#15803d', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Recommended
                                            </div>
                                            {matchingRecommended.map(id => (
                                                <div
                                                    key={id}
                                                    onClick={() => handleSelectCandidate({
                                                        container_nbr: id,
                                                        container_type: activeItem?.type || 'Unknown',
                                                        position: 'Unknown'
                                                    })}
                                                    style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: '#334155' }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background = '#f0fdf4';
                                                        e.currentTarget.style.color = '#15803d';
                                                        setHoverId(id, 'panel');
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.color = '#334155';
                                                        setHoverId(null);
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Box size={14} />
                                                        <strong>{id}</strong>
                                                    </div>
                                                    <span style={{ fontSize: '11px', opacity: 0.7 }}>{formatPosition(entities[id])}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* API Matches Section */}
                                    {filteredCandidates.length > 0 && (
                                        <>
                                            {matchingRecommended.length > 0 && (
                                                <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    Other Results
                                                </div>
                                            )}
                                            {filteredCandidates.map(cand => (
                                                <div
                                                    key={cand.container_nbr}
                                                    onClick={() => handleSelectCandidate(cand)}
                                                    style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: '#334155' }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background = '#f0fdf4';
                                                        e.currentTarget.style.color = '#15803d';
                                                        setHoverId(cand.container_nbr, 'panel');
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.color = '#334155';
                                                        setHoverId(null);
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Box size={14} />
                                                        <strong>{cand.container_nbr}</strong>
                                                    </div>
                                                    <span style={{ fontSize: '11px', opacity: 0.7 }}>{formatPosition(entities[cand.container_nbr])}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </>
                            ) : (
                                <div style={{ padding: '12px', fontSize: '11px', textAlign: 'center', color: '#94a3b8' }}>No results</div>
                            )}
                        </div>
                    );
                })()}

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

    // -- Swap State --
    const [swappedMap, setSwappedMap] = useState<Record<string, { id: string, type: string, originalId: string }>>({});

    // -- Multi-Select State --
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedReservedIds, setSelectedReservedIds] = useState<Set<string>>(new Set());
    const [isBulkSwapMode, setIsBulkSwapMode] = useState(false);
    const [swapSource, setSwapSource] = useState<'recommended' | 'reserved'>('recommended');

    const setReserveContainers = useStore(state => ((state as any).setReserveContainers)); // Cast for now until typed properly if needed, or if Typescript picks it up auto from store.ts update we are good. Actually let's assume store is updated


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
                // Clear selections and refresh
                setSelectedReservedIds(new Set());
                queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
            } else if (result.response_code === 207) {
                showToast('warning', result.response_message || `Partial success: ${result.success_count} unreserved, ${result.fail_count} failed`);
                setSelectedReservedIds(new Set()); // Consider keeping if you want retry, but usually refresh is safer
                queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
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

        const newContainersToReserve = containerIds.filter(id => !alreadyReservedIds.has(id));

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
                // Return to bookings view and refresh data
                handleClearSelection();
                queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
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

    const handleBulkConfirm = async (mappings: Record<string, SwapCandidateResponse>) => {
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
                    queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
                } else if (result.response_code === 207) {
                    showToast('warning', result.response_message || `Partial swap: ${result.success_count} swapped, ${result.fail_count} failed`);
                    // Might want to close or keep open depending on UX. Closing for now.
                    setIsBulkSwapMode(false);
                    setSelectedReservedIds(new Set());
                    queryClient.invalidateQueries({ queryKey: ['customersAndBookings'] });
                } else {
                    showToast('error', result.response_message || 'Failed to swap containers');
                }
            } catch (error: any) {
                showToast('error', error?.message || 'An unexpected error occurred during swap');
            }
        }
    };

    const getAvatarLetter = (name: string) => name.charAt(0).toUpperCase();

    // -- Filters --
    const validContainers = useMemo(() => {
        let filtered = processedManifest.allContainers.filter(c => c.type === activeTab);

        // Filter out already reserved containers to prevent duplication
        if (bookingRequirements) {
            const req = bookingRequirements.find(r => r.container_type === activeTab);
            const reservedSet = new Set(req?.reserved_containers || []);
            filtered = filtered.filter(c => !reservedSet.has(c.id));
        }

        if (containerSearchTerm) {
            const lower = containerSearchTerm.toLowerCase();
            filtered = filtered.filter(c => c.id.toLowerCase().includes(lower));
        }
        return filtered;
    }, [processedManifest, activeTab, containerSearchTerm, bookingRequirements]);

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
                return validContainers.find(c => c.id === id) || { id, type: 'Unknown' };
            });
        }

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
                    recommendedContainerIds={processedManifest.allContainers.map(c => c.id)}
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
                titleBadge={selectedBookingId && !isLoadingRecommendations ? (
                    <span style={{
                        fontSize: '11px',
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: 600
                    }}>
                        Total: {bookingRequirements?.reduce((sum, req) => sum + req.container_count, 0) || 0}
                    </span>
                ) : undefined}
                isOpen={isOpen}
                onClose={handleClose}
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
                                <div style={{ display: 'flex', gap: '8px' }}>
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
                                                Creating...
                                            </>
                                        ) : 'Reserve'}
                                    </button>

                                    {selectedIds.size > 0 && (
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
                                                Deleting...
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
                {/* Bulk Actions Bar */}
                {

                }

                {/* Fixed Tabs Header - Only visible when booking selected */}
                {
                    selectedBookingId && (
                        <div style={{ margin: '-12px -12px', padding: '0 12px', background: 'transparent', zIndex: 9, position: 'relative' }}>
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
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                {/* Reserved Section */}
                                {reservedContainersForTab.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '12px' }}>
                                            <h4 style={{ fontSize: '12px', color: '#64748b', margin: '0 10px 0 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F59E0B' }}></div>
                                                Reserved
                                            </h4>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: '12px' }}>
                                                {reservedContainersForTab.length}
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                                            {reservedContainersForTab.map(id => (
                                                <div
                                                    key={id}
                                                    onClick={() => toggleReservedSelection(id)}
                                                    style={{
                                                        background: selectedReservedIds.has(id) ? '#fef3c7' : '#fffbeb',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        border: selectedReservedIds.has(id) ? '1px solid #d97706' : '1px solid #fcd34d',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        cursor: 'pointer',
                                                        boxShadow: selectedReservedIds.has(id) ? '0 0 0 2px rgba(217, 119, 6, 0.2)' : '0 2px 4px rgba(245, 158, 11, 0.05)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={() => setHoverId(id, 'panel')}
                                                    onMouseLeave={() => setHoverId(null)}
                                                >
                                                    {/* Selection Flag - Top Right */}
                                                    {selectedReservedIds.has(id) && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                right: 0,
                                                                background: '#fbbf24',
                                                                width: '16px',
                                                                height: '16px',
                                                                borderBottomLeftRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                zIndex: 2
                                                            }}
                                                        >
                                                            <Check size={8} color="#78350f" strokeWidth={3} />
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '18px' }}>
                                                        <Box size={18} color={selectedReservedIds.has(id) ? "#d97706" : "#d97706"} strokeWidth={2} />
                                                        <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#92400e' }}>
                                                            {id}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', fontSize: '10px', color: '#b45309', marginTop: '4px', paddingLeft: '44px' }}>
                                                        <MapPin size={10} />
                                                        <span>{formatPosition(entities[id])}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recommended Section */}
                                {(bookingRequirements?.find(r => r.container_type === activeTab)?.container_count || 0) - reservedContainersForTab.length > 0 && (!containerSearchTerm || validContainers.length > 0) && (
                                    <div>
                                        {reservedContainersForTab.length > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '12px', marginRight: '12px' }}>
                                                <h4 style={{ fontSize: '12px', color: '#64748b', margin: '0 10px 0 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10B981' }}></div>
                                                    Recommended
                                                </h4>
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', background: '#ecfdf5', padding: '2px 8px ', borderRadius: '12px' }}>
                                                    {validContainers.length}/{Math.max(0, (bookingRequirements?.find(r => r.container_type === activeTab)?.container_count || 0) - reservedContainersForTab.length)}
                                                </span>
                                            </div>
                                        )}

                                        {isFetchingRecommendations ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: '#94a3b8', gap: '12px' }}>
                                                <RefreshCw className="spin" size={24} />
                                                <span style={{ fontSize: '13px' }}>Generating Recommendations...</span>
                                            </div>
                                        ) : validContainers.length === 0 ? (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '40px 20px',
                                                color: '#94a3b8',
                                                textAlign: 'center'
                                            }}>
                                                <Box size={40} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                                <span style={{ fontSize: '14px', fontWeight: 500 }}>No Containers Available</span>
                                                <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                                                    No recommendations found for this container type
                                                </span>
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

                                                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '18px' }}>
                                                                <Box size={18} color={isSelected ? "#3b82f6" : "#64748b"} strokeWidth={2} />
                                                                <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                                                                    {container.id || (container as any).container_id}
                                                                </span>
                                                            </div>

                                                            {/* Position Data from 3D Terminal */}
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', fontSize: '10px', color: '#94a3b8', marginTop: '4px', paddingLeft: '44px' }}>
                                                                <MapPin size={10} />
                                                                <span>{formatPosition(entities[container.id])}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )
                )}
            </PanelLayout >
        </>
    );
}
