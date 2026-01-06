import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, ArrowLeft, FileText, Ship, MapPin, LogOut, Loader2 } from 'lucide-react';
import { useStore } from '../../../store/store';
import { useUIStore } from '../../../store/uiStore';
import { getContainerDetails } from '../../../api';
import { useQuery, useMutation } from '@tanstack/react-query';
import ContainerLoader from '../../ui/animations/ContainerLoader';
import { submitReleaseContainer } from '../../../api/handlers/releaseContainerApi';
import { showToast } from '../../ui/custom-components/Toast';

// Helper Components (Copied/Adapted from ContainerDetailsPanel for consistency)
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

const ActionButton = ({ icon, label, primary, danger, onClick, disabled }: { icon: React.ReactNode, label: string, primary?: boolean, danger?: boolean, onClick?: () => void, disabled?: boolean }) => {
    let bg = 'white';
    let color = '#1e293b';
    let border = '1px solid rgba(0, 0, 0, 0.1)';

    if (primary) {
        bg = 'linear-gradient(135deg, #4B686C 0%, #2C3E50 100%)'; // Primary Gradient
        border = 'none';
        color = 'white';
    } else if (danger) {
        bg = 'rgba(239, 68, 68, 0.1)';
        color = '#ef4444';
        border = '1px solid rgba(239, 68, 68, 0.2)';
    }

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '12px',
                background: bg,
                color: color,
                border: border,
                fontSize: '13px',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: primary ? '0 4px 12px rgba(75, 104, 108, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => {
                if (disabled) return;
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
                if (disabled) return;
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {icon}
            {label}
        </button>
    );
};

