import { useState, useEffect } from 'react';
import { ChevronDown, MapPin, Container, CheckCircle, Printer, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { showToast } from '../../ui/Toast';
import { yardApi } from '../../../api/handlers/yardApi';
import PanelLayout from '../PanelLayout';
import { useUIStore } from '../../../store/uiStore';

interface RestackContainersPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RestackContainersPanel({ isOpen, onClose }: RestackContainersPanelProps) {
    const [step, setStep] = useState<'select' | 'success'>('select');
    const panelData = useUIStore(state => state.panelData);

    // Container info from panelData (passed from Container Details Panel)
    const containerId = panelData?.containerId || '';
    const currentPosition = panelData?.currentPosition || ''; // Format: TRM-A-A-1-2
    const containerType = panelData?.containerType || '20';

    // Target Position State
    const [newPosition, setNewPosition] = useState('');

    // Submit Restack Mutation
    const { mutate: submitRestack, isPending: isSubmitting } = useMutation({
        mutationFn: yardApi.restackContainer,
        onSuccess: (res) => {
            if (res.responseCode === 200) {
                showToast('success', 'Restack submitted successfully');
                setStep('success');
            } else {
                showToast('error', res.responseMessage || 'Restack failed');
            }
        },
        onError: (err: any) => showToast('error', err.message || 'Restack failed')
    });

    // Reset when panel opens/closes
    useEffect(() => {
        if (!isOpen) {
            setNewPosition('');
            setStep('select');
        }
    }, [isOpen]);

    const handleRestack = () => {
        if (!containerId || !newPosition) return;

        submitRestack({
            container_nbr: containerId,
            newPosition: newPosition,
            currentPosition: currentPosition,
            timestamp: new Date().toISOString()
        });
    };

    const renderFooter = () => {
        if (step === 'success') {
            return (
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button onClick={() => window.print()} style={{
                        flex: 1, padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600
                    }}>
                        <Printer size={16} /> Print Slip
                    </button>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '12px', background: '#4B686C', border: 'none', borderRadius: '12px',
                        color: 'white', fontWeight: 700, cursor: 'pointer'
                    }}>
                        Done
                    </button>
                </div>
            );
        }

        const isEnabled = containerId && newPosition && !isSubmitting;

        return (
            <button
                onClick={handleRestack}
                disabled={!isEnabled}
                style={{
                    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                    background: !isEnabled ? 'rgba(0,0,0,0.1)' : 'var(--secondary-gradient)',
                    color: !isEnabled ? '#94a3b8' : 'var(--primary-color)',
                    fontWeight: 700, cursor: !isEnabled ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s'
                }}
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (
                    <>
                        Confirm Restack <Container size={18} />
                    </>
                )}
            </button>
        );
    };

    // Parse current position for breadcrumb display: TRM-A-A-1-2 -> [Terminal, Block, Lot, Row, Level]
    const positionParts = currentPosition.split('-');
    const [terminalPart, blockPart, lotPart, rowPart, levelPart] = positionParts;

    // Location breadcrumb component to pass to subtitle
    const renderLocationBreadcrumb = () => {
        if (!currentPosition) return null;
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '4px'
            }}>
                <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <MapPin size={10} color="white" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {terminalPart && (
                        <>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{terminalPart}</span>
                            <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
                        </>
                    )}
                    {blockPart && (
                        <>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{blockPart}</span>
                            <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
                        </>
                    )}
                    {lotPart && (
                        <>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Lot {lotPart}</span>
                            <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
                        </>
                    )}
                    {rowPart && (
                        <>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Row {rowPart}</span>
                            <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
                        </>
                    )}
                    {levelPart && (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Level {levelPart}</span>
                    )}
                </div>
            </div>
        );
    };

    // Type badge to match Container Details (same style as in that panel)
    const renderTypeBadge = () => (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(243, 239, 239, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            marginTop: '4px'
        }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e7e7e7ff', boxShadow: '0 0 6px #e7e7e7ff' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e7e7e7ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {containerType}
            </span>
        </div>
    );

    // When closing restack panel, just close - Container Details will reopen automatically
    // because selectId remains set in the global store
    const handleClose = () => {
        onClose(); // Close this panel - ContainerDetailsPanel will show since selectId is still set
    };

    return (
        <PanelLayout
            title={containerId || 'CONTAINER'}
            category="RESTACKING"
            titleBadge={containerId ? renderTypeBadge() : undefined}
            subtitle={renderLocationBreadcrumb()}
            isOpen={isOpen}
            onClose={handleClose}
            footerActions={renderFooter()}
            fitContent
        >
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); borderRadius: 4px; }
            `}</style>

            {/* Position Selector - Always visible on select step */}
            {step === 'select' && (
                <PositionSelectors
                    containerType={containerType}
                    onPositionChange={setNewPosition}
                />
            )}

            {/* Success Message */}
            {step === 'success' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{
                        width: '64px', height: '64px', background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                    }}>
                        <CheckCircle size={32} color="#22c55e" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Restack Successful</h3>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>
                        Container <strong>{containerId}</strong> has been moved to <strong>{newPosition}</strong>.
                    </p>
                </div>
            )}
        </PanelLayout>
    );
}

// Position Selectors Component (same as PositionContainerPanel)
const PositionSelectors = ({ containerType, onPositionChange }: { containerType: string, onPositionChange: (pos: string) => void }) => {
    const [terminal, setTerminal] = useState('');
    const [block, setBlock] = useState('');
    const [lot, setLot] = useState('');
    const [row, setRow] = useState('');
    const [level, setLevel] = useState('');

    // Track which dropdown is currently open (only one at a time)
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Query Available Options
    const { data: termData, isLoading: isLoadingTerminals } = useQuery({
        queryKey: ['posInit', containerType],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'I', containerType }),
        select: res => res.data
    });

    const { data: blockData, isLoading: isLoadingBlocks } = useQuery({
        queryKey: ['posBlock', terminal],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'T', containerType, terminal }),
        enabled: !!terminal,
        select: res => res.data
    });

    const { data: lotData, isLoading: isLoadingLots } = useQuery({
        queryKey: ['posLot', block],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'B', containerType, terminal, block }),
        enabled: !!block,
        select: res => res.data
    });

    const { data: rowData, isLoading: isLoadingRows } = useQuery({
        queryKey: ['posRow', lot],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'L', containerType, terminal, block, lot }),
        enabled: !!lot,
        select: res => res.data
    });

    const { data: levelData, isLoading: isLoadingLevels } = useQuery({
        queryKey: ['posLevel', row],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'R', containerType, terminal, block, lot, row }),
        enabled: !!row,
        select: res => res.data
    });

    // Auto-update parent
    useEffect(() => {
        if (terminal && block && lot && row && level) {
            onPositionChange(`${terminal}-${block}-${lot}-${row}-${level}`);
        } else {
            onPositionChange('');
        }
    }, [terminal, block, lot, row, level]);

    // Auto-select level if single value available
    useEffect(() => {
        if (levelData?.level) {
            setLevel(levelData.level.toString());
        }
    }, [levelData]);

    return (
        <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                New Location
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Dropdown
                        id="terminal"
                        label="Terminal"
                        value={terminal}
                        options={termData?.terminals || []}
                        onChange={(v: string) => { setTerminal(v); setBlock(''); setLot(''); setRow(''); setLevel(''); }}
                        isLoading={isLoadingTerminals}
                        isOpen={openDropdown === 'terminal'}
                        onToggle={(isOpen) => setOpenDropdown(isOpen ? 'terminal' : null)}
                        flex={1}
                    />
                    <Dropdown
                        id="block"
                        label="Block"
                        value={block}
                        options={blockData?.blocks || []}
                        onChange={(v: string) => { setBlock(v); setLot(''); setRow(''); setLevel(''); }}
                        disabled={!terminal}
                        isLoading={isLoadingBlocks}
                        isOpen={openDropdown === 'block'}
                        onToggle={(isOpen) => setOpenDropdown(isOpen ? 'block' : null)}
                        flex={1}
                    />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Dropdown
                        id="lot"
                        label="Lot"
                        value={lot}
                        options={lotData?.lots || []}
                        onChange={(v: string) => { setLot(v); setRow(''); setLevel(''); }}
                        disabled={!block}
                        isLoading={isLoadingLots}
                        isOpen={openDropdown === 'lot'}
                        onToggle={(isOpen) => setOpenDropdown(isOpen ? 'lot' : null)}
                        flex={1}
                    />
                    <Dropdown
                        id="row"
                        label="Row"
                        value={row}
                        options={rowData?.rows || []}
                        onChange={(v: string) => { setRow(v); setLevel(''); }}
                        disabled={!lot}
                        isLoading={isLoadingRows}
                        isOpen={openDropdown === 'row'}
                        onToggle={(isOpen) => setOpenDropdown(isOpen ? 'row' : null)}
                        flex={1}
                    />
                    <Dropdown
                        id="level"
                        label="Level"
                        value={level}
                        options={levelData?.level ? [levelData.level.toString()] : []}
                        onChange={setLevel}
                        disabled={!row}
                        isLoading={isLoadingLevels}
                        isOpen={openDropdown === 'level'}
                        onToggle={(isOpen) => setOpenDropdown(isOpen ? 'level' : null)}
                        flex={1}
                    />
                </div>
            </div>
        </div>
    );
};

interface DropdownProps {
    id: string;
    label: string;
    value: string;
    options: string[];
    onChange: (val: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
    isOpen: boolean;
    onToggle: (isOpen: boolean) => void;
    flex?: number;
}

const Dropdown = ({ label, value, options, onChange, disabled, isLoading, isOpen, onToggle, flex }: DropdownProps) => {
    return (
        <div style={{ flex: flex || 'none', position: 'relative' }}>
            <div
                onClick={() => !disabled && !isLoading && onToggle(!isOpen)}
                style={{
                    padding: '10px 12px', background: disabled ? '#f1f5f9' : 'white', borderRadius: '8px',
                    border: '1px solid #cbd5e1', cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
            >
                <span style={{ fontSize: '13px', color: value ? '#0f172a' : '#94a3b8', fontWeight: value ? 600 : 400 }}>
                    {value || label}
                </span>
                {isLoading ? (
                    <Loader2 size={14} className="animate-spin" color="#4B686C" />
                ) : (
                    <ChevronDown size={14} color="#94a3b8" />
                )}
            </div>
            {isOpen && !isLoading && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 200, maxHeight: '200px', overflowY: 'auto'
                }}>
                    {options.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '13px', color: '#94a3b8' }}>No options</div>
                    ) : (
                        options.map((opt: string) => (
                            <div key={opt}
                                onClick={() => { onChange(opt); onToggle(false); }}
                                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                                {opt}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

