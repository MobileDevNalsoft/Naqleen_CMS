import React, { useEffect, useState } from 'react';
import { X, ArrowLeft, FileText, Ship, MapPin, Search } from 'lucide-react';
import { useStore } from '../../../store/store';
import { useUIStore } from '../../../store/uiStore';
import { getContainerDetails } from '../apis/containerApi';
import { useQuery } from '@tanstack/react-query';
import ContainerLoader from '../../../components/ui/feedback/containers/ContainerLoader';


import PanelLayout from '../../shared/components/PanelLayout';
import { theme } from '../../../themes/theme';
import ContainerEmptyState from '../../../components/ui/feedback/containers/ContainerEmptyState';

// Helper Components (Copied/Adapted from ContainerDetailsPanel for consistency)
const DetailSection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {icon} {title}
        </div>
        {children}
    </div>
);

const InfoItem = ({ label, value, fullWidth }: { label: string, value: string, fullWidth?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: fullWidth ? 'span 2' : 'span 1' }}>
        <div style={{ color: theme.colors.text.secondary, fontSize: '11px', fontWeight: 500 }}>{label}</div>
        <div style={{ color: theme.colors.text.primary, fontSize: '14px', fontWeight: 500 }}>{value}</div>
    </div>
);

const ActionButton = ({ icon, label, primary, danger, onClick, disabled }: { icon: React.ReactNode, label: string, primary?: boolean, danger?: boolean, onClick?: () => void, disabled?: boolean }) => {
    let bg = 'white';
    let color = '#1e293b';
    let border = '1px solid rgba(0, 0, 0, 0.1)';

    if (primary) {
        bg = theme.gradients.primary; // Primary Gradient
        border = 'none';
        color = 'white';
    } else if (danger) {
        bg = 'rgba(239, 68, 68, 0.1)';
        color = theme.colors.error;
        border = `1px solid ${theme.colors.error}33`; // 20% opacity
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

// Sub-component for Detail View
const CFSDetailView = ({
    containerDetails
}: {
    containerDetails: any
}) => {
    if (!containerDetails) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: theme.colors.text.secondary }}>
                Details not found.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
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
    );
};

