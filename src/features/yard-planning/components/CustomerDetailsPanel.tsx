import { useEffect, useMemo, useState } from 'react';
import { Package, X } from 'lucide-react';
import { useStore } from '../../../store/store';
import { theme } from '../../../themes/theme';
import PanelLayout from '../../shared/components/PanelLayout';
import ContainerEmptyState from '../../../components/ui/feedback/containers/ContainerEmptyState';

export default function CustomerDetailsPanel() {
    const selectedCustomer = useStore((state) => state.selectedCustomer);
    const setSelectedCustomer = useStore((state) => state.setSelectedCustomer);
    const selectId = useStore((state) => state.selectId);
    const entities = useStore((state) => state.entities);
    const setSelectId = useStore((state) => state.setSelectId);

    const [isVisible, setIsVisible] = useState(false);
    const [containerSearch, setContainerSearch] = useState('');

    // Synchronize visibility
    useEffect(() => {
        if (selectedCustomer) {
            if (selectId) {
                // Hide when container is selected, but keep customer state
                setIsVisible(false);
            } else {
                // Show when customer is selected and no container is active
                setIsVisible(true);
            }
        } else {
            setIsVisible(false);
        }
    }, [selectedCustomer, selectId]);

    const customerContainers = useMemo(() => {
        if (!selectedCustomer) return [];
        return Object.values(entities).filter(e => e.customerName === selectedCustomer);
    }, [selectedCustomer, entities]);

    const filteredContainers = useMemo(() => {
        if (!containerSearch) return customerContainers;
        return customerContainers.filter(c =>
            c.id.toLowerCase().includes(containerSearch.toLowerCase())
        );
    }, [customerContainers, containerSearch]);

    const handleClose = () => {
        setSelectedCustomer(null);
        setContainerSearch('');
    };

    if (!selectedCustomer || (!isVisible && !selectId)) return null;

    return (
        <PanelLayout
            isOpen={isVisible}
            onClose={handleClose}
            title={selectedCustomer}
            category="CUSTOMER CONTAINERS"
            headerColor={theme.colors.primary}
            width="420px"
            top="90px"
            tabsContent={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0', paddingRight: '4px' }}>
                    {/* Metric Card - Total Containers */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.6)',
                        borderRadius: '12px',
                        border: `1px solid ${theme.colors.thickBorder}`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        backdropFilter: 'blur(8px)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                background: 'rgba(75, 104, 108, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Package size={16} color={theme.colors.primary} />
                            </div>
                            <div style={{ fontSize: '12px', color: theme.colors.text.secondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Containers
                            </div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.text.primary }}>
                            {customerContainers.length}
                        </div>
                    </div>

                    {/* Search Input */}
                    <div style={{ position: 'relative', marginRight: '4px' }}>
                        <input
                            type="text"
                            placeholder="Search containers..."
                            value={containerSearch}
                            onChange={(e) => setContainerSearch(e.target.value)}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 38px 10px 14px',
                                background: 'white',
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: '10px',
                                color: theme.colors.text.primary,
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = theme.colors.primary;
                                e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.primary}20`;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = theme.colors.border;
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                            }}
                        />
                        {containerSearch && (
                            <button
                                onClick={() => setContainerSearch('')}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    color: theme.colors.text.secondary,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px'
            }}>
                {filteredContainers.length > 0 ? (
                    filteredContainers.map(container => (
                        <div
                            key={container.id}
                            style={{
                                padding: '16px 18px',
                                background: 'rgba(255, 255, 255, 0.6)',
                                borderRadius: '12px',
                                border: `1px solid ${theme.colors.thickBorder}`,
                                fontSize: '13px',
                                color: theme.colors.text.primary,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                fontWeight: 500,
                                height: '46px',
                                boxSizing: 'border-box'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.boxShadow = `0 8px 16px ${theme.colors.primary}15`;
                                e.currentTarget.style.borderColor = theme.colors.primary;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                                e.currentTarget.style.borderColor = theme.colors.thickBorder;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            onClick={() => {
                                setSelectId(container.id);
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={14} color={theme.colors.primary} />
                                <span>{container.id}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    color: theme.colors.text.secondary,
                                    fontSize: '11px'
                                }}>
                                    {container.terminal}-{container.block}-{container.lot}-{container.row}-{container.level}
                                </span>
                                <span style={{
                                    color: theme.colors.text.secondary,
                                    fontSize: '11px',
                                    background: 'rgba(0,0,0,0.04)',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 600
                                }}>
                                    {container.type || '20ft'}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    containerSearch ? (
                        <ContainerEmptyState
                            title="No Search Results"
                            message={`No containers found matching "${containerSearch}"`}
                            height="200px"
                        />
                    ) : (
                        <ContainerEmptyState
                            title="No Containers"
                            message="This customer has no active containers."
                            height="200px"
                        />
                    )
                )}
            </div>
        </PanelLayout>
    );
}
