
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, CheckCircle, Printer, Truck, ArrowRight, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { showToast } from '../../ui/Toast';
import { yardApi } from '../../../api/handlers/yardApi';
import PanelLayout from '../PanelLayout';
import type {
    PositionTruckDetails
} from '../../../api/types/yardTypes';

interface PositionContainerPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PositionContainerPanel({ isOpen, onClose }: PositionContainerPanelProps) {
    const [step, setStep] = useState<'search' | 'success'>('search');

    // Truck Search State
    const [truckNumber, setTruckNumber] = useState('');
    const [selectedTruck, setSelectedTruck] = useState<PositionTruckDetails | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Position State
    const [selectedPosition, setSelectedPosition] = useState('');

    // --- API Queries ---

    // 1. Truck Search Query (Suggestions)
    const { data: truckSuggestions } = useQuery({
        queryKey: ['positionTrucks', truckNumber],
        queryFn: () => yardApi.getPositionTrucks({ searchText: truckNumber }),
        enabled: truckNumber.length >= 3,
        select: (res) => res.data || []
    });

    // 2. Fetch Truck Details
    const { mutate: fetchTruckDetails, isPending: isLoadingDetails } = useMutation({
        mutationFn: yardApi.getPositionTruckDetails,
        onSuccess: (res) => {
            if (res.responseCode === 200 && res.data) {
                setSelectedTruck(res.data);
                showToast('success', 'Truck details loaded');
            } else {
                showToast('error', res.responseMessage || 'Truck not found');
                setSelectedTruck(null);
            }
        },
        onError: () => showToast('error', 'Failed to fetch truck details')
    });

    // 3. Submit Position
    const { mutate: submitPosition, isPending: isSubmitting } = useMutation({
        mutationFn: yardApi.submitContainerPosition,
        onSuccess: (res) => {
            if (res.responseCode === 200) {
                showToast('success', 'Container Positioned Successfully');
                setStep('success');
            } else {
                showToast('error', res.responseMessage || 'Failed to position container');
            }
        },
        onError: (err: any) => showToast('error', err.message || 'Submission failed')
    });


    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset when panel closes
    useEffect(() => {
        if (!isOpen) {
            setTruckNumber('');
            setSelectedTruck(null);
            setSelectedPosition('');
            setStep('search');
            setShowSuggestions(false);
        }
    }, [isOpen]);

    const handleSearchSelect = (truck: string) => {
        setTruckNumber(truck);
        setShowSuggestions(false);
        fetchTruckDetails({ truckNbr: truck });
    };

    const handlePlace = () => {
        if (!selectedTruck || !selectedPosition) return;

        submitPosition({
            shipmentNbr: selectedTruck.shipmentNbr,
            containerNbr: selectedTruck.containerNbr,
            position: selectedPosition
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

        const isEnabled = selectedTruck && selectedPosition && !isSubmitting;

        return (
            <button
                onClick={handlePlace}
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
                        Confirm Position <ArrowRight size={16} />
                    </>
                )}
            </button>
        );
    };

