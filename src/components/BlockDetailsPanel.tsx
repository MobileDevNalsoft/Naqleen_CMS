import React, { useEffect, useState, useMemo } from 'react';
import { Truck, MapPin, Box, Activity, Package, Grid3x3, TrendingUp, Users } from 'lucide-react';
import { useStore } from '../store/store';
import { getAllBlocks } from '../utils/layoutUtils';

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
        } else {
            setIsVisible(false);
        }
    }, [selectedBlock]);

    // Close block panel when a container is selected
    useEffect(() => {
        if (selectId && selectedBlock) {
            // A container was selected, close the block panel
            setIsVisible(false);
            setTimeout(() => {
                setSelectedBlock(null);
            }, 300);
        }
    }, [selectId, selectedBlock, setSelectedBlock]);

    const blockData = useMemo(() => {
        if (!selectedBlock || !layout) return null;

        const blocks = getAllBlocks(layout);
        const block = blocks.find(b => b.id === selectedBlock);
        if (!block) return null;

        // Calculate metrics
        const containersInBlock = ids.filter(id => {
            const entity = entities[id];
            return entity && entity.blockId === selectedBlock;
        });

        const totalCapacity = (block.bays || 1) * (block.rows || 1) * 6; // Assuming 6-high stacks
        const currentCount = containersInBlock.length;
        const occupancyPercent = Math.round((currentCount / totalCapacity) * 100);

        // Container types count
        const containerTypes = containersInBlock.reduce((acc, id) => {
            const type = entities[id]?.type || '20ft';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            block,
            containersInBlock,
            currentCount,
            totalCapacity,
            occupancyPercent,
            containerTypes
        };
    }, [selectedBlock, layout, ids, entities]);

    if (!selectedBlock && !isVisible) return null;

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

    const { block, containersInBlock, currentCount, totalCapacity, occupancyPercent, containerTypes } = blockData;

    return (
        <div
            className={`block-details-panel ${isVisible ? 'visible' : ''}`}
            style={{
                position: 'fixed',
                top: '80px',
                right: '20px',
                width: '420px',
                maxHeight: 'calc(100vh - 100px)',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                transform: isVisible ? 'translateX(0)' : 'translateX(450px)',
                opacity: isVisible ? 1 : 0,
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(to right, rgba(59, 130, 246, 0.1), transparent)'
            }}>
                <div>
                    <div style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600,
                        marginBottom: '4px'
                    }}>
                        Block Details
                    </div>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        margin: 0,
                        background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {block.description || block.id}
                    </h2>
                </div>
                <button
                    onClick={() => handleClose()}
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
                        transition: 'all 0.2s',
                        zIndex: 10,
                        position: 'relative',
                        padding: '0',
                        margin: '0'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
                        <path d="M2 2L14 14M14 2L2 14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {/* Occupancy Bar */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Occupancy</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>{occupancyPercent}%</span>
                </div>
                <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${occupancyPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginTop: '6px',
                    textAlign: 'right'
                }}>
                    {currentCount} / {totalCapacity} slots
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0 10px'
            }}>
                {['overview', 'containers', 'metrics'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '12px 16px',
                            color: activeTab === tab ? '#60a5fa' : '#94a3b8',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            borderBottom: activeTab === tab ? '2px solid #60a5fa' : '2px solid transparent',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                        onMouseEnter={e => {
                            // Prevent global button hover style from adding white border
                            e.currentTarget.style.border = 'none';
                            e.currentTarget.style.borderBottom = activeTab === tab ? '2px solid #60a5fa' : '2px solid #94a3b8';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.border = 'none';
                            e.currentTarget.style.borderBottom = activeTab === tab ? '2px solid #60a5fa' : '2px solid transparent';
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <MetricCard
                            icon={<Grid3x3 size={18} />}
                            label="Dimensions"
                            value={`${block.bays} bays × ${block.rows} rows`}
                        />
                        <MetricCard
                            icon={<Box size={18} />}
                            label="Container Type"
                            value={block.container_type || '40ft'}
                        />
                        <MetricCard
                            icon={<Package size={18} />}
                            label="Current Count"
                            value={`${currentCount} containers`}
                        />
                        <MetricCard
                            icon={<MapPin size={18} />}
                            label="Position"
                            value={`X: ${block.position.x.toFixed(0)}, Z: ${block.position.z.toFixed(0)}`}
                        />
                    </div>
                )}

                {activeTab === 'containers' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Search Input */}
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search containers..."
                                value={containerSearch}
                                onChange={(e) => setContainerSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '13px',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.4)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                }}
                            />
                        </div>

                        {/* Filtered containers list */}
                        {(() => {
                            const filteredContainers = containerSearch
                                ? containersInBlock.filter(id =>
                                    id.toLowerCase().includes(containerSearch.toLowerCase())
                                )
                                : containersInBlock;

                            return (
                                <>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                                        {filteredContainers.length} container{filteredContainers.length !== 1 ? 's' : ''}
                                        {containerSearch && ` found (${containersInBlock.length} total)`}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        paddingRight: '4px'
                                    }}>
                                        {filteredContainers.length > 0 ? (
                                            filteredContainers.map(id => (
                                                <div
                                                    key={id}
                                                    style={{
                                                        padding: '10px 12px',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                                        fontSize: '13px',
                                                        color: 'white',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                                    onClick={() => {
                                                        useStore.getState().setSelectId(id);
                                                        handleClose(true); // Skip camera reset to avoid animation conflict
                                                    }}
                                                >
                                                    <span>{id}</span>
                                                    <span style={{ color: '#64748b', fontSize: '12px' }}>
                                                        {entities[id]?.type || '20ft'}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{
                                                textAlign: 'center',
                                                color: '#64748b',
                                                fontSize: '13px',
                                                padding: '20px'
                                            }}>
                                                No containers found matching "{containerSearch}"
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'metrics' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>Container Types</div>
                            {Object.entries(containerTypes).map(([type, count]) => (
                                <div
                                    key={type}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '8px 0',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    <span style={{ fontSize: '13px' }}>{type}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>{count}</span>
                                </div>
                            ))}
                        </div>

                        <MetricCard
                            icon={<TrendingUp size={18} />}
                            label="Utilization Rate"
                            value={`${occupancyPercent}%`}
                            color={occupancyPercent > 80 ? '#ef4444' : occupancyPercent > 50 ? '#f59e0b' : '#10b981'}
                        />
                        <MetricCard
                            icon={<Activity size={18} />}
                            label="Available Slots"
                            value={`${totalCapacity - currentCount}`}
                        />
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div style={{
                padding: '16px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '8px',
                background: 'rgba(0, 0, 0, 0.2)'
            }}>
                <ActionButton icon={<MapPin size={14} />} label="View on Map" />
                <ActionButton icon={<Truck size={14} />} label="Plan Movement" />
                <ActionButton icon={<Activity size={14} />} label="Export Report" />
            </div>
        </div>
    );
}

const MetricCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color?: string }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
            {icon}
            <span style={{ fontSize: '13px' }}>{label}</span>
        </div>
        <span style={{ color: color || 'white', fontWeight: 600, fontSize: '14px' }}>{value}</span>
    </div>
);

const ActionButton = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
    <button style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px',
        borderRadius: '6px',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s'
    }}
        onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
        }}
    >
        {icon}
        {label}
    </button>
);
