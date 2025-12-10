import React, { useEffect, useState, useMemo } from 'react';
import { Package, Grid3x3 } from 'lucide-react';
import { useStore } from '../../store/store';
import { getAllDynamicBlocks } from '../../utils/layoutUtils';

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

    // ESC key handler to close block panel
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && selectedBlock) {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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

        const props = block.props || {};
        const totalCapacity = (props.lots || 1) * (props.rows || 1) * 6; // Assuming 6-high stacks
        const currentCount = containersInBlock.length;
        const occupancyPercent = Math.round((currentCount / totalCapacity) * 100);

        // Container types count

        return {
            block,
            containersInBlock,
            currentCount,
            totalCapacity,
            occupancyPercent
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

    const { block, containersInBlock, currentCount, totalCapacity, occupancyPercent } = blockData;
    const props = block.props || {};

    const containerTypeLabel = props.container_type || '40ft';
    const availableSlots = Math.max(totalCapacity - currentCount, 0);
    const occupiedSlots = currentCount;

    return (
        <div
            className={`block-details-panel ${isVisible ? 'visible' : ''}`}
            style={{
                position: 'fixed',
                top: '90px',
                right: '24px',
                width: '420px',
                maxHeight: 'calc(100vh - 114px)',
                backgroundColor: 'rgba(253, 246, 235, 0.95)', // Subtle light secondary (Cream)
                backdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: '24px',
                border: '1px solid rgba(75, 104, 108, 0.1)', // Subtle primary border
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
            {/* Premium Header */}
            <div style={{
                padding: '16px 24px 8px',
                background: '#4B686C',
                position: 'relative',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            background: 'rgba(243, 239, 239, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '20px',
                            marginBottom: '12px'
                        }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e7e7e7ff', boxShadow: '0 0 6px #e7e7e7ff' }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e7e7e7ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {containerTypeLabel}
                            </span>
                        </div>
                        <h2 style={{
                            fontSize: '28px',
                            fontWeight: 800,
                            margin: 0,
                            background: 'white',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textTransform: 'uppercase',
                            letterSpacing: '-0.5px'
                        }}>
                            {props.description || block.id}
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
                            margin: '0',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Occupancy Bar */}
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                background: 'rgba(255, 255, 255, 0.4)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Occupancy</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-color)' }}>{occupancyPercent}%</span>
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
                        background: 'var(--primary-gradient)',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <div style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '6px',
                    textAlign: 'right',
                    fontWeight: 500
                }}>
                    {currentCount} / {totalCapacity} slots
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                padding: '0 24px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                gap: '24px',
                background: 'rgba(255, 255, 255, 0.2)'
            }}>
                {['overview', 'containers'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '16px 0',
                            color: activeTab === tab ? 'var(--primary-color)' : '#64748b',
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
                                background: 'var(--secondary-gradient)',
                                borderRadius: '2px 2px 0 0',
                                boxShadow: '0 -2px 8px rgba(247, 207, 155, 0.4)'
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="custom-scrollbar">
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                    Total
                                </span>
                                <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                                    {totalCapacity}
                                </span>
                            </div>
                            <div style={{
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <span style={{ fontSize: '11px', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                    Free
                                </span>
                                <span style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>
                                    {availableSlots}
                                </span>
                            </div>
                            <div style={{
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.1) 0%, rgba(248, 113, 113, 0.05) 100%)',
                                border: '1px solid rgba(248, 113, 113, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                boxShadow: '0 4px 12px rgba(248, 113, 113, 0.1)',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <span style={{ fontSize: '11px', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                    Used
                                </span>
                                <span style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>
                                    {occupiedSlots}
                                </span>
                            </div>
                        </div>

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
                                    boxSizing: 'border-box',
                                    padding: '12px 16px',
                                    background: 'white',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    borderRadius: '12px',
                                    color: '#1e293b',
                                    fontSize: '13px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 104, 108, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
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
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500, paddingLeft: '4px' }}>
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
                                                        padding: '16px 20px',
                                                        background: 'rgba(255, 255, 255, 0.6)',
                                                        borderRadius: '12px',
                                                        border: '1px solid rgba(75, 104, 108, 0.2)',
                                                        fontSize: '13px',
                                                        color: '#1e293b',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                                        fontWeight: 500,
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(75, 104, 108, 0.12)';
                                                        e.currentTarget.style.borderColor = 'var(--primary-color)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                                                        e.currentTarget.style.borderColor = 'rgba(75, 104, 108, 0.08)';
                                                    }}
                                                    onClick={() => {
                                                        useStore.getState().setSelectId(id);
                                                        // Do not close/clear block selection.
                                                        // The useEffect will monitor [selectId, selectedBlock]
                                                        // and automatically hide this panel without clearing selectedBlock.
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Package size={14} color="var(--primary-color)" />
                                                        <span>{id}</span>
                                                    </div>
                                                    <span style={{
                                                        color: '#64748b',
                                                        fontSize: '11px',
                                                        background: 'rgba(0,0,0,0.04)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontWeight: 600
                                                    }}>
                                                        {entities[id]?.type || '20ft'}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{
                                                textAlign: 'center',
                                                color: '#94a3b8',
                                                fontSize: '13px',
                                                padding: '32px',
                                                background: 'rgba(0,0,0,0.02)',
                                                borderRadius: '12px',
                                                border: '1px dashed rgba(0,0,0,0.1)'
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
            </div>
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>
            <div style={{
                padding: '10px',
                background: 'rgba(75, 104, 108, 0.1)',
                borderRadius: '10px',
                color: 'var(--primary-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {icon}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ color: color || '#1e293b', fontWeight: 700, fontSize: '15px' }}>{value}</span>
    </div>
);
