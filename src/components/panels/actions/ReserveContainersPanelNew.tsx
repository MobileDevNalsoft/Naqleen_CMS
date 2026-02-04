import { useRef, useState, useEffect, useMemo, memo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, Search, Loader2, ChevronDown, ChevronUp, MapPin, Box, Check, X } from 'lucide-react';
import { useStore } from '../../../store/store';
import { showToast } from '../../ui/custom-components/Toast';
import PanelLayout from '../PanelLayout';
import NoDataFoundAnimation from '../../ui/animations/NoDataFoundAnimation';
import {
    useCustomersQuery,
    useBookingsQuery,
    useAvailableReservedQuery,
    useReservationMutation,
    useDeleteReservationMutation,
    type Customer
} from '../../../api';

// --- MEMOIZED COMPONENTS ---
const ContainerCard = memo(({
    container,
    isSelected,
    type, // 'available' | 'reserved'
    onClick
}: {
    container: any,
    isSelected: boolean,
    type: 'available' | 'reserved',
    onClick: (id: string) => void
}) => {
    const posStr = container.terminal ? `${container.terminal}-${container.block}-${container.lot}-${container.row}-${container.level}` : 'Yard';

    // Styles based on type and selection
    const isAvailable = type === 'available';

    // Available: Green selection, Blue default
    // Reserved: Red selection, Green default

    let bg, border, shadow, iconColor, textColor, subTextColor, highlightBarColor, decorColor;

    if (isAvailable) {
        bg = isSelected ? '#dcfce7' : '#eef2ff';
        border = isSelected ? '1px solid #22c55e' : '1px solid #bae6fd';
        shadow = isSelected ? '0 4px 12px rgba(34, 197, 94, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)';
        iconColor = isSelected ? '#16a34a' : '#94a3b8';
        textColor = isSelected ? '#14532d' : '#1e293b';
        subTextColor = isSelected ? '#15803d' : '#64748b';
        highlightBarColor = '#22c55e';
        decorColor = isSelected ? '#15803d' : '#94a3b8';
    } else {
        // Reserved Logic
        bg = isSelected ? '#fef2f2' : '#f0fdf4';
        border = isSelected ? '1px solid #fecaca' : '1px solid #bbf7d0';
        shadow = isSelected ? '0 4px 12px rgba(239, 68, 68, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)';
        iconColor = isSelected ? '#ef4444' : '#94a3b8';
        textColor = isSelected ? '#b91c1c' : '#1e293b';
        subTextColor = isSelected ? '#b91c1c' : '#64748b';
        highlightBarColor = '#f87171';
        decorColor = isSelected ? '#ef4444' : '#94a3b8';
    }

    return (
        <button
            onClick={() => onClick(container.id)}
            style={{
                background: bg,
                border: border,
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: shadow,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                height: '55px',
                boxSizing: 'border-box'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Box size={14} color={iconColor} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: textColor }}>
                        {container.id}
                    </span>
                </div>
            </div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                color: subTextColor,
                opacity: isSelected ? 0.8 : 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}>
                <MapPin size={10} style={{ flexShrink: 0 }} />
                <span>{posStr}</span>
            </div>

            {/* Decorative Background Icon */}
            <Box
                size={60}
                style={{
                    position: 'absolute',
                    bottom: '-10px',
                    right: '-10px',
                    opacity: 0.08,
                    transform: 'rotate(-20deg)',
                    color: decorColor,
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />

            {/* Selection Highlight Bar */}
            {isSelected && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: highlightBarColor, zIndex: 1 }}></div>}
        </button>
    );
}, (prev, next) => {
    return prev.container.id === next.container.id && prev.isSelected === next.isSelected && prev.type === next.type;
});

interface ReserveContainersPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- HELPERS ---
const getAvatarLetter = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
};

// --- PREMIUM COMPONENTS ---
interface PremiumSelectorProps {
    value: string;
    options: string[];
    onChange: (val: string) => void;
    disabled?: boolean;
    placeholder: string;
    flex?: number | string;
    minWidth?: string;
    noBorder?: boolean;
}

