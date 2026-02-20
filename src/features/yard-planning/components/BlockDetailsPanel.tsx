import React, { useEffect, useState, useMemo } from 'react';
import { Package, Grid3x3, X } from 'lucide-react';
import type { ContainerBlockProps } from '../../../components/scene/infrastructure/types/IcdSchema';
import { useStore } from '../../../store/store';
import { getAllDynamicBlocks } from '../../../components/scene/infrastructure/utils/layoutUtils';
import PanelLayout from '../../shared/components/PanelLayout';
import { theme } from '../../../themes/theme';
import ContainerEmptyState from '../../../components/ui/feedback/containers/ContainerEmptyState';

export default function BlockDetailsPanel() {
    const selectedBlock = useStore(state => state.selectedBlock);
    const setSelectedBlock = useStore(state => state.setSelectedBlock);
    const selectId = useStore(state => state.selectId);
    const layout = useStore(state => state.layout);
    const entities = useStore(state => state.entities);
    const ids = useStore(state => state.ids);

    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [containerSearch, setContainerSearch] = useState('');

    useEffect(() => {
        if (selectedBlock) {
            setIsVisible(true);
            setActiveTab('overview'); // Reset to overview tab when opening
        } else {
            setIsVisible(false);
        }
    }, [selectedBlock]);

    // Close block panel when a container is selected, re-open when deselected (backtrack)
    useEffect(() => {
        if (selectId && selectedBlock) {
            // A container was selected, close the block panel but keep selection state
            setIsVisible(false);
        } else if (selectedBlock && !selectId) {
            // Backtracking: Container deselected, but block is still selected -> Show block panel
            setIsVisible(true);
        }
    }, [selectId, selectedBlock]);

    const blockData = useMemo(() => {
        if (!selectedBlock || !layout) return null;

        const blocks = getAllDynamicBlocks(layout);
        const block = blocks.find(b => b.id === selectedBlock);
        if (!block) return null;

        // Calculate metrics
        const containersInBlock = ids.filter(id => {
            const entity = entities[id];
            return entity && entity.blockId === selectedBlock;
        });

        const props = (block.props || {}) as ContainerBlockProps;
        const totalCapacity = (props.lots || 1) * (props.rows || 1) * 6; // Assuming 6-high stacks
        const currentCount = containersInBlock.length;
        const occupancyPercent = Math.round((currentCount / totalCapacity) * 100);

        return {
            block,
            containersInBlock,
            currentCount,
            totalCapacity,
            occupancyPercent
        };
    }, [selectedBlock, layout, ids, entities]);

    const handleClose = (skipCameraReset = false) => {
        // Reset camera to main view only if not skipping
        if (!skipCameraReset) {
            window.dispatchEvent(new CustomEvent('resetCameraToInitial'));
        }

        setIsVisible(false);
        setTimeout(() => {
            setSelectedBlock(null);
        }, 300);
    };

    if (!blockData) return null;

    const { block, containersInBlock, currentCount, totalCapacity, occupancyPercent } = blockData;
    const props = (block.props || {}) as ContainerBlockProps;

    const containerTypeLabel = props.container_type || '40ft';
    const availableSlots = Math.max(totalCapacity - currentCount, 0);
    const occupiedSlots = currentCount;

    // Tabs Header to be passed to PanelLayout
    const TabsHeader = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '12px', paddingRight: '4px' }}>
            <div style={{
                display: 'flex',
                gap: '24px',
                paddingTop: '4px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
            }}>
                {['overview', 'containers'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '12px 0',
                            color: activeTab === tab ? theme.colors.primary : theme.colors.text.secondary,
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            position: 'relative',
                            textTransform: 'capitalize',
                            transition: 'all 0.3s ease',
                            outline: 'none',
                            boxShadow: 'none'
                        }}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div style={{
                                position: 'absolute',
                                bottom: '-1px',
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: theme.gradients.secondary,
                                borderRadius: '2px 2px 0 0',
                                boxShadow: `0 -2px 8px ${theme.colors.secondary}40`
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'containers' && (
                <div style={{ position: 'relative', padding: '4px 0', marginRight: '8px' }}>
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
            )}
        </div>
    );

    return (
        <PanelLayout
            isOpen={isVisible}
            onClose={() => handleClose()}
            title={props.description || block.id}
            category={containerTypeLabel}
            headerColor={theme.colors.primary}
            tabsContent={TabsHeader}
            width="420px"
            top="90px"
        >
            {/* Scrollable Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Occupancy Bar (Only in Overview) */}
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.6)',
                            border: `1px solid ${theme.colors.border}`,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            backdropFilter: 'blur(8px)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', color: theme.colors.text.secondary, fontWeight: 500 }}>Occupancy</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: theme.colors.primary }}>{occupancyPercent}%</span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                background: 'rgba(0, 0, 0, 0.05)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${occupancyPercent}%`,
                                    height: '100%',
                                    background: theme.gradients.primary,
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <div style={{
                                fontSize: '11px',
                                color: theme.colors.text.secondary,
                                marginTop: '6px',
                                textAlign: 'right',
                                fontWeight: 500
                            }}>
                                {currentCount} / {totalCapacity} slots
                            </div>
                        </div>

                        <MetricCard
                            icon={<Grid3x3 size={18} />}
                            label="Dimensions"
                            value={`${props.lots} lots × ${props.rows} rows`}
                        />

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: '12px'
                        }}>
                            <div style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                boxShadow: theme.shadows.card,
                                backdropFilter: 'blur(8px)'
                            }}>
                                <span style={{ fontSize: '11px', color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                    Total
                                </span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: theme.colors.text.primary }}>
                                    {totalCapacity}
                                </span>
                            </div>
                            <div style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <span style={{ fontSize: '11px', color: theme.colors.success, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                    Free
                                </span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: theme.colors.success }}>
                                    {availableSlots}
                                </span>
                            </div>
                            <div style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.1) 0%, rgba(248, 113, 113, 0.05) 100%)',
                                border: '1px solid rgba(248, 113, 113, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                boxShadow: '0 4px 12px rgba(248, 113, 113, 0.1)',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <span style={{ fontSize: '11px', color: theme.colors.error, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                    Used
                                </span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: theme.colors.error }}>
                                    {occupiedSlots}
                                </span>
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'containers' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Filtered containers list */}
                        {(() => {
                            const filteredContainers = containerSearch
                                ? containersInBlock.filter(id =>
                                    id.toLowerCase().includes(containerSearch.toLowerCase())
                                )
                                : containersInBlock;

                            return (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    paddingRight: '4px'
                                }}>
                                    {filteredContainers.length > 0 ? (
                                        filteredContainers.map(id => (
                                            <div
                                                key={id}
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
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    height: '46px',
                                                    boxSizing: 'border-box'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'white';
                                                    e.currentTarget.style.boxShadow = `0 12px 24px ${theme.colors.primary}20`;
                                                    e.currentTarget.style.borderColor = theme.colors.primary;
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                                                    e.currentTarget.style.borderColor = theme.colors.thickBorder;
                                                }}
                                                onClick={() => {
                                                    useStore.getState().setSelectId(id);
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Package size={14} color={theme.colors.primary} />
                                                    <span>{id}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        color: theme.colors.text.secondary,
                                                        fontSize: '11px'
                                                    }}>
                                                        {entities[id]?.lot}-{entities[id]?.row}-{entities[id]?.level}
                                                    </span>
                                                    <span style={{
                                                        color: theme.colors.text.secondary,
                                                        fontSize: '11px',
                                                        background: 'rgba(0,0,0,0.04)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontWeight: 600
                                                    }}>
                                                        {entities[id]?.type || '20ft'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <ContainerEmptyState
                                            title="No Search Results"
                                            message={`No containers found matching "${containerSearch}"`}
                                            height="200px"
                                        />
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </PanelLayout>
    );
}

const MetricCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color?: string }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.6)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        backdropFilter: 'blur(8px)'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.colors.text.secondary }}>
            <div style={{
                padding: '10px',
                background: `${theme.colors.primary}15`,
                borderRadius: '10px',
                color: theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {icon}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ color: color || theme.colors.text.primary, fontWeight: 700, fontSize: '15px' }}>{value}</span>
    </div>
);