    return (
        <PanelLayout
            title="CONTAINER"
            category="POSITIONING"
            isOpen={isOpen}
            onClose={onClose}
            footerActions={renderFooter()}
        >
            <style>{`
    .custom - scrollbar:: -webkit - scrollbar { width: 4px; }
                .custom - scrollbar:: -webkit - scrollbar - track { background: rgba(0, 0, 0, 0.05); }
                .custom - scrollbar:: -webkit - scrollbar - thumb { background: rgba(0, 0, 0, 0.2); borderRadius: 4px; }
`}</style>

            {/* Search Section */}
            <div style={{ marginBottom: '32px' }} ref={searchRef}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                    Identify Truck
                </div>
                <div style={{ position: 'relative' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px',
                        padding: '4px 4px 4px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                        <Search size={18} color="#94a3b8" />
                        <input
                            type="text"
                            value={truckNumber}
                            onChange={(e) => {
                                setTruckNumber(e.target.value.toUpperCase());
                                setShowSuggestions(true);
                            }}
                            placeholder="Search truck number..." // e.g., TRK-1001
                            disabled={step === 'success'}
                            style={{
                                border: 'none', outline: 'none', width: '100%', padding: '12px',
                                fontSize: '14px', color: '#1e293b', fontWeight: 500
                            }}
                        />
                        {truckNumber && (
                            <button
                                onClick={() => setTruckNumber('')}
                                style={{
                                    border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px',
                                    color: '#94a3b8', display: 'flex', alignItems: 'center'
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                        {isLoadingDetails && (
                            <div style={{ padding: '8px' }}>
                                <Loader2 className="animate-spin" size={16} color="#4B686C" />
                            </div>
                        )}
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && truckSuggestions && truckSuggestions.length > 0 && step !== 'success' && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                            background: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                            zIndex: 100, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            {truckSuggestions.map((truck) => (
                                <div
                                    key={truck}
                                    onClick={() => handleSearchSelect(truck)}
                                    style={{
                                        padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                        fontSize: '14px', color: '#334155', transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Truck size={14} color="#64748b" />
                                        {truck}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Truck Details Card */}
            {selectedTruck && (
                <div style={{
                    padding: '20px', background: 'white', borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Truck Number</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{selectedTruck.truckNbr}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Driver</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{selectedTruck.driverNbr}</div>
                        </div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Container</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{selectedTruck.containerNbr || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Type</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{selectedTruck.containerType || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Position Selection Section */}
            {step !== 'success' && selectedTruck && (
                <PositionSelectors
                    containerType={selectedTruck.containerType}
                    onPositionChange={setSelectedPosition}
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
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Positioning Successful</h3>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>
                        Container <strong>{selectedTruck?.containerNbr}</strong> has been positioned at <strong>{selectedPosition}</strong>.
                    </p>
                </div>
            )}
        </PanelLayout>
    );
}

// Helper Component for Cascading Dropdowns
const PositionSelectors = ({ containerType, onPositionChange }: { containerType: string, onPositionChange: (pos: string) => void }) => {
    const [terminal, setTerminal] = useState('');
    const [block, setBlock] = useState('');
    const [lot, setLot] = useState('');
    const [row, setRow] = useState('');
    const [level, setLevel] = useState('');

    // Query Available Options
    const { data: termData } = useQuery({
        queryKey: ['posInit', containerType],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'I', containerType }),
        select: res => res.data
    });

    const { data: blockData } = useQuery({
        queryKey: ['posBlock', terminal],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'T', containerType, terminal }),
        enabled: !!terminal,
        select: res => res.data
    });

    const { data: lotData } = useQuery({
        queryKey: ['posLot', block],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'B', containerType, terminal, block }),
        enabled: !!block,
        select: res => res.data
    });

    const { data: rowData } = useQuery({
        queryKey: ['posRow', lot],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'L', containerType, terminal, block, lot }),
        enabled: !!lot,
        select: res => res.data
    });

    const { data: levelData } = useQuery({
        queryKey: ['posLevel', row],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'R', containerType, terminal, block, lot, row }),
        enabled: !!row,
        select: res => res.data
    });

    // Auto-update parent
    useEffect(() => {
        if (terminal && block && lot && row && level) {
            onPositionChange(`${terminal} -${block} -${lot} -${row} -${level} `);
        } else {
            onPositionChange('');
        }
    }, [terminal, block, lot, row, level]);

    // Auto-select level if single value available (optional UI enhancement)
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
                    <Dropdown label="Terminal" value={terminal} options={termData?.terminals || []} onChange={(v: string) => { setTerminal(v); setBlock(''); setLot(''); setRow(''); setLevel(''); }} flex={1} />
                    <Dropdown label="Block" value={block} options={blockData?.blocks || []} onChange={(v: string) => { setBlock(v); setLot(''); setRow(''); setLevel(''); }} disabled={!terminal} flex={1} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Dropdown label="Lot" value={lot} options={lotData?.lots || []} onChange={(v: string) => { setLot(v); setRow(''); setLevel(''); }} disabled={!block} flex={1} />
                    <Dropdown label="Row" value={row} options={rowData?.rows || []} onChange={(v: string) => { setRow(v); setLevel(''); }} disabled={!lot} flex={1} />
                    <Dropdown label="Level" value={level} options={levelData?.level ? [levelData.level.toString()] : []} onChange={setLevel} disabled={!row} flex={1} />
                </div>
            </div>
        </div>
    );
};


const Dropdown = ({ label, value, options, onChange, disabled, flex }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{ flex: flex || 'none', position: 'relative' }}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    padding: '10px 12px', background: disabled ? '#f1f5f9' : 'white', borderRadius: '8px',
                    border: '1px solid #cbd5e1', cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
            >
                <span style={{ fontSize: '13px', color: value ? '#0f172a' : '#94a3b8', fontWeight: value ? 600 : 400 }}>
                    {value || label}
                </span>
                <ChevronDown size={14} color="#94a3b8" />
            </div>
            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 200, maxHeight: '200px', overflowY: 'auto'
                }}>
                    {options.map((opt: string) => (
                        <div key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                            className="hover-bg-slate-50">
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
