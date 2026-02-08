import { useState, useEffect, useMemo, useRef } from 'react';
import PanelLayout from '../../shared/components/PanelLayout';
import { Truck, User, Loader2, CheckCircle, AlertTriangle, Search, X, ArrowLeft, Download, ChevronDown, FileText } from 'lucide-react';
import PremiumStateView from '../../../components/ui/feedback/PremiumStateView';
import { showToast } from '../../../components/ui/feedback/common/Toast';
import TruckLoader from '../../../components/ui/feedback/trucks/TruckLoader';
import { toPng } from 'html-to-image';
import Barcode from 'react-barcode';
import { useGateOutTrucksQuery, useGateOutTruckDetailsQuery, useSubmitGateOutMutation } from '../apis/gateApi';
import { theme } from '../../../themes/theme';

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
        background: `${theme.colors.primary}14`, // 0.08 opacity
        border: `1px solid ${theme.colors.primary}26`, // 0.15 opacity
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
    };

    const detailRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: `1px solid ${theme.colors.primary}1a` // 0.1 opacity
    };

    const truckCardStyle = {
        padding: '14px 16px',
        background: '#ffffff',
        border: `1px solid ${theme.colors.primary}26`, // 0.15 opacity
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
                background: theme.colors.background.primary,
                borderRadius: '18px',
                boxShadow: theme.shadows.card,
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Header Section */}
                <div style={{
                    background: theme.gradients.primary,
                    padding: '16px 20px',
                    color: theme.colors.text.inverted,
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
                        background: `${theme.colors.secondary}1a`, // 0.1 opacity
                        border: `1px solid ${theme.colors.secondary}4d`, // 0.3 opacity
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                    }}>
                        <span style={{ fontSize: '12px', color: theme.colors.text.secondary, fontWeight: 600 }}>Request Type</span>
                        <span style={{ fontSize: '13px', color: theme.colors.text.primary, fontWeight: 700 }}>
                            {truckDetails.shipmentName || '-'}
                        </span>
                    </div>

                    {/* Container Row */}
                    <div style={{
                        background: `${theme.colors.secondary}1a`,
                        border: `1px solid ${theme.colors.secondary}4d`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px'
                    }}>
                        <span style={{ fontSize: '12px', color: theme.colors.text.secondary, fontWeight: 600 }}>Container</span>
                        <span style={{ fontSize: '13px', color: theme.colors.text.primary, fontWeight: 700 }}>
                            {truckDetails.containerNumber || '-'}
                        </span>
                    </div>

                    <div style={{ height: '1px', background: theme.colors.border, marginBottom: '16px' }} />

                    {/* Gate & Shipment Info */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', color: theme.colors.text.secondary, fontWeight: 700, textTransform: 'uppercase' }}>Gate</div>
                            <div style={{ fontSize: '16px', color: theme.colors.error, fontWeight: 800, marginTop: '2px' }}>OUT</div>
                        </div>
                        <div style={{ flex: 2, textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: theme.colors.text.secondary, fontWeight: 700, textTransform: 'uppercase' }}>Shipment</div>
                            <div style={{ fontSize: '12px', color: theme.colors.text.primary, fontWeight: 600, marginTop: '2px' }}>
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
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: '12px',
                            color: theme.colors.text.primary,
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
                            background: theme.gradients.secondary,
                            border: 'none',
                            borderRadius: '12px',
                            color: theme.colors.primary,
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
                    background: isReady ? theme.gradients.secondary : `${theme.colors.primary}26`,
                    border: 'none',
                    borderRadius: '12px',
                    color: isReady ? theme.colors.primary : `${theme.colors.primary}66`,
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
                            color: theme.colors.primary,
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
                                    background: `${theme.colors.primary}1a`,
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
                                <X size={12} style={{ color: theme.colors.text.primary }} />
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
                                border: `1px solid ${theme.colors.primary}26`,
                                borderRadius: '10px',
                                background: `${theme.colors.primary}0a`,
                                fontSize: '14px',
                                fontWeight: 500,
                                color: theme.colors.text.primary,
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = theme.colors.primary;
                                e.currentTarget.style.background = `${theme.colors.primary}0f`;
                                e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.primary}14`;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = `${theme.colors.primary}26`;
                                e.currentTarget.style.background = `${theme.colors.primary}0a`;
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
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <PremiumStateView
                            type="empty"
                            graphic={
                                <div style={{ marginBottom: '16px', opacity: 0.5 }}>
                                    <Truck size={48} strokeWidth={1} color="#94A3B8" />
                                </div>
                            }
                            title={searchText ? 'No Truck Found' : 'No Trucks Waiting'}
                            description={searchText ? `We couldn't find any truck matching "${searchText}"` : "There are currently no trucks ready for Gate Out."}
                            action={searchText ? { label: "Clear Search", onClick: () => setSearchText('') } : undefined}
                            height="auto"
                        />
                    </div>
                ) : (
                    filteredTrucks.map((truck, index) => (
                        <div
                            key={index}
                            style={truckCardStyle}
                            onClick={() => handleSelectTruck(truck)}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = `${theme.colors.primary}14`;
                                e.currentTarget.style.borderColor = theme.colors.primary;
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = `${theme.colors.primary}26`;
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: theme.gradients.secondary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Truck size={20} style={{ color: theme.colors.primary }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: theme.colors.primary }}>{truck}</div>
                                <div style={{ fontSize: '12px', color: theme.colors.text.primary, opacity: 0.6 }}>Tap to view details</div>
                            </div>
                            <ChevronDown size={18} style={{ color: theme.colors.text.primary, opacity: 0.4, transform: 'rotate(-90deg)' }} />
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
                    background: `${theme.colors.error}1a`,
                    borderRadius: '12px',
                    color: theme.colors.error,
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
                                background: theme.gradients.secondary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Truck size={20} style={{ color: theme.colors.primary }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.primary }}>{truckDetails.truckNumber}</div>
                                <div style={{ fontSize: '12px', color: theme.colors.text.primary, opacity: 0.7 }}>Truck Details</div>
                            </div>
                        </div>
                        <span style={{
                            padding: '4px 10px',
                            background: `${theme.colors.error}1a`,
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: theme.colors.error,
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                        }}>
                            OUT
                        </span>
                    </div>

                    <div style={detailRowStyle}>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Driver Name</span>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverName || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Driver Iqama</span>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverIqama || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Shipment Name</span>
                        <span style={{
                            padding: '2px 8px',
                            background: `${theme.colors.error}1a`,
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: theme.colors.error
                        }}>
                            {truckDetails.shipmentName || 'N/A'}
                        </span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Shipment No</span>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.shipmentNumber || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Container</span>
                        <span style={{ color: theme.colors.primary, fontSize: '13px', fontWeight: 700 }}>{truckDetails.containerNumber || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Container Type</span>
                        <span style={{
                            padding: '2px 8px',
                            background: `${theme.colors.primary}1a`,
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: theme.colors.primary
                        }}>
                            {truckDetails.containerType || 'N/A'}
                        </span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Liner</span>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.customerName || 'N/A'}</span>
                    </div>
                    <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Order No</span>
                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.orderNumber || 'N/A'}</span>
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
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: theme.colors.primary, marginBottom: '8px' }}>Gate Out Successful</h3>
                    <p style={{ color: theme.colors.text.primary, opacity: 0.7, fontSize: '14px' }}>
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