// Sub-component for List View
const CFSListView = ({
    cfsContainers,
    onSelect,
    searchTerm
}: {
    cfsContainers: any[],
    onSelect: (id: string) => void,
    searchTerm: string
}) => {
    // If no containers found
    if (cfsContainers.length === 0) {
        if (searchTerm) {
            return (
                <ContainerEmptyState
                    title="No Search Results"
                    message={`No containers found matching "${searchTerm}"`}
                    height="100%"
                />
            );
        }
        return (
            <ContainerEmptyState
                title="No Containers"
                message="No containers found in CFS Area."
                height="100%"
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {cfsContainers.map((container) => {
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
                        onClick={() => onSelect(container.id)}
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
                            <div style={{ fontWeight: 700, fontSize: '13px', color: theme.colors.text.primary }}>{container.id}</div>
                            <div style={{ fontSize: '11px', color: theme.colors.text.secondary }}>{container.customerName}</div>
                        </div>

                        {/* Type Code on Right */}
                        <div style={{
                            fontSize: '13px', fontWeight: 700,
                            color: theme.colors.text.secondary
                        }}>
                            {typeCode}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const CFSDetailsPanel = () => {
    const selectedBlock = useStore(state => state.selectedBlock);
    const setSelectedBlock = useStore(state => state.setSelectedBlock);
    const layout = useStore(state => state.layout);

    const cfsContainers = useStore(state => state.cfsContainers);

    // Local state for navigation
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter containers based on search
    const filteredContainers = React.useMemo(() => {
        if (!searchTerm) return cfsContainers;
        const lowerTerm = searchTerm.toLowerCase();
        return cfsContainers.filter(c =>
            c.id.toLowerCase().includes(lowerTerm) ||
            (c.customerName && c.customerName.toLowerCase().includes(lowerTerm))
        );
    }, [cfsContainers, searchTerm]);

    // Global panel control
    const activePanel = useUIStore(state => state.activePanel);
    const openPanel = useUIStore(state => state.openPanel);

    // The CFS zone is named per site: 'cfs_area_1' in Jeddah, 'cfs_area' in Dammam.
    // Its siblings are deliberately excluded -- 'invalid_containers' belongs to
    // InvalidContainersPanel and 'leased_area' to LeasedContainersPanel, so a
    // startsWith('cfs_') test would hijack neither, but an id list states it plainly.
    const isCFSArea = selectedBlock === 'cfs_area_1' || selectedBlock === 'cfs_area';

    // Find CFS Area details from layout
    const cfsArea = React.useMemo(() => {
        if (!isCFSArea || !layout?.entities) return null;
        return layout.entities.find(e => e.id === selectedBlock);
    }, [isCFSArea, layout, selectedBlock]);

    // Fetch details on demand when selected
    const { data: containerDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['container-details', selectedContainerId],
        queryFn: async () => {
            if (!selectedContainerId) return null;
            return getContainerDetails(selectedContainerId);
        },
        enabled: !!selectedContainerId,
        staleTime: 60000
    });


    const handleClose = () => {
        setSelectedBlock(null);
        setSelectedContainerId(null);
    };

    // Calculate isOpen based on global state
    const isOpen = !!(isCFSArea && cfsArea && !activePanel);

    // Reset selection on close
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setSelectedContainerId(null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Prepare Footer Actions
    const isCrossStuffing = containerDetails?.shipment_name === 'CROSS_STUFFING';

    const footerActions = selectedContainerId && containerDetails ? (
        <>
            <ActionButton
                icon={<MapPin size={16} />}
                label={isCrossStuffing ? "Restack" : "Position"}
                primary
                onClick={() => {
                    openPanel('cfsPosition', {
                        containerNbr: selectedContainerId || '',
                        containerType: containerDetails.container_type || '20GP',
                        shipmentNbr: containerDetails.inbound_shipment_nbr || ''
                    });
                }}
            />

        </>
    ) : null;

    // Search Bar Component
    const SearchBar = (
        <div style={{
            padding: '16px 0 16px',
            position: 'relative',
        }}>
            <div style={{ position: 'relative' }}>
                <Search
                    size={16}
                    style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: theme.colors.primary,
                        opacity: 0.6
                    }}
                />
                <input
                    type="text"
                    placeholder="Search containers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 36px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: `1px solid ${theme.colors.primary}33`,
                        borderRadius: '10px',
                        color: theme.colors.text.primary,
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                        e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.primary}1a`;
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = `${theme.colors.primary}33`;
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                    }}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(75, 104, 108, 0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                        }}
                    >
                        <X size={12} color={theme.colors.primary} />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <PanelLayout
            isOpen={isOpen}
            onClose={handleClose}
            category="CFS OPERATIONS"
            title={
                !selectedContainerId ? (
                    ((cfsArea as any)?.name || 'CFS Area')
                ) : (
                    <div
                        onClick={() => setSelectedContainerId(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            transition: 'all 0.2s'
                        }}>
                            <ArrowLeft size={18} color="white" />
                        </div>
                        <span>{selectedContainerId}</span>
                    </div>
                )
            }
            width="400px"
            top="90px"
            footerActions={footerActions}
            tabsContent={!selectedContainerId ? SearchBar : null}
        >
            {selectedContainerId ? (
                isLoadingDetails ? (
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <ContainerLoader />
                    </div>
                ) : (
                    <CFSDetailView
                        containerDetails={containerDetails}
                    />
                )
            ) : (
                <CFSListView
                    cfsContainers={filteredContainers}
                    onSelect={setSelectedContainerId}
                    searchTerm={searchTerm}
                />
            )}
        </PanelLayout>
    );
}

export default CFSDetailsPanel;
