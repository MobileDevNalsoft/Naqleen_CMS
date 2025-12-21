import React, { useState, useEffect } from 'react';
import PanelLayout from '../PanelLayout';
import { Truck, FileText, User, Box, Loader2, CheckCircle, Printer, AlertTriangle } from 'lucide-react';
import { useGateOutTrucksQuery, useGateOutTruckDetailsQuery, useSubmitGateOutMutation } from '../../../api/handlers/gateApi';
import { showToast } from '../../ui/Toast';

interface GateOutPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Reuse debounce from GateInPanel or extract it? I'll re-implement for now to be safe.
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function GateOutPanel({ isOpen, onClose }: GateOutPanelProps) {
    const [searchText, setSearchText] = useState('');
    const [selectedTruck, setSelectedTruck] = useState<string>('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Gate Out Steps: 'search' -> 'review' -> 'success'
    const [step, setStep] = useState<'search' | 'review' | 'success'>('search');

    const debouncedSearch = useDebounce(searchText, 300);

    // 1. Search Hook
    const { data: truckSuggestions = [], isLoading: isSearching } = useGateOutTrucksQuery(
        debouncedSearch,
        showSuggestions && debouncedSearch.length >= 3
    );

    // 2. Details Hook
    const { data: truckDetails, isLoading: isLoadingDetails, isError } = useGateOutTruckDetailsQuery(
        selectedTruck,
        !!selectedTruck
    );

    // 3. Submit Mutation
    const submitMutation = useSubmitGateOutMutation();

    // Reset when panel closes
    useEffect(() => {
        if (!isOpen) {
            handleReset();
        }
    }, [isOpen]);

    const handleReset = () => {
        setSearchText('');
        setSelectedTruck('');
        setShowSuggestions(false);
        setStep('search');
        submitMutation.reset();
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        setSearchText(val);
        setShowSuggestions(true);
        if (selectedTruck) {
            setSelectedTruck('');
            setStep('search');
        }
    };

    const handleSelectTruck = (truck: string) => {
        setSearchText(truck);
        setSelectedTruck(truck);
        setShowSuggestions(false);
        setStep('review');
    };

    const handleSubmitGateOut = () => {
        if (!truckDetails) return;

        submitMutation.mutate({
            shipment_nbr: truckDetails.shipmentNumber,
            truck_nbr: truckDetails.truckNumber
        }, {
            onSuccess: () => {
                showToast('success', 'Gate Out submitted successfully');
                setStep('success');
            },
            onError: () => {
                showToast('error', 'Failed to submit Gate Out');
            }
        });
    };

    // Styles (copied/adapted from GateInPanel for consistency)
    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--primary-color)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    };

    const cardStyle = {
        background: 'rgba(75, 104, 108, 0.08)',
        border: '1px solid rgba(75, 104, 108, 0.15)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
    };

    const detailRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid rgba(75, 104, 108, 0.1)'
    };

    const dropdownStyle = {
        position: 'absolute' as const,
        top: '100%',
        left: 0,
        right: 0,
        background: '#ffffff',
        border: '1px solid rgba(75, 104, 108, 0.2)',
        borderRadius: '8px',
        marginTop: '4px',
        maxHeight: '200px',
        overflowY: 'auto' as const,
        zIndex: 100,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
    };

    const dropdownItemStyle = {
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'background 0.2s',
        borderBottom: '1px solid rgba(75, 104, 108, 0.08)'
    };

    // Footer actions
    const renderFooter = () => {
        if (step === 'success') {
            const showSlip = truckDetails?.shipmentName !== 'DISCHARGE LIST';
            return (
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    {showSlip && (
                        <button
                            onClick={() => window.print()}
                            style={{
                                flex: 1,
                                padding: '10px 24px',
                                background: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                color: 'var(--text-color)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Printer size={16} /> Print Slip
                        </button>
                    )}
                    <button
                        onClick={() => {
                            handleReset();
                            onClose();
                        }}
                        style={{
                            flex: 1,
                            padding: '10px 24px',
                            background: 'var(--secondary-gradient)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'var(--primary-color)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Done
                    </button>
                </div>
            );
        }

        const isReady = step === 'review' && !!truckDetails && !isLoadingDetails;

        return (
            <button
                onClick={handleSubmitGateOut}
                disabled={!isReady || submitMutation.isPending}
                style={{
                    padding: '10px 24px',
                    background: isReady ? 'var(--secondary-gradient)' : 'rgba(75, 104, 108, 0.15)',
                    border: 'none',
                    borderRadius: '12px',
                    color: isReady ? 'var(--primary-color)' : 'rgba(75, 104, 108, 0.4)',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: isReady ? 'pointer' : 'not-allowed',
                    boxShadow: isReady ? '0 4px 12px rgba(247, 207, 155, 0.3)' : 'none',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%' // Full width button in footer
                }}
            >
                {submitMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Confirm Gate Out
            </button>
        );
    };

    return (
        <PanelLayout
            title="Gate Out"
            category="GATE OPERATION"
            isOpen={isOpen}
            onClose={onClose}
            footerActions={renderFooter()}
        >
            {step !== 'success' && (
                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Truck Number *</label>
                    <div style={{ position: 'relative' }}>
                        <Truck size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                        {isSearching && (
                            <Loader2 size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} className="animate-spin" />
                        )}
                        <input
                            type="text"
                            placeholder="Enter truck number (min 3 chars)"
                            value={searchText}
                            onChange={handleSearchChange}
                            onFocus={() => searchText.length >= 3 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="modern-input"
                            style={{ paddingLeft: '48px', paddingRight: isSearching ? '48px' : '14px' }}
                            disabled={step === 'review' && isLoadingDetails}
                        />

                        {/* Suggestions dropdown */}
                        {showSuggestions && truckSuggestions.length > 0 && (
                            <div style={dropdownStyle}>
                                {truckSuggestions.map((truck, index) => (
                                    <div
                                        key={index}
                                        style={dropdownItemStyle}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(75, 104, 108, 0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onMouseDown={() => handleSelectTruck(truck)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Truck size={14} style={{ color: 'var(--primary-color)' }} />
                                            <span style={{ color: 'var(--text-color)', fontWeight: 500 }}>{truck}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 'review' && (
                <>
                    {isLoadingDetails ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 10px' }} />
                            <p style={{ color: 'var(--text-color)', opacity: 0.6 }}>Loading truck details...</p>
                        </div>
                    ) : isError ? (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '12px',
                            color: '#ef4444',
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <AlertTriangle size={20} />
                            <div>
                                <div style={{ fontWeight: 600 }}>Truck Not Found</div>
                                <div style={{ fontSize: '13px', opacity: 0.8 }}>Could not find details for {selectedTruck}.</div>
                            </div>
                        </div>
                    ) : truckDetails && (
                        <div style={cardStyle} className="animate-fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: 'var(--secondary-gradient)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Truck size={20} style={{ color: 'var(--primary-color)' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-color)' }}>{truckDetails.truckNumber}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.7 }}>Ready for Gate Out</div>
                                </div>
                            </div>

                            <div style={detailRowStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <User size={14} style={{ opacity: 0.5 }} />
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver</span>
                                </div>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverName}</span>
                            </div>

                            <div style={detailRowStyle}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Iqama</span>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverIqama}</span>
                            </div>

                            <div style={detailRowStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Box size={14} style={{ opacity: 0.5 }} />
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Container</span>
                                </div>
                                <span style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 700 }}>{truckDetails.containerNumber}</span>
                            </div>

                            <div style={detailRowStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={14} style={{ opacity: 0.5 }} />
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Shipment</span>
                                </div>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.shipmentNumber}</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {step === 'success' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <CheckCircle size={32} color="#22c55e" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>Gate Out Successful</h3>
                    <p style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '14px' }}>
                        Truck <strong>{selectedTruck}</strong> has been processed.
                    </p>
                </div>
            )}
        </PanelLayout>
    );
}
