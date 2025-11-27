import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, MapPin, Grid3x3, Layers, Box, ArrowRight, Package, X, RefreshCw, Container, Anchor } from 'lucide-react';
import { useStore } from '../../store/store';
import type { IcdTerminal } from '../../utils/layoutUtils';

interface PositionContainerPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Mock Data for Container Selection
const MOCK_CONTAINERS = [
    { id: 'CONT-1001', type: '20FT', owner: 'Maersk', weight: '24.5T' },
    { id: 'CONT-1002', type: '40FT', owner: 'MSC', weight: '30.2T' },
    { id: 'CONT-1003', type: '40FT HC', owner: 'CMA CGM', weight: '28.1T' },
    { id: 'CONT-1004', type: '20FT', owner: 'Hapag-Lloyd', weight: '22.0T' },
    { id: 'CONT-1005', type: '45FT', owner: 'ONE', weight: '32.5T' },
];

export default function PositionContainerPanel({ isOpen, onClose }: PositionContainerPanelProps) {
    const layout = useStore(state => state.layout);
    const entities = useStore(state => state.entities);
    const ids = useStore(state => state.ids);

    const [isVisible, setIsVisible] = useState(false);
    const [selectedContainerId, setSelectedContainerId] = useState<string>('');
    const [selectedTerminal, setSelectedTerminal] = useState<string>('');
    const [selectedBlock, setSelectedBlock] = useState<string>('');
    const [selectedRow, setSelectedRow] = useState<string>('');
    const [selectedLot, setSelectedLot] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    // Animation state management
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 400);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Reset downstream selections when upstream changes
    useEffect(() => {
        setSelectedBlock('');
        setSelectedRow('');
        setSelectedLot('');
        setSelectedLevel('');
    }, [selectedTerminal]);

    useEffect(() => {
        setSelectedRow('');
        setSelectedLot('');
        setSelectedLevel('');
    }, [selectedBlock]);

    useEffect(() => {
        // When Row or Lot changes, try to auto-select level
        if (selectedTerminal && selectedBlock && selectedRow && selectedLot) {
            autoSelectLevel();
        } else {
            setSelectedLevel('');
        }
    }, [selectedRow, selectedLot]);

    // Clear all selections when dialog closes
    useEffect(() => {
        if (!isOpen) {
            handleRefresh();
        }
    }, [isOpen]);

    const terminals = ['TRS', 'TRM'];
    const blocks = ['A', 'B', 'C', 'D'];

    // Get current block data
    const currentBlockData = useMemo(() => {
        if (!layout || !selectedTerminal || !selectedBlock) return null;

        const terminalKey = selectedTerminal === 'TRS' ? 'trs_container_blocks' : 'trm_container_blocks';
        const blockKey = `${selectedTerminal.toLowerCase()}_block_${selectedBlock.toLowerCase()}`;

        // @ts-ignore
        const blockData = layout.terminals[terminalKey][blockKey];

        if (Array.isArray(blockData)) {
            return {
                ...blockData[0],
                lot_numbers: blockData.flatMap(b => b.lot_numbers || []).sort((a, b) => a - b),
                row_labels: blockData[0].row_labels
            };
        }

        return blockData as IcdTerminal;
    }, [layout, selectedTerminal, selectedBlock]);

    const rows = currentBlockData?.row_labels || [];
    const lots = currentBlockData?.lot_numbers || [];
    const levels = [1, 2, 3, 4, 5, 6];

    const autoSelectLevel = () => {
        if (!currentBlockData) return;

        const blockIdBase = `${selectedTerminal.toLowerCase()}_block_${selectedBlock.toLowerCase()}`;
        let maxLevel = 0;

        ids.forEach(id => {
            const entity = entities[id];
            if (!entity) return;

            let matchBlock = false;
            if (entity.blockId === blockIdBase) matchBlock = true;
            if (blockIdBase.endsWith('block_d') && entity.blockId?.startsWith(blockIdBase)) matchBlock = true;

            if (matchBlock) {
                const rowIndex = currentBlockData.row_labels?.indexOf(selectedRow);
                if (entity.row === rowIndex && entity.lot === parseInt(selectedLot)) {
                    if ((entity.level || 0) > maxLevel) {
                        maxLevel = entity.level || 0;
                    }
                }
            }
        });

        const nextLevel = maxLevel + 1;
        if (nextLevel <= 6) {
            setSelectedLevel(nextLevel.toString());
        } else {
            setSelectedLevel('6'); // Full
        }
    };

    const handlePlace = () => {
        if (!selectedContainerId || !selectedLevel) return;
        console.log('Placing Container:', {
            containerId: selectedContainerId,
            position: { selectedTerminal, selectedBlock, selectedRow, selectedLot, selectedLevel }
        });
        onClose();
    };

    const handleRefresh = () => {
        setSelectedContainerId('');
        setSelectedTerminal('');
        setSelectedBlock('');
        setSelectedRow('');
        setSelectedLot('');
        setSelectedLevel('');
    };

    if (!isVisible && !isOpen) return null;

    return (
        <>
            <style>{`
                @keyframes slideInRightPanel {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .glass-panel {
                    background: rgba(30, 41, 59, 0.95);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
                }
                .stepper-line {
                    position: absolute;
                    left: 15px;
                    top: 24px;
                    bottom: -24px;
                    width: 2px;
                    background: rgba(255, 255, 255, 0.1);
                    z-index: 0;
                }
                .step-item:last-child .stepper-line {
                    display: none;
                }
            `}</style>

            <div
                className={`container-details-panel ${isOpen ? 'visible' : ''}`}
                style={{
                    position: 'fixed',
                    top: '90px',
                    right: '24px',
                    width: '420px',
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
                    transform: isOpen ? 'translateX(0)' : 'translateX(420px)',
                    opacity: isOpen ? 1 : 0,
                    overflow: 'hidden'
                }}
            >
                {/* Header Section */}
                <div style={{
                    padding: '16px 24px 8px',
                    background: '#4B686C',
                    position: 'relative',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0px' }}>
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
                                    POSITIONING
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
                                CONTAINER
                            </h2>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleRefresh}
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
                                    transition: 'all 0.2s ease',
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
                                <RefreshCw size={18} />
                            </button>
                            <button
                                onClick={onClose}
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
                                    transition: 'all 0.2s ease',
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
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="custom-scrollbar">

                    {/* Section 1: Container Selection */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#64748b',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            marginBottom: '12px'
                        }}>
                            Target Container
                        </div>
                        <Dropdown
                            label="Select Container ID..."
                            value={selectedContainerId}
                            options={MOCK_CONTAINERS.map(c => c.id)}
                            onChange={setSelectedContainerId}
                            icon={<Package size={16} />}
                            fullWidth
                            variant="light"
                        />
                    </div>

                    {/* Divider */}
                    <div style={{
                        height: '1px',
                        background: 'linear-gradient(to right, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05))',
                        margin: '24px 0'
                    }} />

                    {/* Section 2: Position Hierarchy */}
                    <div>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#64748b',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            marginBottom: '12px'
                        }}>
                            Target Location
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Dropdown
                                    label="Terminal"
                                    value={selectedTerminal}
                                    options={terminals}
                                    onChange={setSelectedTerminal}
                                    icon={<MapPin size={14} />}
                                    flex={1}
                                    variant="light"
                                />
                                <Dropdown
                                    label="Block"
                                    value={selectedBlock}
                                    options={blocks}
                                    onChange={setSelectedBlock}
                                    disabled={!selectedTerminal}
                                    icon={<Grid3x3 size={14} />}
                                    flex={1}
                                    variant="light"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Dropdown
                                    label="Row"
                                    value={selectedRow}
                                    options={rows}
                                    onChange={setSelectedRow}
                                    disabled={!selectedBlock}
                                    icon={<ArrowRight size={14} />}
                                    flex={1}
                                    variant="light"
                                />
                                <Dropdown
                                    label="Lot"
                                    value={selectedLot}
                                    options={lots.map(l => l.toString())}
                                    onChange={setSelectedLot}
                                    disabled={!selectedRow}
                                    icon={<Box size={14} />}
                                    flex={1}
                                    variant="light"
                                />
                                <Dropdown
                                    label="Level"
                                    value={selectedLevel}
                                    options={levels.map(l => l.toString())}
                                    onChange={setSelectedLevel}
                                    disabled={!selectedLot}
                                    icon={<Layers size={14} />}
                                    flex={1}
                                    variant="light"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div style={{
                    padding: '24px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                    background: 'rgba(0,0,0,0.02)'
                }}>
                    <button
                        onClick={handlePlace}
                        disabled={!selectedContainerId || !selectedLevel}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: (!selectedContainerId || !selectedLevel)
                                ? 'rgba(0, 0, 0, 0.05)'
                                : 'var(--secondary-gradient)',
                            color: (!selectedContainerId || !selectedLevel)
                                ? 'rgba(75, 104, 108, 0.3)'
                                : 'var(--primary-color)',
                            fontSize: '14px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            cursor: (!selectedContainerId || !selectedLevel) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            textTransform: 'uppercase'
                        }}
                        onMouseEnter={e => {
                            if (selectedContainerId && selectedLevel) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(247, 207, 155, 0.25)';
                            }
                        }}
                        onMouseLeave={e => {
                            if (selectedContainerId && selectedLevel) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }
                        }}
                    >
                        <Container size={18} />
                        Place Container
                    </button>
                </div>
            </div>
        </>
    );
}

