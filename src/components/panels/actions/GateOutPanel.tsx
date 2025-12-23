import { useState, useEffect, useMemo, useRef } from 'react';
import PanelLayout from '../PanelLayout';
import { Truck, User, Loader2, CheckCircle, AlertTriangle, Search, X, ArrowLeft, Download, ChevronDown, FileText } from 'lucide-react';
import { useGateOutTrucksQuery, useGateOutTruckDetailsQuery, useSubmitGateOutMutation } from '../../../api/handlers/gateApi';
import { showToast } from '../../ui/Toast';
import TruckLoader from '../../ui/animations/TruckLoader';
import { toPng } from 'html-to-image';
import Barcode from 'react-barcode';

interface GateOutPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GateOutPanel({ isOpen, onClose }: GateOutPanelProps) {
    // Search state
    const [searchText, setSearchText] = useState('');

    // Truck details state
    const [selectedTruck, setSelectedTruck] = useState<string>('');

    // Gate Out Steps: 'truck_list' -> 'review' -> 'success'
    const [step, setStep] = useState<'truck_list' | 'review' | 'success'>('truck_list');

    // Driver slip generation
    const slipRef = useRef<HTMLDivElement>(null);
    const [isGeneratingSlip, setIsGeneratingSlip] = useState(false);

    // API hooks - fetch all trucks ONCE on mount with empty search
    const { data: allTrucks = [], isLoading: isLoadingTrucks, refetch: refetchTrucks } = useGateOutTrucksQuery(
        '', // Always fetch all trucks with empty search
        isOpen // Enabled when panel is open
    );

    // Client-side filtering based on search text
    const filteredTrucks = useMemo(() => {
        if (!searchText.trim()) return allTrucks;
        const search = searchText.toUpperCase();
        return allTrucks.filter(truck => truck.toUpperCase().includes(search));
    }, [allTrucks, searchText]);

    // Details Hook
    const { data: truckDetails, isLoading: isLoadingDetails, isError } = useGateOutTruckDetailsQuery(
        selectedTruck,
        !!selectedTruck
    );