const PremiumPositionSelector = ({
    value,
    options,
    onChange,
    disabled,
    placeholder,
    flex = 1,
    minWidth = '50px',
    noBorder = false
}: PremiumSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={containerRef} style={{ flex, position: 'relative', height: '100%', borderRight: noBorder ? 'none' : '1px solid #e2e8f0', minWidth }}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '0 8px',
                    cursor: disabled ? 'default' : 'pointer',
                    opacity: disabled ? 0.4 : 1,
                    transition: 'all 0.2s'
                }}
            >
                <span style={{
                    fontSize: '11px',
                    fontWeight: value ? 800 : 500,
                    color: value ? '#1e293b' : '#94a3b8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {value || placeholder}
                </span>
                <ChevronDown size={10} style={{
                    color: '#94a3b8',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    flexShrink: 0
                }} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            minWidth: '100%',
                            maxHeight: '180px',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '12px',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            zIndex: 1000,
                            overflowY: 'auto',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                        className="custom-scrollbar"
                    >
                        {options.map(opt => (
                            <motion.button
                                key={opt}
                                whileHover={{
                                    background: '#f1f5f9',
                                    color: '#1e293b',
                                    border: '1px solid rgba(0, 0, 0, 0.04)'
                                }}
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '7px 10px',
                                    fontSize: '11px',
                                    fontWeight: value === opt ? 800 : 500,
                                    textAlign: 'left',
                                    borderRadius: '8px',
                                    border: value === opt ? '1px solid rgba(0, 0, 0, 0.04)' : '1px solid rgba(0, 0, 0, 0.02)',
                                    background: value === opt ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
                                    color: value === opt ? '#1e293b' : '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s'
                                }}
                            >
                                {opt}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- SKELETON LOADERS ---
// --- SKELETON LOADERS ---
const CustomerSkeleton = () => (
    <div className="shimmer-card" style={{
        width: '100%',
        marginBottom: '10px',
        borderRadius: '12px',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px',
        background: 'white'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="skeleton-block" style={{ width: '42px', height: '42px', borderRadius: '10px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div className="skeleton-block" style={{ width: '120px', height: '14px' }} />
                <div className="skeleton-block" style={{ width: '60px', height: '11px' }} />
            </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <div className="skeleton-block" style={{ width: '22px', height: '16px' }} />
                <div className="skeleton-block" style={{ width: '42px', height: '10px' }} />
            </div>
            <div className="skeleton-block" style={{ width: '18px', height: '18px' }} />
        </div>
    </div>
);

const BookingSkeleton = () => (
    <div className="shimmer-card" style={{
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'white',
        boxSizing: 'border-box'
    }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="skeleton-block" style={{ width: '100px', height: '14px' }} />
            <div className="skeleton-block" style={{ width: '140px', height: '11px' }} />
        </div>
        <div className="skeleton-block" style={{ width: '20px', height: '20px' }} />
    </div>
);

const ContainerSkeleton = ({ type }: { type: 'available' | 'reserved' }) => (
    <div className="shimmer-card" style={{
        width: '100%',
        borderRadius: '12px',
        background: type === 'available' ? '#eef2ff' : '#f0fdf4',
        border: type === 'available' ? '1px solid #bae6fd' : '1px solid #bbf7d0',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        height: '55px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        boxSizing: 'border-box'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="skeleton-block" style={{ width: '14px', height: '14px' }} />
            <div className="skeleton-block" style={{ width: '80px', height: '13px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div className="skeleton-block" style={{ width: '10px', height: '10px' }} />
            <div className="skeleton-block" style={{ width: '100px', height: '10px' }} />
        </div>
    </div>
);

export function ReserveContainersPanelNew({ isOpen, onClose }: ReserveContainersPanelProps) {
    const queryClient = useQueryClient();

    // -- Navigation State --
    const [selectedCustomerNbr, setSelectedCustomerNbr] = useState<string | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
    const [selectedContainerType, setSelectedContainerType] = useState<string | null>(null);

    // -- Stage 3 State (Deep View) --
    const [activeTab, setActiveTab] = useState<'available' | 'reserved'>('available');
    const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(new Set());
    const [selectedReservedIds, setSelectedReservedIds] = useState<Set<string>>(new Set());

    // -- Enhanced Search State --
    const [searchMode, setSearchMode] = useState<'container' | 'position'>('container');
    const [containerSearchTerm, setContainerSearchTerm] = useState('');

    // Cascading Position Selectors
    const [selectedTerminal, setSelectedTerminal] = useState<string>('');
    const [selectedBlock, setSelectedBlock] = useState<string>('');
    const [selectedLot, setSelectedLot] = useState<string>('');
    const [selectedRow, setSelectedRow] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    // -- Mutations --
    const { mutate: reserve, isPending: isReserving } = useReservationMutation();
    const { mutate: unreserve, isPending: isUnreserving } = useDeleteReservationMutation();

    // -- Booking Search State --
    const [bookingSearchText, setBookingSearchText] = useState('');
    const [debouncedBookingSearchText, setDebouncedBookingSearchText] = useState('');

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            if (bookingSearchText.length >= 2) {
                setDebouncedBookingSearchText(bookingSearchText);
            } else if (bookingSearchText.length === 0) {
                setDebouncedBookingSearchText('');
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [bookingSearchText]);



    // -- Data Fetching: Customers --
    const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery(isOpen);

    // -- Data Fetching: Bookings --
    const {
        data: bookingsData,
        isLoading: isLoadingBookings,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useBookingsQuery(selectedCustomerNbr, debouncedBookingSearchText);

    const bookings = useMemo(() => {
        return bookingsData?.pages.flatMap(p => p.bookings) || [];
    }, [bookingsData]);

    // -- Data Fetching: Available & Reserved Containers (Stage 3) --
    const { data: containerData, isLoading: isLoadingContainers } = useAvailableReservedQuery(
        selectedCustomerNbr,
        selectedBookingId,
        selectedContainerType
    );

    const availableContainers = useMemo(() => containerData?.available || [], [containerData]);
    const reservedContainers = useMemo(() => containerData?.reserved || [], [containerData]);

    // -- Derived Stats for Limits --
    const currentBooking = useMemo(() => {
        return bookings.find(b => b.booking_id === selectedBookingId);
    }, [bookings, selectedBookingId]);

    const currentTypeStats = useMemo(() => {
        if (!currentBooking || !selectedContainerType) return null;
        return currentBooking.types.find(t => t.type.toUpperCase() === selectedContainerType.toUpperCase());
    }, [currentBooking, selectedContainerType]);

    const toPlanLimit = Number(currentTypeStats?.to_plan ?? 999999);

    // -- Store access for physical positions --
    const entities = useStore(state => state.entities);

    // -- Position Filtering Logic --
    const filteredAvailable = useMemo(() => {
        let list = availableContainers.map(id => ({ ...entities[id], id }));

        if (searchMode === 'container' && containerSearchTerm) {
            const term = containerSearchTerm.toLowerCase();
            list = list.filter(c => c.id.toLowerCase().includes(term));
        } else if (searchMode === 'position') {
            if (selectedTerminal) list = list.filter(c => c.terminal === selectedTerminal);
            if (selectedBlock) list = list.filter(c => c.block === selectedBlock);
            if (selectedLot) list = list.filter(c => String(c.lot) === selectedLot);
            if (selectedRow) list = list.filter(c => c.row === selectedRow);
            if (selectedLevel) list = list.filter(c => String(c.level) === selectedLevel);
        }
        return list;
    }, [availableContainers, entities, searchMode, containerSearchTerm, selectedTerminal, selectedBlock, selectedLot, selectedRow, selectedLevel]);

    const filteredReserved = useMemo(() => {
        let list = reservedContainers.map(id => ({ ...entities[id], id }));

        if (searchMode === 'container' && containerSearchTerm) {
            const term = containerSearchTerm.toLowerCase();
            list = list.filter(c => c.id.toLowerCase().includes(term));
        } else if (searchMode === 'position') {
            if (selectedTerminal) list = list.filter(c => c.terminal === selectedTerminal);
            if (selectedBlock) list = list.filter(c => c.block === selectedBlock);
            if (selectedLot) list = list.filter(c => String(c.lot) === selectedLot);
            if (selectedRow) list = list.filter(c => c.row === selectedRow);
            if (selectedLevel) list = list.filter(c => String(c.level) === selectedLevel);
        }
        return list;
    }, [reservedContainers, entities, searchMode, containerSearchTerm, selectedTerminal, selectedBlock, selectedLot, selectedRow, selectedLevel]);

    // -- Keyboard Shortcuts: Select All (Ctrl + A) --
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen || !selectedBookingId || !selectedContainerType) return;

            const isApple = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
            const modKey = isApple ? e.metaKey : e.ctrlKey;

            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedAvailableIds(new Set());
                setSelectedReservedIds(new Set());
                return;
            }

            if (modKey && (e.key === 'a' || e.key === 'A')) {
                e.preventDefault();

                if (activeTab === 'available') {
                    if (toPlanLimit <= 0) {
                        showToast('error', `Cannot select containers: Booking limit reached or exceeded (${toPlanLimit})`);
                        return;
                    }
                    const allIds = filteredAvailable.map(c => c.id);
                    // Strictly respect to_plan limit
                    if (allIds.length > toPlanLimit) {
                        const limitedIds = allIds.slice(0, toPlanLimit);
                        setSelectedAvailableIds(new Set(limitedIds));
                        showToast('info', `Selected top ${toPlanLimit} items (Booking limit)`);
                    } else {
                        setSelectedAvailableIds(new Set(allIds));
                    }
                } else {
                    const allIds = filteredReserved.map(c => c.id);
                    setSelectedReservedIds(new Set(allIds));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedBookingId, selectedContainerType, activeTab, filteredAvailable, filteredReserved, toPlanLimit]);


    // -- Position Options --
    const positionOptions = useMemo(() => {
        const allRelevantIds = [...availableContainers, ...reservedContainers];
        const relevantEntities = allRelevantIds.map(id => entities[id]).filter(Boolean);

        const terminals = Array.from(new Set(relevantEntities.map(e => e.terminal))).sort();

        let filteredForBlocks = relevantEntities;
        if (selectedTerminal) filteredForBlocks = filteredForBlocks.filter(e => e.terminal === selectedTerminal);
        const blocks = Array.from(new Set(filteredForBlocks.map(e => e.block))).sort();

        let filteredForLots = filteredForBlocks;
        if (selectedBlock) filteredForLots = filteredForLots.filter(e => e.block === selectedBlock);
        const lots = Array.from(new Set(filteredForLots.map(e => String(e.lot)))).sort((a, b) => parseInt(a) - parseInt(b));

        let filteredForRows = filteredForLots;
        if (selectedLot) filteredForRows = filteredForRows.filter(e => String(e.lot) === selectedLot);
        const rows = Array.from(new Set(filteredForRows.map(e => e.row))).sort();

        let filteredForLevels = filteredForRows;
        if (selectedRow) filteredForLevels = filteredForLevels.filter(e => e.row === selectedRow);
        const levels = Array.from(new Set(filteredForLevels.map(e => String(e.level)))).sort((a, b) => parseInt(a) - parseInt(b));

        return { terminals, blocks, lots, rows, levels };
    }, [availableContainers, reservedContainers, entities, selectedTerminal, selectedBlock, selectedLot, selectedRow]);

    // Determine counts for tabs (using filtered counts for better UX?)
    // Actually, normally tab counts show total in that category regardless of filter
    // But since this is a drill-down search, maybe filtered counts are better.
    // Let's stick to total counts for the tabs themselves as per standard patterns.
    const availableCount = availableContainers.length;
    const reservedCount = reservedContainers.length;

    // -- Infinite Scroll Observer --
    const observerTarget = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 1.0 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, bookings.length]);

    // Cleanup on close
    useEffect(() => {
        if (!isOpen) {
            resetState();
        }
    }, [isOpen]);

    const resetState = () => {
        setSelectedCustomerNbr(null);
        setSelectedCustomerName(null);
        setSelectedBookingId(null);
        setExpandedBookingId(null);
        setSelectedContainerType(null);
        setBookingSearchText('');
        setSelectedAvailableIds(new Set());
        setSelectedReservedIds(new Set());
        setActiveTab('available');
        setSearchMode('container');
        setContainerSearchTerm('');
        setSelectedTerminal('');
        setSelectedBlock('');
        setSelectedLot('');
        setSelectedRow('');
        setSelectedLevel('');
    };


    // -- Handlers --
    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomerNbr(customer.cust_nbr);
        setSelectedCustomerName(customer.cust_name);
        setSelectedBookingId(null);
        setExpandedBookingId(null);
    };

    const handleBackToCustomers = () => {
        resetState();
    };

    const handleBackToBookings = () => {
        setSelectedBookingId(null);
        setSelectedContainerType(null);
        setSelectedAvailableIds(new Set());
        setSelectedReservedIds(new Set());
        setContainerSearchTerm('');
        setSelectedTerminal('');
        setSelectedBlock('');
        setSelectedLot('');
        setSelectedRow('');
        setSelectedLevel('');
    };

    const handleTypeSelect = (bookingId: string, type: string) => {
        setSelectedBookingId(bookingId);
        setSelectedContainerType(type);
        setActiveTab('available'); // Default to available
    };

    const handleToggleSelection = (id: string) => {
        if (activeTab === 'available') {
            const isRemoving = selectedAvailableIds.has(id);
            if (!isRemoving && selectedAvailableIds.size >= toPlanLimit) {
                showToast('error', `Cannot select more than ${toPlanLimit} containers (Booking limit)`);
                return;
            }

            setSelectedAvailableIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        } else {
            setSelectedReservedIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        }
    };

    // -- Actions --
    const handleReserve = () => {
        if (!selectedBookingId || selectedAvailableIds.size === 0) return;

        reserve({
            booking_id: selectedBookingId,
            reserve_containers: Array.from(selectedAvailableIds)
        }, {
            onSuccess: (data) => {
                if (data.response_code === 200) {
                    showToast('success', data.response_message || `Successfully reserved ${selectedAvailableIds.size} containers`);
                    queryClient.invalidateQueries({ queryKey: ['availableReserved'] });
                    queryClient.invalidateQueries({ queryKey: ['bookings'] });
                    setSelectedAvailableIds(new Set());
                } else {
                    showToast('error', data.response_message || 'Reservation failed');
                }
            },
            onError: (err: any) => {
                showToast('error', err?.message || 'An error occurred while reserving containers.');
            }
        });
    };

    const handleUnreserve = () => {
        if (!selectedBookingId || selectedReservedIds.size === 0) return;

        unreserve({
            booking_id: selectedBookingId,
            unreserve_containers: Array.from(selectedReservedIds)
        }, {
            onSuccess: (data) => {
                if (data.response_code === 200) {
                    showToast('success', data.response_message || `Successfully unreserved ${selectedReservedIds.size} containers`);
                    queryClient.invalidateQueries({ queryKey: ['availableReserved'] });
                    queryClient.invalidateQueries({ queryKey: ['bookings'] });
                    setSelectedReservedIds(new Set());
                } else {
                    showToast('error', data.response_message || 'Unreservation failed');
                }
            },
            onError: (err: any) => {
                showToast('error', err?.message || 'An error occurred while unreserving containers.');
            }
        });
    };

    const selectedCount = activeTab === 'available' ? selectedAvailableIds.size : selectedReservedIds.size;

    // -- Render --
    return (
        <>
            <style>{`
                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes shimmerSweep {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .shimmer-card {
                    position: relative;
                    overflow: hidden;
                }
                
                .shimmer-card::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    transform: translateX(-100%);
                    background-image: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0,
                        rgba(255, 255, 255, 0.2) 20%,
                        rgba(255, 255, 255, 0.5) 60%,
                        rgba(255, 255, 255, 0)
                    );
                    animation: shimmerSweep 2.5s infinite;
                }

                .skeleton-block {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
            `}</style>

            {/* ... (Previous Render Code) ... */}

            <PanelLayout
                title={!selectedCustomerNbr ? 'CUSTOMERS' : !selectedBookingId ? (
                    // ... (Search Title) ...
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                        onClick={handleBackToCustomers}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            transition: 'all 0.2s'
                        }}>
                            <ChevronLeft size={18} color="white" />
                        </div>
                        <span>{selectedCustomerName}</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                            onClick={handleBackToBookings}
                        >
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                transition: 'all 0.2s'
                            }}>
                                <ChevronLeft size={18} color="white" />
                            </div>
                            <span>{selectedBookingId}</span>
                        </div>
                        {selectedContainerType && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ChevronRight size={16} color="white" style={{ opacity: 0.6 }} />
                                <span style={{
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: 'white',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}>
                                    {selectedContainerType}
                                </span>
                            </div>
                        )}
                    </div>
                )}
                category={selectedBookingId ? (selectedCustomerName || 'RESERVATION') : selectedCustomerNbr ? 'BOOKINGS' : 'RESERVATION'}
                top="15px"
                height="calc(100vh - 48px)"
                zIndex={9999}
                isOpen={isOpen}
                onClose={onClose}
                width="450px"
                allowExpansion={!!selectedBookingId}
                tabsContent={selectedBookingId ? (
                    <div style={{
                        padding: '12px 0 16px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                        {/* Premium Segmented Tabs */}
                        <div style={{
                            display: 'flex',
                            background: 'rgba(241, 245, 249, 0.6)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: '24px',
                            padding: '4px',
                            width: '100%',
                            gap: '4px',
                            position: 'relative',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                            {/* Sliding Active Indicator */}
                            <motion.div
                                layoutId="activeTabIndicator"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                style={{
                                    position: 'absolute',
                                    top: '4px',
                                    bottom: '4px',
                                    left: activeTab === 'available' ? '4px' : 'calc(50% + 2px)',
                                    width: 'calc(50% - 6px)',
                                    background: activeTab === 'available' ? '#4B686C' : '#15803d',
                                    borderRadius: '20px',
                                    zIndex: 0,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}
                            />

                            <button
                                onClick={() => setActiveTab('available')}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '26px',
                                    border: activeTab === 'available' ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: activeTab === 'available' ? 'white' : '#64748b',
                                    background: activeTab === 'available' ? 'transparent' : '#eef2ff',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    position: 'relative',
                                    zIndex: 1,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.6px',
                                    boxShadow: activeTab === 'available' ? 'none' : '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                            >
                                Available
                                <span style={{
                                    background: activeTab === 'available' ? 'rgba(255,255,255,0.2)' : '#dbeafe',
                                    color: activeTab === 'available' ? 'white' : '#1e40af',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    minWidth: '28px',
                                    textAlign: 'center'
                                }}>
                                    {availableCount}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('reserved')}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '26px',
                                    border: activeTab === 'reserved' ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: activeTab === 'reserved' ? 'white' : '#64748b',
                                    background: activeTab === 'reserved' ? 'transparent' : '#f0fdf4',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    position: 'relative',
                                    zIndex: 1,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.6px',
                                    boxShadow: activeTab === 'reserved' ? 'none' : '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                            >
                                Reserved
                                <span style={{
                                    background: activeTab === 'reserved' ? 'rgba(255,255,255,0.2)' : '#dcfce7',
                                    color: activeTab === 'reserved' ? 'white' : '#166534',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    minWidth: '28px',
                                    textAlign: 'center'
                                }}>
                                    {reservedCount}
                                </span>
                            </button>
                        </div>

                        {/* Search & Filter Section (Bulk Swap Style) - Moved here to be below tabs */}
                        <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Input Area (Container Search or Cascading Dropdowns) */}
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                background: 'white',
                                borderRadius: '20px',
                                border: '1px solid #cbd5e1',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                height: '36px'
                            }}>
                                {searchMode === 'container' ? (
                                    <>
                                        <Search size={14} style={{ marginLeft: '12px', color: '#64748b' }} />
                                        <input
                                            value={containerSearchTerm}
                                            onChange={e => setContainerSearchTerm(e.target.value)}
                                            placeholder={`Search by Container Number`}
                                            style={{
                                                flex: 1, padding: '0 12px',
                                                border: 'none',
                                                background: 'transparent',
                                                fontSize: '13px',
                                                outline: 'none',
                                                color: '#334155',
                                                height: '100%'
                                            }}
                                        />
                                        {containerSearchTerm && (
                                            <button
                                                onClick={() => setContainerSearchTerm('')}
                                                style={{
                                                    marginRight: '8px',
                                                    padding: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#94a3b8',
                                                    borderRadius: '50%',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#64748b'}
                                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    // Position Search Premium Selectors
                                    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                                        <PremiumPositionSelector
                                            placeholder="TRM"
                                            value={selectedTerminal}
                                            options={positionOptions.terminals}
                                            onChange={val => {
                                                setSelectedTerminal(val);
                                                setSelectedBlock(''); setSelectedLot(''); setSelectedRow(''); setSelectedLevel('');
                                            }}
                                            flex={1.2}
                                        />
                                        <PremiumPositionSelector
                                            placeholder="BK"
                                            value={selectedBlock}
                                            options={positionOptions.blocks}
                                            disabled={!selectedTerminal}
                                            onChange={val => {
                                                setSelectedBlock(val);
                                                setSelectedLot(''); setSelectedRow(''); setSelectedLevel('');
                                            }}
                                        />
                                        <PremiumPositionSelector
                                            placeholder="LT"
                                            value={selectedLot}
                                            options={positionOptions.lots}
                                            disabled={!selectedBlock}
                                            onChange={val => {
                                                setSelectedLot(val);
                                                setSelectedRow(''); setSelectedLevel('');
                                            }}
                                        />
                                        <PremiumPositionSelector
                                            placeholder="RW"
                                            value={selectedRow}
                                            options={positionOptions.rows}
                                            disabled={!selectedLot}
                                            onChange={val => {
                                                setSelectedRow(val);
                                                setSelectedLevel('');
                                            }}
                                        />
                                        <PremiumPositionSelector
                                            placeholder="LV"
                                            value={selectedLevel}
                                            options={positionOptions.levels}
                                            disabled={!selectedRow}
                                            onChange={val => setSelectedLevel(val)}
                                            noBorder
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Mode Toggle Button */}
                            <div
                                onClick={() => {
                                    setSearchMode(prev => prev === 'container' ? 'position' : 'container');
                                    // Clear states on toggle to prevent unexpected filtering
                                    setContainerSearchTerm('');
                                    setSelectedTerminal(''); setSelectedBlock(''); setSelectedLot(''); setSelectedRow(''); setSelectedLevel('');
                                }}
                                style={{
                                    height: '36px',
                                    padding: '0 16px',
                                    background: '#9ec4ca',
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
                    </div>
                ) : null}
                footerActions={selectedBookingId ? (
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <div style={{ fontSize: '13px', color: '#64748b', marginRight: 'auto' }}>
                            {activeTab === 'available' && toPlanLimit < 999999 ? (
                                <><strong>{selectedCount}</strong> / {toPlanLimit} selected</>
                            ) : (
                                <><strong>{selectedCount}</strong> selected</>
                            )}
                        </div>

                        {activeTab === 'available' ? (
                            <button
                                onClick={handleReserve}
                                disabled={selectedCount === 0 || isReserving}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    background: selectedCount === 0 ? '#e2e8f0' : '#4B686C',
                                    color: selectedCount === 0 ? '#94a3b8' : 'white',
                                    border: 'none',
                                    fontSize: '14px', fontWeight: 600,
                                    cursor: (selectedCount === 0 || isReserving) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                {isReserving ? <Loader2 size={16} className="animate-spin" /> : 'Reserve'}
                            </button>
                        ) : (
                            <button
                                onClick={handleUnreserve}
                                disabled={selectedCount === 0 || isUnreserving}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    background: selectedCount === 0 ? '#e2e8f0' : '#fee2e2',
                                    color: selectedCount === 0 ? '#94a3b8' : '#ef4444',
                                    border: selectedCount === 0 ? 'none' : '1px solid #fecaca',
                                    fontSize: '14px', fontWeight: 600,
                                    cursor: (selectedCount === 0 || isUnreserving) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                {isUnreserving ? <Loader2 size={16} className="animate-spin" /> : 'Unreserve'}
                            </button>
                        )}
                    </div>
                ) : null}
            >
                {!selectedCustomerNbr ? (
                    // --- STAGE 1: CUSTOMER LIST ---
                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px 4px' }}>
                        {isLoadingCustomers ? (
                            <>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <CustomerSkeleton key={i} />
                                ))}
                            </>
                        ) : customers.length === 0 ? (
                            <NoDataFoundAnimation title="No Customers" message="No customers found with actionable orders." />
                        ) : (
                            customers.map((customer) => (
                                <button
                                    key={customer.cust_nbr}
                                    onClick={() => handleCustomerSelect(customer)}
                                    className="group"
                                    style={{
                                        width: '100%',
                                        marginBottom: '10px',
                                        background: 'white',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textAlign: 'left',
                                        height: '70px',
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = '#4B686C';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 104, 108, 0.1)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: 42, height: 42,
                                            borderRadius: '10px',
                                            background: '#f0f9fa',
                                            color: '#4B686C',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '15px', fontWeight: 700
                                        }}>
                                            {getAvatarLetter(customer.cust_name)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                                                {customer.cust_name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>
                                                    {customer.cust_nbr}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#4B686C' }}>{customer.booking_count}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Bookings</div>
                                        </div>
                                        <ArrowRight size={18} className="text-slate-300 group-hover:text-teal-600 transition-colors" />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                ) : !selectedBookingId ? (
                    // --- STAGE 2: BOOKING LIST ---
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Search Bar */}
                        <div style={{ padding: '0 8px 12px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Search bookings..."
                                    value={bookingSearchText}
                                    onChange={(e) => setBookingSearchText(e.target.value)}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 12px 10px 36px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        outline: 'none',
                                        fontSize: '14px',
                                        background: '#f8fafc',
                                        color: '#334155'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Booking List */}
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 4px' }}>
                            {isLoadingBookings ? (
                                <>
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <BookingSkeleton key={i} />
                                    ))}
                                </>
                            ) : bookings.length === 0 ? (
                                <NoDataFoundAnimation message="No bookings found." />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {bookings.map((booking) => {
                                        const isExpanded = expandedBookingId === booking.booking_id;
                                        return (
                                            <div key={booking.booking_id} style={{
                                                background: 'white',
                                                borderRadius: '12px',
                                                border: isExpanded ? '1px solid #4B686C' : '1px solid #e2e8f0',

                                                overflow: 'hidden',
                                                transition: 'all 0.2s ease',
                                                boxShadow: isExpanded ? '0 4px 12px rgba(75, 104, 108, 0.1)' : '0 1px 2px rgba(0,0,0,0.05)'
                                            }}>
                                                {/* Booking Header (Click to Expand) */}
                                                <button
                                                    onClick={() => setExpandedBookingId(prev => prev === booking.booking_id ? null : booking.booking_id)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '16px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                                        textAlign: 'left',
                                                        height: '64px',
                                                        boxSizing: 'border-box'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                                                            {booking.booking_id}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            {booking.types.length} Types &bull; {booking.types.reduce((acc, t) => acc + t.total, 0)} Containers
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        transition: 'transform 0.2s',
                                                        color: isExpanded ? '#4B686C' : '#94a3b8'
                                                    }}>
                                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </div>
                                                </button>

                                                {/* Expanded Content (Container Types) */}
                                                {isExpanded && (
                                                    <div style={{
                                                        padding: '12px 16px 16px 16px',
                                                        animation: 'fadeIn 0.2s ease-out'
                                                    }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {booking.types.map((stat) => (
                                                                <button
                                                                    key={`${booking.booking_id}-${stat.type}`}
                                                                    onClick={() => handleTypeSelect(booking.booking_id, stat.type)}
                                                                    style={{
                                                                        flex: 1,
                                                                        minWidth: '100px',
                                                                        padding: '8px 12px',
                                                                        borderRadius: '8px',
                                                                        background: '#f1f5f9',
                                                                        border: '1px solid #e2e8f0',
                                                                        textAlign: 'left',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s',
                                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#4B686C'}
                                                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                                                >
                                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                                                        {stat.type}
                                                                    </span>
                                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                        {(stat.reserved || 0)} / {stat.total}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {isFetchingNextPage && (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                                            <Loader2 className="animate-spin text-slate-400" size={16} />
                                        </div>
                                    )}
                                    <div ref={observerTarget} style={{ height: '20px' }} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // --- STAGE 3: CONTAINER SELECTION ---
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Content Area */}
                        <div style={{ flex: 1, paddingBottom: '16px' }}>
                            {isLoadingContainers ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                    gap: '10px',
                                    padding: '4px 16px 16px 16px'
                                }}>
                                    {Array.from({ length: 20 }).map((_, i) => (
                                        <ContainerSkeleton key={i} type={activeTab as 'available' | 'reserved'} />
                                    ))}
                                </div>
                            ) : activeTab === 'available' ? (
                                // AVAILABLE CONTAINERS
                                filteredAvailable.length === 0 ? (
                                    <NoDataFoundAnimation message="No available containers found." />
                                ) : (
                                    <VirtuosoGrid
                                        style={{ height: '100%' }}
                                        totalCount={filteredAvailable.length}
                                        overscan={200}
                                        components={{
                                            List: ({ style, children, ...props }: any) => (
                                                <div
                                                    style={{
                                                        ...style,
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                                        gap: '10px',
                                                        padding: '4px 16px 16px 16px',
                                                        alignContent: 'start'
                                                    }}
                                                    {...props}
                                                >
                                                    {children}
                                                </div>
                                            )
                                        }}
                                        itemContent={(index) => {
                                            const container = filteredAvailable[index];
                                            return (
                                                <ContainerCard
                                                    container={container}
                                                    isSelected={selectedAvailableIds.has(container.id)}
                                                    type="available"
                                                    onClick={handleToggleSelection}
                                                />
                                            );
                                        }}
                                    />
                                )
                            ) : (
                                // RESERVED CONTAINERS
                                filteredReserved.length === 0 ? (
                                    <NoDataFoundAnimation message="No reserved containers." />
                                ) : (
                                    <VirtuosoGrid
                                        style={{ height: '100%' }}
                                        totalCount={filteredReserved.length}
                                        overscan={200}
                                        components={{
                                            List: ({ style, children, ...props }: any) => (
                                                <div
                                                    style={{
                                                        ...style,
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                                        gap: '10px',
                                                        padding: '4px 16px 16px 16px',
                                                        alignContent: 'start'
                                                    }}
                                                    {...props}
                                                >
                                                    {children}
                                                </div>
                                            )
                                        }}
                                        itemContent={(index) => {
                                            const container = filteredReserved[index];
                                            return (
                                                <ContainerCard
                                                    container={container}
                                                    isSelected={selectedReservedIds.has(container.id)}
                                                    type="reserved"
                                                    onClick={handleToggleSelection}
                                                />
                                            );
                                        }}
                                    />
                                )
                            )}
                        </div>
                    </div>
                )}
            </PanelLayout>
        </>
    );
}