// --- Subcomponents ---

const SectionLabel = ({ label }: { label: string }) => (
    <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--secondary-color)',
        letterSpacing: '1px',
        opacity: 0.8
    }}>
        {label}
    </div>
);

const Dropdown = ({ label, value, options, onChange, disabled, icon, fullWidth, variant = 'dark', flex }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const bgStyle = variant === 'dark'
        ? (disabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)')
        : variant === 'light'
            ? (disabled ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.8)')
            : (disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)');

    const borderStyle = variant === 'dark'
        ? '1px solid rgba(255,255,255,0.1)'
        : variant === 'light'
            ? '1px solid rgba(0, 0, 0, 0.1)'
            : '1px solid rgba(255,255,255,0.1)';

    const textColor = variant === 'light' ? '#1e293b' : 'white';
    const placeholderColor = variant === 'light' ? '#64748b' : 'rgba(255,255,255,0.4)';
    const hoverBg = variant === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255,255,255,0.05)';

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: fullWidth ? '100%' : 'auto',
                flex: flex || 'none'
            }}
        >
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: bgStyle,
                    border: isOpen ? '1px solid var(--secondary-color)' : borderStyle,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    justifyContent: 'space-between'
                }}
                onMouseEnter={e => !disabled && (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => !disabled && (e.currentTarget.style.background = bgStyle)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    {icon && <span style={{ opacity: 0.7, color: textColor }}>{icon}</span>}
                    <span style={{
                        fontSize: '13px',
                        fontWeight: value ? 600 : 400,
                        color: value ? textColor : placeholderColor,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {value || label}
                    </span>
                </div>
                <ChevronDown size={14} style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    opacity: 0.5,
                    color: textColor
                }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    width: '100%',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: variant === 'light' ? 'white' : '#1e293b',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    padding: '4px'
                }} className="custom-scrollbar">
                    {options.map((opt: string) => (
                        <div
                            key={opt}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                transition: 'background 0.2s',
                                background: value === opt ? 'var(--secondary-color)' : 'transparent',
                                color: value === opt ? 'var(--primary-color)' : textColor,
                                fontWeight: value === opt ? 600 : 400
                            }}
                            onMouseEnter={e => {
                                if (value !== opt) e.currentTarget.style.background = variant === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
                            }}
                            onMouseLeave={e => {
                                if (value !== opt) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const iconButtonStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '6px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    transition: 'all 0.2s'
};