export default function CFSDetailsPanel() {
    const selectedBlock = useStore(state => state.selectedBlock);
    const setSelectedBlock = useStore(state => state.setSelectedBlock);
    const layout = useStore(state => state.layout);

    const cfsContainers = useStore(state => state.cfsContainers);

    // Local state for visibility and navigation
    const [isVisible, setIsVisible] = useState(false);
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

    // Global panel control
    const openPanel = useUIStore(state => state.openPanel);
    const activePanel = useUIStore(state => state.activePanel);

    // Identify if the selected block is a CFS Area
    const isCFSArea = selectedBlock?.startsWith('cfs_area');

    // Find CFS Area details from layout
    const cfsArea = React.useMemo(() => {
        if (!isCFSArea || !layout?.entities) return null;
        return layout.entities.find(e => e.id === selectedBlock);
    }, [isCFSArea, layout, selectedBlock]);

    useEffect(() => {
        // Show CFS panel only if a CFS area is selected AND no action panel is open
        if (isCFSArea && cfsArea && !activePanel) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
            if (!isCFSArea) {
                setSelectedContainerId(null); // Reset detail view on close
            }
        }
    }, [isCFSArea, cfsArea, activePanel]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setSelectedBlock(null);
            setSelectedContainerId(null);
        }, 300);
    };

    // Fetch details on demand
    const { data: containerDetails, isLoading } = useQuery({
        queryKey: ['container-details', selectedContainerId],
        queryFn: async () => {
            if (!selectedContainerId) return null;
            return getContainerDetails(selectedContainerId);
        },
        enabled: !!selectedContainerId,
        staleTime: 60000 // Cache for 1 min
    });

    // Release CFS Container mutation
    const removeCfsContainer = useStore(state => state.removeCfsContainer);

    const { mutate: releaseContainer, isPending: isReleasing } = useMutation({
        mutationFn: submitReleaseContainer,
        onSuccess: (result) => {
            if (result.success) {
                showToast('success', 'Container released successfully');
                // Remove from CFS list in store
                if (selectedContainerId) {
                    removeCfsContainer(selectedContainerId);
                }
                // Return to list view
                setSelectedContainerId(null);
            } else {
                showToast('error', result.message || 'Failed to release container');
            }
        },
        onError: (error: any) => {
            showToast('error', error?.message || 'An error occurred while releasing container');
        }
    });

    const handleRelease = () => {
        if (!selectedContainerId || !containerDetails) return;

        const request = {
            truckNbr: '',
            bookingNbr: containerDetails.booking_id || '',
            orderType: 'RELEASE_CFS',
            customerNbr: '',
            customerName: containerDetails.customer_name || '',
            orderNbr: containerDetails.inbound_order_nbr || '',
            containers: [{
                containerNbr: selectedContainerId,
                containerType: containerDetails.container_type || '',
                shipmentNbr: containerDetails.inbound_shipment_nbr || '',
                position: ''
            }]
        };

        console.log('[CFS Release] Submitting:', request);
        releaseContainer(request);
    };

    if (!isCFSArea && !isVisible) return null;
    if (!cfsArea && !isVisible) return null;

    return (
        <div
            className={`cfs-details-panel ${isVisible ? 'visible' : ''}`}
            style={{
                position: 'fixed',
                top: '90px',
                right: '24px',
                width: '400px',
                maxHeight: 'calc(100vh - 114px)',
                backgroundColor: 'rgba(253, 246, 235, 0.95)', // Premium Cream
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
                background: '#4B686C', // Primary Teal
                position: 'relative',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                zIndex: 10
            }}>
                {/* Back Button (Only in Detail View) */}
                {selectedContainerId ? (
                    <div
                        onClick={() => setSelectedContainerId(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', opacity: 0.9 }}
                    >
                        <ArrowLeft size={16} color="white" />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 600, textTransform: 'uppercase' }}>
                            Back to List
                        </span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.9 }}>
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ShieldCheck size={12} color="white" />
                        </div>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 600, textTransform: 'uppercase' }}>
                            CFS Operations
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        margin: 0,
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '-0.5px'
                    }}>
                        {selectedContainerId ? selectedContainerId : ((cfsArea as any)?.name || 'CFS Area')}
                    </h2>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            transition: 'all 0.2s',
                            padding: 0
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content Switcher */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">

                {selectedContainerId ? (
                    // --- DETAIL VIEW ---
                    isLoading ? (
                        <ContainerLoader />
                    ) : !containerDetails ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#64748b' }}>
                            Details not found.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                            {/* Customer Information */}
                            <DetailSection title="Customer Information" icon={<FileText size={16} />}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <InfoItem label="Customer Name" value={containerDetails.customer_name || 'N/A'} fullWidth />
                                    <InfoItem label="Booking Number" value={containerDetails.booking_id || 'N/A'} />
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
                                </div>
                            </DetailSection>

                        </div>
                    )
                ) : (
                    // --- LIST VIEW ---
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {cfsContainers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                No containers found in CFS Area.
                            </div>
                        ) : (
                            cfsContainers.map((container) => {
                                // Format type code (e.g. 40ft Standard -> 40GP)
                                const typeCode = container.type
                                    .replace('ft Standard', 'GP')
                                    .replace('ft High Cube', 'HC')
                                    .replace('ft Reefer', 'RT');

                                // Basic color logic based on type/status logic
                                const containerColor = container.type.includes('40') ? '#00695C' : '#1A237E';

                                return (
                                    <div
                                        key={container.id}
                                        onClick={() => setSelectedContainerId(container.id)}
                                        style={{
                                            padding: '12px 16px',
                                            background: 'white',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(0, 0, 0, 0.05)',
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
                                        {/* Color Indicator */}
                                        <div style={{ width: '4px', height: '32px', borderRadius: '4px', background: containerColor }} />

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{container.id}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>{container.customerName}</div>
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
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Footer (Only in Detail View) */}
            {selectedContainerId && !isLoading && containerDetails && (
                <div style={{
                    padding: '20px 24px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    gap: '12px',
                    background: 'linear-gradient(135deg, rgba(247, 207, 155, 0.25) 0%, rgba(247, 207, 155, 0.15) 100%)',
                    backdropFilter: 'blur(16px)',
                }}>
                    <ActionButton
                        icon={<MapPin size={16} />}
                        label="Position"
                        primary
                        onClick={() => {
                            // Close CFS panel and open Position panel via global state
                            openPanel('cfsPosition', {
                                containerNbr: selectedContainerId || '',
                                containerType: containerDetails.container_type || '20GP',
                                shipmentNbr: containerDetails.inbound_shipment_nbr || ''
                            });
                        }}
                    />
                    <ActionButton
                        icon={isReleasing ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                        label={isReleasing ? "Releasing..." : "Release"}
                        danger
                        onClick={handleRelease}
                        disabled={isReleasing}
                    />
                </div>
            )}
        </div>
    );
}
