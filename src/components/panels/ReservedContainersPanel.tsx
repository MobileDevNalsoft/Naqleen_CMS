import { useRef, useState, useEffect } from 'react';
import { X, ChevronDown, Box, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useCustomersAndBookingsQuery, useReservedContainersQuery } from '../../api';
import { useStore } from '../../store/store';

interface ReservedContainersPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReservedContainersPanel({ isOpen, onClose }: ReservedContainersPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const setHoverId = useStore(state => state.setHoverId);

    // -- State --
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSizeFilter, setSelectedSizeFilter] = useState<'20FT' | '40FT' | null>(null);

    // -- Data Fetching --
    const {
        data: customers = [],
        isLoading: isLoadingCustomers
    } = useCustomersAndBookingsQuery(isOpen);

    const {
        data: reservedContainers = [],
        isLoading: isLoadingContainers
    } = useReservedContainersQuery(selectedBooking);

    // -- Derived State --
    const totalCount = reservedContainers.length;
    const count20ft = reservedContainers.filter(c => c.container_type === '20FT').length;
    const count40ft = reservedContainers.filter(c => c.container_type !== '20FT').length; // Assuming anything not 20FT is 40FT for now, or check explicit '40FT'

    const filteredContainers = reservedContainers.filter(c => {
        const matchesSearch = c.container_nbr ? c.container_nbr.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const matchesType = selectedSizeFilter ? (
            selectedSizeFilter === '20FT' ? c.container_type === '20FT' : c.container_type !== '20FT'
        ) : true;
        return matchesSearch && matchesType;
    });
    const matchCount = filteredContainers.length;

    // -- Effects --
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            // When closing, reset camera if it was visible (to avoid triggering on initial load if closed)
            if (isVisible) {
                window.dispatchEvent(new CustomEvent('resetCameraToInitial'));
            }
            const timer = setTimeout(() => setIsVisible(false), 400); // Wait for transition
            return () => clearTimeout(timer);
        }
    }, [isOpen, isVisible]);

    // -- Handlers --
    const toggleCustomer = (customerName: string) => {
        setExpandedCustomer(current => current === customerName ? null : customerName);
    };

    const handleBookingSelect = (bookingId: string) => {
        setSelectedBooking(bookingId);
    };

    const clearSelection = () => {
        setSelectedBooking(null);
        setSearchTerm('');
        setSelectedSizeFilter(null);
    };

    const handlePanelClose = () => {
        setSelectedBooking(null);
        setSearchTerm('');
        setSelectedSizeFilter(null);
        onClose();
    };

    const getAvatarLetter = (name: string) => name.charAt(0).toUpperCase();

    if (!isVisible && !isOpen) return null;

    return (
        <>
            <style>{`
                @keyframes slideInRightPanel {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideInLeft { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(75, 104, 108, 0.3);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(75, 104, 108, 0.5);
                }
            `}</style>

            <div
                ref={panelRef}
                style={{
                    position: 'fixed',
                    top: '90px',
                    right: '24px',
                    width: '380px',
                    maxHeight: 'calc(100vh - 114px)',
                    backgroundColor: 'rgba(253, 246, 235, 0.95)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    borderRadius: '24px',
                    border: '1px solid rgba(75, 104, 108, 0.1)',
                    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0,0,0,0.05)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                    transform: isOpen ? 'translateX(0)' : 'translateX(420px)',
                    opacity: isOpen ? 1 : 0,
                    overflow: 'hidden'
                }}
            >
                {/* Header Section */}
                <div style={{
                    padding: '16px 24px 12px',
                    background: '#4B686C',
                    position: 'relative',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
                    zIndex: 10,
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ paddingTop: '4px' }}>
                            {selectedBooking && (
                                <div style={{
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.6)',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span>{customers.find(c => c.bookings.includes(selectedBooking))?.customer_name || 'Client'}</span>
                                    <span style={{ fontSize: '8px', opacity: 0.5 }}>▶</span>
                                </div>
                            )}
                            <h2 style={{
                                fontSize: '24px',
                                fontWeight: 800,
                                margin: 0,
                                background: 'white',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textTransform: 'uppercase',
                                letterSpacing: '-0.5px',
                                lineHeight: '1.1'
                            }}>
                                {selectedBooking ? selectedBooking : 'Reserved Units'}
                            </h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                {selectedBooking ? `Booking Detail View • ${totalCount} Units` : 'Client Bookings Overview'}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {selectedBooking && (
                                <button
                                    onClick={clearSelection}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        minWidth: '36px',
                                        minHeight: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        transition: 'all 0.2s',
                                        padding: 0,
                                        margin: 0
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                        e.currentTarget.style.color = 'white';
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    title="Back to List"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            <button
                                onClick={handlePanelClose}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    minWidth: '36px',
                                    minHeight: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    transition: 'all 0.2s',
                                    padding: 0,
                                    margin: 0
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar">

                    {selectedBooking ? (
                        // --- DETAIL VIEW (Container List) ---
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'slideInRight 0.3s ease' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <input
                                    type="text"
                                    placeholder="Search container ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0,0,0,0.15)',
                                        background: 'rgba(255,255,255,0.8)',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = '#4B686C'; e.target.style.boxShadow = '0 0 0 3px rgba(75, 104, 108, 0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                                />

                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    {[
                                        { label: '20FT', count: count20ft, value: '20FT' },
                                        { label: '40FT', count: count40ft, value: '40FT' }
                                    ].map((tab) => {
                                        const isActive = selectedSizeFilter === tab.value;
                                        return (
                                            <button
                                                key={tab.value}
                                                onClick={() => setSelectedSizeFilter(isActive ? null : tab.value as any)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${isActive ? '#4B686C' : 'rgba(0,0,0,0.15)'}`,
                                                    background: isActive ? '#4B686C' : 'white',
                                                    color: isActive ? 'white' : '#64748b',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span>{tab.label}</span>
                                                <span style={{
                                                    background: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px'
                                                }}>
                                                    {tab.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{
                                marginBottom: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>Filtered Results ({matchCount})</span>
                                {isLoadingContainers && <div className="spinner" style={{ width: 14, height: 14, border: '2px solid #cbd5e1', borderRadius: '50%', borderTopColor: '#4B686C', animation: 'spin 1s linear infinite' }} />}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                                {filteredContainers.map((container) => (
                                    <div
                                        key={container.container_nbr}
                                        style={{
                                            padding: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'white',
                                            border: '1px solid rgba(0,0,0,0.15)',
                                            borderRadius: '8px',
                                            color: '#334155',
                                            textAlign: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            cursor: 'default',
                                            transition: 'transform 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.borderColor = '#facc15';
                                            setHoverId(container.container_nbr, 'panel');
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)';
                                            setHoverId(null);
                                        }}
                                    >
                                        <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace' }}>
                                            {container.container_nbr}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                                            {container.container_type}
                                        </div>
                                    </div>
                                ))}

                                {!isLoadingContainers && filteredContainers.length === 0 && (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                        <Box size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                        <div style={{ fontSize: '13px', fontWeight: 500 }}>No containers found</div>
                                        <div style={{ fontSize: '11px', marginTop: '4px' }}>{searchTerm ? 'Try a different search term' : 'This booking has no reserved units'}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // --- LIST VIEW (Customers) ---
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'slideInLeft 0.3s ease' }}>
                            {isLoadingCustomers ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} style={{ height: '72px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)', animation: 'pulse 1.5s infinite' }} />
                                ))
                            ) : (
                                customers.map((customer) => {
                                    const isExpanded = expandedCustomer === customer.customer_name;
                                    return (
                                        <div
                                            key={customer.customer_name}
                                            style={{
                                                background: 'white',
                                                borderRadius: '12px',
                                                border: isExpanded ? '1px solid #4B686C' : '1px solid rgba(0,0,0,0.15)',
                                                boxShadow: isExpanded ? '0 8px 20px rgba(75, 104, 108, 0.15)' : '0 2px 4px rgba(0,0,0,0.05)',
                                                overflow: 'hidden',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            <div
                                                onClick={() => toggleCustomer(customer.customer_name)}
                                                style={{
                                                    padding: '16px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    background: isExpanded ? 'rgba(75, 104, 108, 0.04)' : 'transparent',
                                                }}
                                            >
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '10px',
                                                    background: isExpanded ? '#4B686C' : '#F1F5F9',
                                                    color: isExpanded ? 'white' : '#64748b',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '16px',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    {getAvatarLetter(customer.customer_name)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                                        {customer.customer_name}
                                                    </h3>
                                                    <span style={{ fontSize: '11px', color: isExpanded ? '#4B686C' : '#94a3b8', fontWeight: 500 }}>
                                                        {customer.bookings.length} Bookings
                                                    </span>
                                                </div>
                                                <ChevronDown size={18} color="#cbd5e1" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                                            </div>

                                            {isExpanded && (
                                                <div style={{ padding: '0 16px 16px 16px', animation: 'fadeIn 0.3s ease' }}>
                                                    <div style={{ height: '1px', background: 'rgba(0,0,0,0.04)', marginBottom: '12px', width: '100%' }} />
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                        {customer.bookings.map(bookingId => (
                                                            <button
                                                                key={bookingId}
                                                                onClick={() => handleBookingSelect(bookingId)}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
                                                                    borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: '#F8FAFC',
                                                                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                                                                }}
                                                                onMouseEnter={e => {
                                                                    e.currentTarget.style.borderColor = '#4B686C';
                                                                    e.currentTarget.style.background = 'white';
                                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                                                }}
                                                                onMouseLeave={e => {
                                                                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                                                                    e.currentTarget.style.background = '#F8FAFC';
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                }}
                                                            >
                                                                <Box size={14} color="#64748b" style={{ minWidth: 14 }} />
                                                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bookingId}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Status Bar if needed, or just padding */}
            {selectedBooking && !isLoadingContainers && (
                <div style={{
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.5)',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}>
                    <CheckCircle2 size={14} color="#4B686C" />
                    <span style={{ fontSize: '11px', color: '#4B686C', fontWeight: 600 }}>Visualization Active</span>
                </div>
            )}
        </>
    );
}
