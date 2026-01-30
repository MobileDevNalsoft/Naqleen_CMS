import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, AlertTriangle, ArrowLeft, FileText, Ship, Loader2 } from 'lucide-react';
import { useStore } from '../../../store/store';
import { useUIStore } from '../../../store/uiStore';
import { getContainerDetails } from '../../../api';
import { useQuery } from '@tanstack/react-query';
import { useInvalidContainersQuery } from '../../../api/handlers/invalidContainersApi';
import ContainerLoader from '../../ui/animations/ContainerLoader';
import type { InvalidContainer } from '../../../api/types/containerTypes';

// Helper Components
const DetailSection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B686C', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {icon} {title}
        </div>
        {children}
    </div>
);

const InfoItem = ({ label, value, fullWidth }: { label: string, value: string, fullWidth?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: fullWidth ? 'span 2' : 'span 1' }}>
        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>{label}</div>
        <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: 500 }}>{value}</div>
    </div>
);

// Sub-component for Detail View (Read-only, no actions)
const InvalidContainerDetailView = ({
    containerId
}: {
    containerId: string
}) => {
    // Fetch details on demand using existing API
    const { data: containerDetails, isLoading } = useQuery({
        queryKey: ['container-details', containerId],
        queryFn: async () => {
            return getContainerDetails(containerId);
        },
        enabled: !!containerId,
        staleTime: 60000
    });

    if (isLoading) return <ContainerLoader />;
    if (!containerDetails) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#64748b' }}>
                Details not found.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', padding: '24px' }} className="custom-scrollbar">

            {/* Customer Information */}
            <DetailSection title="Customer Information" icon={<FileText size={16} />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <InfoItem label="Customer Name" value={containerDetails.customer_name || 'N/A'} fullWidth />
                    <InfoItem label="Booking Number" value={containerDetails.booking_id || 'N/A'} />
                    <InfoItem label="Container Type" value={containerDetails.container_type || 'N/A'} />
                </div>
            </DetailSection>

            {/* Divider */}
            <div style={{ height: '2px', background: 'linear-gradient(90deg, rgba(75, 104, 108, 0.2) 0%, rgba(75, 104, 108, 0.05) 50%, transparent 100%)', margin: '4px 0' }} />

            {/* Shipment Details */}
            <DetailSection title="Shipment Details" icon={<Ship size={16} />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <InfoItem label="Shipment No" value={containerDetails.inbound_shipment_nbr || 'N/A'} />
                    <InfoItem label="Order Number" value={containerDetails.inbound_order_nbr || 'N/A'} />
                    <InfoItem label="Request Type" value={containerDetails.shipment_name || 'N/A'} />
                    <InfoItem label="Stored Time" value={containerDetails.container_stored_time || 'N/A'} />
                </div>
            </DetailSection>

            {/* Warning Banner */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                marginTop: '8px'
            }}>
                <AlertTriangle size={20} color="#F59E0B" />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400e' }}>Invalid Position</div>
                    <div style={{ fontSize: '12px', color: '#78350f', opacity: 0.8 }}>
                        This container has no assigned position in the yard.
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-component for List View with infinite scroll
const InvalidContainerListView = ({
    containers,
    onSelect,
    onLoadMore,
    hasNextPage,
    isFetchingNextPage
}: {
    containers: InvalidContainer[],
    onSelect: (id: string) => void,
    onLoadMore: () => void,
    hasNextPage: boolean,
    isFetchingNextPage: boolean
}) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Infinite scroll handler
    const handleScroll = useCallback(() => {
        const list = listRef.current;
        if (!list || isFetchingNextPage || !hasNextPage) return;

        const { scrollTop, scrollHeight, clientHeight } = list;
        // Load more when user scrolls to 80% of the list
        if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            onLoadMore();
        }
    }, [hasNextPage, isFetchingNextPage, onLoadMore]);

    return (
        <div
            ref={listRef}
            onScroll={handleScroll}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '24px', overflowY: 'auto', flex: 1 }}
            className="custom-scrollbar"
        >
            {containers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <AlertTriangle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>No invalid containers found.</div>
                </div>
            ) : (
                <>
                    {containers.map((container) => {
                        // Format type code
                        const typeCode = container.container_type
                            ?.replace('ft Standard', 'GP')
                            .replace('ft High Cube', 'HC')
                            .replace('ft Reefer', 'RT') || 'N/A';

                        return (
                            <div
                                key={container.container_nbr}
                                onClick={() => onSelect(container.container_nbr)}
                                style={{
                                    padding: '12px 16px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                                }}
                            >
                                {/* Warning Color Indicator */}
                                <div style={{ width: '4px', height: '32px', borderRadius: '4px', background: '#F59E0B' }} />

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{container.container_nbr}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{container.customer_name || 'Unknown Customer'}</div>
                                </div>

                                {/* Type Code on Right */}
                                <div style={{
                                    fontSize: '13px', fontWeight: 700,
                                    color: '#64748b'
                                }}>
                                    {typeCode}
                                </div>
                            </div>
                        );
                    })}

                    {/* Loading indicator for infinite scroll */}
                    {isFetchingNextPage && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                            <Loader2 size={20} className="animate-spin" style={{ color: '#4B686C' }} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default function InvalidContainersPanel() {
    const selectedBlock = useStore(state => state.selectedBlock);
    const setSelectedBlock = useStore(state => state.setSelectedBlock);

    // Local state for visibility and navigation
    const [isVisible, setIsVisible] = useState(false);
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

    // Global panel control
    const activePanel = useUIStore(state => state.activePanel);

    // Fetch invalid containers with infinite query
    const {
        data,
        isLoading,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage
    } = useInvalidContainersQuery();

    // Flatten pages into single array
    const allContainers = data?.pages.flatMap(page => page.data) || [];

    // Identify if the selected block is the invalid containers area
    const isInvalidContainersArea = selectedBlock === 'invalid_containers';

    useEffect(() => {
        // Show panel only if invalid containers area is selected AND no action panel is open
        if (isInvalidContainersArea && !activePanel) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
            if (!isInvalidContainersArea) {
                setSelectedContainerId(null);
            }
        }
    }, [isInvalidContainersArea, activePanel]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setSelectedBlock(null);
            setSelectedContainerId(null);
        }, 300);
    };

    if (!isInvalidContainersArea && !isVisible) return null;

    return (
        <div
            className={`invalid-containers-panel ${isVisible ? 'visible' : ''}`}
            style={{
                position: 'fixed',
                top: '90px',
                right: '24px',
                width: '400px',
                maxHeight: 'calc(100vh - 114px)',
                backgroundColor: 'rgba(253, 246, 235, 0.95)',
                backdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: '24px',
                border: '1px solid rgba(75, 104, 108, 0.1)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0,0,0,0.05)',
                zIndex: 1000,
                color: '#1e293b',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                transform: isVisible ? 'translateX(0)' : 'translateX(420px)',
                opacity: isVisible ? 1 : 0,
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '20px 24px 16px',
                background: '#FEF3C7', // Pastel Amber 100
                position: 'relative',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                zIndex: 10,
                borderBottom: '1px solid rgba(245, 158, 11, 0.1)'
            }}>
                {/* Back Button (Only in Detail View) */}
                {selectedContainerId ? (
                    <div
                        onClick={() => setSelectedContainerId(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', opacity: 1 }}
                    >
                        <ArrowLeft size={16} color="#B45309" />
                        <span style={{ fontSize: '12px', color: '#B45309', fontWeight: 600, textTransform: 'uppercase' }}>
                            Back to List
                        </span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 1 }}>
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: 'rgba(245, 158, 11, 0.15)', // Darker amber bg for icon
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <AlertTriangle size={12} color="#B45309" />
                        </div>
                        <span style={{ fontSize: '12px', color: '#B45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Yard Management
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        margin: 0,
                        color: '#92400E', // Dark Amber
                        textTransform: 'uppercase',
                        letterSpacing: '-0.5px'
                    }}>
                        {selectedContainerId ? selectedContainerId : 'Invalid Containers'}
                    </h2>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.5)',
                            border: '1px solid rgba(180, 83, 9, 0.1)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#92400E',
                            transition: 'all 0.2s',
                            padding: 0
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <ContainerLoader />
            ) : selectedContainerId ? (
                <InvalidContainerDetailView
                    containerId={selectedContainerId}
                />
            ) : (
                <InvalidContainerListView
                    containers={allContainers}
                    onSelect={setSelectedContainerId}
                    onLoadMore={fetchNextPage}
                    hasNextPage={!!hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                />
            )}
        </div>
    );
}