    // Submit Mutation
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
        setStep('truck_list');
        submitMutation.reset();
    };

    const handleSelectTruck = (truck: string) => {
        setSelectedTruck(truck);
        setStep('review');
    };

    const handleBackToList = () => {
        setSelectedTruck('');
        setStep('truck_list');
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

    // Handle generate driver slip (same as GateInPanel)
    const handleGenerateSlip = async () => {
        if (!truckDetails || !slipRef.current) return;

        setIsGeneratingSlip(true);
        try {
            // Generate PNG from the slip element with transparent background
            const dataUrl = await toPng(slipRef.current, {
                quality: 1,
                pixelRatio: 2,
                width: slipRef.current.scrollWidth,
                height: slipRef.current.scrollHeight,
                style: {
                    overflow: 'hidden' // Clip to border-radius
                }
            });

            // Create download link
            const link = document.createElement('a');
            link.download = `gate_out_slip_${truckDetails.truckNumber}_${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();

            showToast('success', 'Driver slip downloaded successfully');
        } catch (error) {
            console.error('Error generating slip:', error);
            showToast('error', 'Failed to generate driver slip');
        } finally {
            setIsGeneratingSlip(false);
        }
    };

    const handleDone = () => {
        handleReset();
        refetchTrucks();
        onClose();
    };

    // Styles
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

    const truckCardStyle = {
        padding: '14px 16px',
        background: '#ffffff',
        border: '1px solid rgba(75, 104, 108, 0.15)',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    // Derived State
    const requestType = truckDetails?.shipmentName?.toUpperCase() || '';
    const isDischarge = requestType === 'DISCHARGE LIST';

    // Formatting helpers
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).toUpperCase();
    };

    // Render Ticket Component (Success State) - matches Gate In Panel exactly
    const renderTicket = () => {
        if (!truckDetails) return null;

        return (
            <div ref={slipRef} className="driver-slip-ticket animate-fade-in" style={{
                background: '#ffffff',
                borderRadius: '18px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Header Section */}
                <div style={{
                    background: 'linear-gradient(135deg, #4B686C, #33455F)',
                    padding: '16px 20px',
                    color: 'white',
                    position: 'relative',
                    borderRadius: '18px 18px 0 0'
                }}>
                    {/* Top Metadata */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255,255,255,0.15)',
                        paddingBottom: '10px',
                        marginBottom: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '1px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={12} style={{ opacity: 0.8 }} />
                            <span>GATE PASS</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{formatDate(new Date())}</span>
                        </div>
                    </div>

                    {/* Truck Hero */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'rgba(255,255,255,0.18)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}>
                            <Truck size={24} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '1px', lineHeight: 1 }}>
                                {truckDetails.truckNumber}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', opacity: 0.9 }}>
                                <User size={12} color="white" />
                                <span style={{ fontSize: '13px', fontWeight: 500 }}>{truckDetails.driverName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative Divider */}
                <div style={{ height: '6px', background: 'linear-gradient(to right, #FAD5A5, #E8C89A, #D4AB79)' }} />

                {/* Ticket Body */}
                <div style={{ padding: '20px', background: '#ffffff', borderRadius: '0 0 18px 18px' }}>

                    {/* Request Type Row */}
                    <div style={{
                        background: 'rgba(250, 213, 165, 0.1)',
                        border: '1px solid rgba(250, 213, 165, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                    }}>
                        <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Request Type</span>
                        <span style={{ fontSize: '13px', color: '#333', fontWeight: 700 }}>
                            {truckDetails.shipmentName || '-'}
                        </span>
                    </div>

                    {/* Container Row */}
                    <div style={{
                        background: 'rgba(250, 213, 165, 0.1)',
                        border: '1px solid rgba(250, 213, 165, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px'
                    }}>
                        <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Container</span>
                        <span style={{ fontSize: '13px', color: '#333', fontWeight: 700 }}>
                            {truckDetails.containerNumber || '-'}
                        </span>
                    </div>

                    <div style={{ height: '1px', background: '#eaeaea', marginBottom: '16px' }} />

                    {/* Gate & Shipment Info */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Gate</div>
                            <div style={{ fontSize: '16px', color: '#ef4444', fontWeight: 800, marginTop: '2px' }}>OUT</div>
                        </div>
                        <div style={{ flex: 2, textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Shipment</div>
                            <div style={{ fontSize: '12px', color: '#333', fontWeight: 600, marginTop: '2px' }}>
                                {truckDetails.shipmentNumber || '-'}
                            </div>
                        </div>
                    </div>

                    {/* Perforation visual */}
                    <div style={{ margin: '16px 0', borderTop: '2px dashed #ddd', position: 'relative' }}>
                    </div>

                    {/* Barcode */}
                    <div style={{ textAlign: 'center' }}>
                        <Barcode
                            value={truckDetails.truckNumber || 'N/A'}
                            width={1.5}
                            height={40}
                            fontSize={10}
                            margin={0}
                            displayValue={true}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Render Footer Logic
    const renderFooter = () => {
        if (step === 'truck_list') {
            return null; // No footer on truck list
        }

        if (step === 'success') {
            return (
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button
                        onClick={handleGenerateSlip}
                        disabled={isGeneratingSlip}
                        style={{
                            flex: 1,
                            padding: '10px 24px',
                            background: '#ffffff',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            color: 'var(--text-color)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: isGeneratingSlip ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {isGeneratingSlip ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {isGeneratingSlip ? 'Generating...' : 'Download Slip'}
                    </button>
                    <button
                        onClick={handleDone}
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
        const buttonText = isDischarge ? 'Submit Gate Out' : 'Confirm Gate Out';

        return (
            <button
                onClick={handleSubmitGateOut}
                disabled={!isReady || submitMutation.isPending}
                style={{
                    width: '100%',
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
                    gap: '8px'
                }}
            >
                {submitMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                {buttonText}
            </button>
        );
    };

    // Render Truck List View
    const renderTruckListView = () => (
        <>
            {/* Search Bar - hide during initial load */}
            {!isLoadingTrucks && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--primary-color)',
                            opacity: 0.6
                        }} />
                        {searchText && !isLoadingTrucks && (
                            <button
                                onClick={() => setSearchText('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'rgba(75, 104, 108, 0.1)',
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
                                <X size={12} style={{ color: 'var(--text-color)' }} />
                            </button>
                        )}
                        <input
                            type="text"
                            placeholder="Search trucks..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            maxLength={10}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '12px 40px 12px 42px',
                                border: '1px solid rgba(75, 104, 108, 0.15)',
                                borderRadius: '10px',
                                background: 'rgba(75, 104, 108, 0.04)',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: 'var(--text-color)',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.background = 'rgba(75, 104, 108, 0.06)';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(75, 104, 108, 0.08)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(75, 104, 108, 0.15)';
                                e.currentTarget.style.background = 'rgba(75, 104, 108, 0.04)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Truck List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {isLoadingTrucks && allTrucks.length === 0 ? (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingBottom: '40px',
                        boxSizing: 'border-box'
                    }}>
                        <TruckLoader message="LOADING TRUCKS" subMessage="Checking for trucks ready to exit..." height="150px" />
                    </div>
                ) : filteredTrucks.length === 0 ? (
                    <div style={{
                        height: '80%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-color)',
                        opacity: 0.6,
                        paddingBottom: '40px'
                    }}>
                        <Truck size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <div>{searchText ? 'No trucks match your search' : 'No trucks waiting for Gate Out'}</div>
                    </div>
                ) : (
                    filteredTrucks.map((truck, index) => (
                        <div
                            key={index}
                            style={truckCardStyle}
                            onClick={() => handleSelectTruck(truck)}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(75, 104, 108, 0.08)';
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = 'rgba(75, 104, 108, 0.15)';
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'var(--secondary-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Truck size={20} style={{ color: 'var(--primary-color)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary-color)' }}>{truck}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.6 }}>Tap to view details</div>
                            </div>
                            <ChevronDown size={18} style={{ color: 'var(--text-color)', opacity: 0.4, transform: 'rotate(-90deg)' }} />
                        </div>
                    ))
                )}
            </div>
        </>
    );

    // Render Details View
    const renderDetailsView = () => (
        <>
            {/* Loading Details or Submitting */}
            {(isLoadingDetails || submitMutation.isPending) && (
                <div style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingBottom: '40px',
                    boxSizing: 'border-box'
                }}>
                    <TruckLoader
                        message={submitMutation.isPending ? "PROCESSING GATE OUT" : "RETRIEVING DETAILS"}
                        subMessage={submitMutation.isPending ? "Verifying and submitting data..." : "Fetching truck information..."}
                        height="200px"
                    />
                </div>
            )}

            {/* Error State */}
            {isError && !isLoadingDetails && (
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
            )}

            {/* Truck Details Card */}
            {truckDetails && !isLoadingDetails && !submitMutation.isPending && (
                <div style={cardStyle} className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.7 }}>Truck Details</div>
                            </div>
                        </div>
                        <span style={{
                            padding: '4px 10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#ef4444',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                        }}>
                            OUT
                        </span>
                    </div>

                    <div style={detailRowStyle}>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver Name</span>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverName || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver Iqama</span>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverIqama || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Shipment Name</span>
                        <span style={{
                            padding: '2px 8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#ef4444'
                        }}>
                            {truckDetails.shipmentName || 'N/A'}
                        </span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Shipment No</span>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.shipmentNumber || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Container</span>
                        <span style={{ color: 'var(--primary-color)', fontSize: '13px', fontWeight: 700 }}>{truckDetails.containerNumber || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Container Type</span>
                        <span style={{
                            padding: '2px 8px',
                            background: 'rgba(75, 104, 108, 0.1)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--primary-color)'
                        }}>
                            {truckDetails.containerType || 'N/A'}
                        </span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Liner</span>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.customerName || 'N/A'}</span>
                    </div>
                    <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Order No</span>
                        <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.orderNumber || 'N/A'}</span>
                    </div>
                </div>
            )}
        </>
    );

    // Render Success View - always show the slip like GateInPanel
    const renderSuccessView = () => {
        if (!truckDetails) {
            return (
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
                        Operation completed successfully.
                    </p>
                </div>
            );
        }

        return (
            <div style={{ height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div style={{ padding: '25px', width: '100%', maxWidth: '390px' }}>
                    {renderTicket()}
                    {/* Bottom Spacer */}
                    <div style={{ height: '20px' }} />
                </div>
            </div>
        );
    };

    return (
        <PanelLayout
            title="Gate Out"
            category="GATE OPERATION"
            titleBadge={step === 'truck_list' && (
                <span style={{
                    padding: '4px 10px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600
                }}>
                    {filteredTrucks.length} truck{filteredTrucks.length !== 1 ? 's' : ''}
                </span>
            )}
            isOpen={isOpen}
            onClose={onClose}
            footerActions={renderFooter()}
            headerActions={step === 'review' && (
                <button
                    onClick={handleBackToList}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        padding: 0,
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
                    title="Back to truck list"
                >
                    <ArrowLeft size={18} />
                </button>
            )}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {step === 'truck_list' && renderTruckListView()}
                {step === 'review' && renderDetailsView()}
                {step === 'success' && renderSuccessView()}
            </div>
        </PanelLayout>
    );
}
