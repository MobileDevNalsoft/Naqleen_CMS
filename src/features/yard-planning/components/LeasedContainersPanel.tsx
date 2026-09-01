import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, ArrowLeft, FileText, Ship, Loader2, Search } from 'lucide-react';
import { useStore } from '../../../store/store';
import { useUIStore } from '../../../store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useLeasedContainersQuery } from '../apis/leasedContainersApi';
import ContainerLoader from '../../../components/ui/feedback/containers/ContainerLoader';
import type { LeasedContainer } from '../types/containerTypes';
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

// Container Details View
const ContainerDetailView = ({ containerId }: { containerId: string }) => {
    const { data: details, isLoading } = useQuery({
        queryKey: ['container-details', containerId],
        queryFn: async () => getContainerDetails(containerId),
        enabled: !!containerId,
        staleTime: 60000
    });

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <ContainerLoader />
            </div>
        );
    }

    if (!details) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: theme.colors.text.secondary }}>
                Details not found.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
            <DetailSection title="Customer Information" icon={<FileText size={16} />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <InfoItem label="Customer Name" value={details.customer_name || 'N/A'} fullWidth />
                    <InfoItem label="Booking Number" value={details.booking_id || 'N/A'} />
                    <InfoItem label="Container Type" value={details.container_type || 'N/A'} />
                </div>
            </DetailSection>

            <div style={{ height: '2px', background: 'linear-gradient(90deg, rgba(75, 104, 108, 0.2) 0%, rgba(75, 104, 108, 0.05) 50%, transparent 100%)', margin: '4px 0' }} />

            <DetailSection title="Shipment Details" icon={<Ship size={16} />}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <InfoItem label="Shipment No" value={details.inbound_shipment_nbr || 'N/A'} />
                    <InfoItem label="Order Number" value={details.inbound_order_nbr || 'N/A'} />
                    <InfoItem label="Request Type" value={details.shipment_name || 'N/A'} />
                    <InfoItem label="Stored Time" value={details.container_stored_time || 'N/A'} />
                </div>
            </DetailSection>
        </div>
    );
};

// Container List View
const ContainerListView = ({
    containers,
    onSelect,
    onLoadMore,
    hasNextPage,
    isFetchingNextPage,
    searchTerm
}: {
    containers: LeasedContainer[];
    onSelect: (containerNbr: string) => void;
    onLoadMore: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    searchTerm: string;
}) => {
    const listRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback(() => {
        const el = listRef.current;
        if (!el || isFetchingNextPage || !hasNextPage) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            onLoadMore();
        }
    }, [hasNextPage, isFetchingNextPage, onLoadMore]);

    if (containers.length === 0) {
        if (searchTerm) {
            return (
                <ContainerEmptyState
                    title="No Search Results"
                    message={`No leased containers found matching "${searchTerm}"`}
                    height="100%"
                />
            );
        }
        return (
            <ContainerEmptyState
                title="No Leased Containers"
                message="There are no containers in the leased area."
                height="100%"
            />
        );
    }

    return (
        <div ref={listRef} onScroll={handleScroll} style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
            {containers.map((item) => {
                const displayType = item.container_type
                    ?.replace('ft Standard', 'GP')
                    .replace('ft High Cube', 'HC')
                    .replace('ft Reefer', 'RT') || 'N/A';

                return (
                    <div
                        key={item.container_nbr}
                        onClick={() => onSelect(item.container_nbr)}
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
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                        }}
                    >
                        <div style={{ width: '4px', height: '32px', borderRadius: '4px', background: theme.colors.warning }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: theme.colors.text.primary }}>
                                {item.container_nbr}
                            </div>
                            <div style={{ fontSize: '11px', color: theme.colors.text.secondary }}>
                                {item.customer_name || 'Unknown Customer'}
                            </div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                            {displayType}
                        </div>
                    </div>
                );
            })}
            {isFetchingNextPage && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: theme.colors.primary }} />
                </div>
            )}
        </div>
    );
};

export const LeasedContainersPanel: React.FC = () => {
    const selectedBlock = useStore(state => state.selectedBlock);
    const setSelectedBlock = useStore(state => state.setSelectedBlock);
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput.length >= 3 || searchInput.length === 0) {
                setDebouncedSearch(searchInput);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const activePanel = useUIStore(state => state.activePanel);
    const setSearchFocused = useUIStore(state => state.setSearchFocused);

    const {
        data,
        isLoading,
        isError,
        error,
        refetch,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage
    } = useLeasedContainersQuery(debouncedSearch || undefined);

    const containers = data?.pages.flatMap(page => page.data) || [];
    const isLeasedArea = selectedBlock === 'leased_area';

    useEffect(() => {
        if (!isLeasedArea) {
            setSearchFocused(false);
        }
    }, [isLeasedArea, setSearchFocused]);

    const handleClose = () => {
        setSelectedBlock(null);
        setSelectedContainerId(null);
        setSearchInput('');
        setDebouncedSearch('');
    };

    const isOpen = !!(isLeasedArea && !activePanel);

    const searchBar = (
        <div style={{ padding: '16px 0 16px', position: 'relative' }}>
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

    return (
        <PanelLayout
            isOpen={isOpen}
            onClose={handleClose}
            category="YARD MANAGEMENT"
            title={
                selectedContainerId ? (
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
                ) : (
                    "Leased Area"
                )
            }
            width="400px"
            top="90px"
            tabsContent={selectedContainerId ? null : searchBar}
            headerColor={theme.colors.warning}
        >
            {isError ? (
                <ContainerErrorState
                    title="Unable to load containers"
                    message={(error as Error)?.message || "Something went wrong while fetching leased containers."}
                    onRetry={() => refetch()}
                    height="100%"
                />
            ) : isLoading ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <ContainerLoader />
                </div>
            ) : selectedContainerId ? (
                <ContainerDetailView containerId={selectedContainerId} />
            ) : (
                <ContainerListView
                    containers={containers}
                    onSelect={setSelectedContainerId}
                    onLoadMore={() => fetchNextPage()}
                    hasNextPage={!!hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    searchTerm={debouncedSearch}
                />
            )}
        </PanelLayout>
    );
};

export default LeasedContainersPanel;
