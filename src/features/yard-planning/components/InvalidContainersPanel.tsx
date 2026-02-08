import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, AlertTriangle, ArrowLeft, FileText, Ship, Loader2, MapPin, Search } from 'lucide-react';
import { useStore } from '../../../store/store';
import { useUIStore } from '../../../store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useInvalidContainersQuery } from '../apis/invalidContainersApi';
import ContainerLoader from '../../../components/ui/feedback/containers/ContainerLoader';
import type { InvalidContainer } from '../types/containerTypes';
import { getContainerDetails } from '../apis/containerApi';
import PanelLayout from '../../shared/components/PanelLayout';
import { theme } from '../../../themes/theme';
import ContainerEmptyState from '../../../components/ui/feedback/containers/ContainerEmptyState';
import ContainerErrorState from '../../../components/ui/feedback/containers/ContainerErrorState';

// Helper Components
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

// ActionButton Component (consistent with CFSDetailsPanel)
const ActionButton = ({ icon, label, primary, onClick, disabled }: { icon: React.ReactNode, label: string, primary?: boolean, onClick?: () => void, disabled?: boolean }) => {
    let bg = 'white';
    let color = '#1e293b';
    let border = '1px solid rgba(0, 0, 0, 0.1)';

    if (primary) {
        bg = theme.gradients.primary;
        border = 'none';
        color = 'white';
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

// Sub-component for Detail View (with positioning action)
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

    if (isLoading) return (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <ContainerLoader />
        </div>
    );
    if (!containerDetails) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: theme.colors.text.secondary }}>
                Details not found.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
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
                <AlertTriangle size={20} color={theme.colors.warning} />
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
    isFetchingNextPage,
    searchTerm
}: {
    containers: InvalidContainer[],
    onSelect: (id: string) => void,
    onLoadMore: () => void,
    hasNextPage: boolean,
    isFetchingNextPage: boolean,
    searchTerm: string
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
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}
            className="custom-scrollbar"
        >
            {containers.length === 0 ? (
                searchTerm ? (
                    <ContainerEmptyState
                        title="No Search Results"
                        message={`No invalid containers found matching "${searchTerm}"`}
                        height="100%"
                    />
                ) : (
                    <ContainerEmptyState
                        title="No Invalid Containers"
                        message="Great job! There are no invalid containers in the yard."
                        height="100%"
                    />
                )
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
                                <div style={{ width: '4px', height: '32px', borderRadius: '4px', background: theme.colors.warning }} />

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: theme.colors.text.primary }}>{container.container_nbr}</div>
                                    <div style={{ fontSize: '11px', color: theme.colors.text.secondary }}>{container.customer_name || 'Unknown Customer'}</div>
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
                            <Loader2 size={20} className="animate-spin" style={{ color: theme.colors.primary }} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const InvalidContainersPanel = () => {
    const selectedBlock = useStore(state => state.selectedBlock);
    const setSelectedBlock = useStore(state => state.setSelectedBlock);

    // Local state for navigation
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

    // Search state
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search - trigger API when length >= 3 or cleared
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput.length >= 3 || searchInput.length === 0) {
                setDebouncedSearch(searchInput);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Global panel control
    const activePanel = useUIStore(state => state.activePanel);
    const setSearchFocused = useUIStore(state => state.setSearchFocused);
    const openPanel = useUIStore(state => state.openPanel);

    // Fetch invalid containers with infinite query and search
    const {
        data,
        isLoading,
        isError,
        error,
        refetch,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage
    } = useInvalidContainersQuery(debouncedSearch || undefined);

    // Flatten pages into single array
    const allContainers = data?.pages.flatMap(page => page.data) || [];

    // Identify if the selected block is the invalid containers area
    const isInvalidContainersArea = selectedBlock === 'invalid_containers';

    // Cleanup search focus if panel becomes invisible
    // With PanelLayout this is handled on close/unmount or when not visible
    useEffect(() => {
        if (!isInvalidContainersArea) {
            setSearchFocused(false);
        }
    }, [isInvalidContainersArea, setSearchFocused]);

    const handleClose = () => {
        setSelectedBlock(null);
        setSelectedContainerId(null);
        setSearchInput('');
        setDebouncedSearch('');
    };

    // Calculate isOpen
    const isOpen = !!(isInvalidContainersArea && !activePanel);

    // Fetch details to use in footer logic (for container type shipment nbr etc)
    // We need this mostly for the "Assign Position" button parameters specific to the selected container
    const { data: containerDetails } = useQuery({
        queryKey: ['container-details', selectedContainerId],
        queryFn: async () => {
            if (!selectedContainerId) return null;
            return getContainerDetails(selectedContainerId);
        },
        enabled: !!selectedContainerId,
        staleTime: 60000
    });


    // Search Bar Component
    const SearchBar = (
        <div style={{
            padding: '16px 0 16px', // Adjusted padding for tabsContent
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
                        color: theme.colors.warningDark,
                        opacity: 0.6
                    }}
                />
                <input
                    type="text"
                    placeholder="Search containers (min 3 chars)..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 36px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid rgba(180, 83, 9, 0.2)',
                        borderRadius: '10px',
                        color: theme.colors.warningDark,
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.warningDark;
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(180, 83, 9, 0.1)';
                        setSearchFocused(true);
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(180, 83, 9, 0.2)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                        setSearchFocused(false);
                    }}
                />
                {searchInput && (
                    <button
                        onClick={() => setSearchInput('')}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(180, 83, 9, 0.1)',
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
                        <X size={12} color={theme.colors.warningDark} />
                    </button>
                )}
            </div>
            {searchInput.length > 0 && searchInput.length < 3 && (
                <div style={{ fontSize: '11px', color: theme.colors.warningDark, marginTop: '6px', paddingLeft: '4px' }}>
                    Type {3 - searchInput.length} more character{3 - searchInput.length !== 1 ? 's' : ''} to search
                </div>
            )}
        </div>
    );

    // Prepare footer action
    const footerActions = selectedContainerId ? (
        <ActionButton
            icon={<MapPin size={16} />}
            label="Assign Position"
            primary
            onClick={() => {
                // Open Position panel via global state with custom category label
                openPanel('cfsPosition', { // using 'cfsPosition' panel type as general positioning panel, assuming it handles invalid too or reuse existing
                    containerNbr: selectedContainerId || '',
                    containerType: containerDetails?.container_type || '20GP',
                    shipmentNbr: containerDetails?.inbound_shipment_nbr || '',
                    categoryLabel: 'INVALID CONTAINER POSITIONING'
                });
            }}
        />
    ) : null;

    return (
        <PanelLayout
            isOpen={isOpen}
            onClose={handleClose}
            category="YARD MANAGEMENT"
            title={
                !selectedContainerId ? (
                    'Invalid Containers'
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
            tabsContent={!selectedContainerId ? SearchBar : null}
            footerActions={footerActions}
            headerColor={theme.colors.warning}
        >
            {isError ? (
                <ContainerErrorState
                    title="Unable to load containers"
                    message={error?.message || "Something went wrong while fetching invalid containers."}
                    onRetry={refetch}
                    height="100%"
                />
            ) : isLoading ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <ContainerLoader />
                </div>
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
                    searchTerm={searchInput}
                />
            )}
        </PanelLayout>
    );
}

export default InvalidContainersPanel;
