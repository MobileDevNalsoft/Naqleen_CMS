import { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PanelLayout from '../../shared/components/PanelLayout';
import { Truck, User, Loader2, CheckCircle, AlertTriangle, Search, X, ArrowLeft, Download, ChevronDown, FileText, Upload } from 'lucide-react';
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
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchText);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchText]);

    // Truck details state
    const [selectedTruck, setSelectedTruck] = useState<string>('');

    // Gate Out Steps: 'truck_list' -> 'review'
    const [step, setStep] = useState<'truck_list' | 'review'>('truck_list');

    // Tabbed state for multiple shipments
    const [activeTab, setActiveTab] = useState(0);
    const [tabStatuses, setTabStatuses] = useState<Record<number, 'review' | 'success'>>({});

    // Driver slip generation
    const slipRef = useRef<HTMLDivElement>(null);
    const [isGeneratingSlip, setIsGeneratingSlip] = useState(false);

    // API hooks - fetch trucks based on search
    const { data: allTrucks = [], isLoading: isLoadingTrucks, refetch: refetchTrucks } = useGateOutTrucksQuery(
        debouncedSearch.trim(), // Use debounced search for server-side filtering
        isOpen // Enabled when panel is open
    );

    // Client-side filtering based on search text
    const filteredTrucks = useMemo(() => {
        if (!searchText.trim()) return allTrucks;
        const search = searchText.toUpperCase();
        return allTrucks.filter(truck => truck.toUpperCase().includes(search));
    }, [allTrucks, searchText]);

    // Details Hook
    const { data: truckDetailsArray = [], isLoading: isLoadingDetails, isError } = useGateOutTruckDetailsQuery(
        selectedTruck,
        !!selectedTruck
    );

    // Submit Mutation
    const submitMutation = useSubmitGateOutMutation();
    const queryClient = useQueryClient();

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
        setActiveTab(0);
        setTabStatuses({});
        submitMutation.reset();
    };

    const handleSelectTruck = (truck: string) => {
        setSelectedTruck(truck);
        setStep('review');
    };

    const handleBackToList = () => {
        setSelectedTruck('');
        setStep('truck_list');
        setActiveTab(0);
        setTabStatuses({});
    };

    const handleSubmitGateOut = async () => {
        if (truckDetailsArray.length === 0) return;
        const currentDetails = truckDetailsArray[activeTab];
        if (!currentDetails) return;

        try {
            await submitMutation.mutateAsync({
                shipment_nbr: currentDetails.shipmentNumber,
                truck_nbr: currentDetails.truckNumber
            });
            showToast('success', `Gate Out submitted for ${currentDetails.shipmentNumber || `container ${activeTab + 1}`}`);

            setTabStatuses(prev => ({
                ...prev,
                [activeTab]: 'success'
            }));

        } catch (error) {
            showToast('error', 'Failed to submit Gate Out');
        }
    };

    // Handle generate driver slip (same as GateInPanel)
    const handleGenerateSlip = async () => {
        if (truckDetailsArray.length === 0 || !slipRef.current) return;

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

            const link = document.createElement('a');
            const currentDetails = truckDetailsArray[activeTab];
            const truckNbr = currentDetails?.truckNumber || 'Unknown';
            const shipmentNbr = currentDetails?.shipmentNumber || `Container_${activeTab + 1}`;
            link.download = `gate_out_slip_${truckNbr}_${shipmentNbr}_${new Date().toISOString().split('T')[0]}.png`;
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
        queryClient.invalidateQueries({ queryKey: ['gate-out-truck-details'] });
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
    const activeTruck = truckDetailsArray[activeTab];
    const requestType = activeTruck?.shipmentName?.toUpperCase() || '';
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

    // Render Ticket Component (Success State) - specific to active shipment
    // Render Ticket Component (Success State) - specific to active shipment
    const renderTicket = (details: NonNullable<Parameters<typeof useGateOutTruckDetailsQuery>[0]> | any) => {
        if (!details) return null;

        const logoUrl = `${import.meta.env.BASE_URL || '/'}assets/images/naqleen_logo.png`.replace('//', '/');

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
                    background: '#2A3C4A', // Using a dark blueish/greyish gradient matching the image
                    backgroundImage: 'linear-gradient(to bottom, #395264, #21303d)',
                    padding: '24px 20px',
                    color: 'white',
                    position: 'relative',
                    borderRadius: '18px 18px 0 0'
                }}>
                    {/* Top Metadata */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255,255,255,0.15)',
                        paddingBottom: '12px',
                        marginBottom: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '1px',
                        color: 'rgba(255,255,255,0.8)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={12} style={{ opacity: 0.9 }} />
                            <span>GATE PASS</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{formatDate(new Date())}</span>
                        </div>
                    </div>

                    {/* Truck Hero */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                background: 'rgba(255,255,255,0.15)',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1)'
                            }}>
                                <Truck size={28} color="white" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '1px', lineHeight: 1 }}>
                                    {details.truckNumber}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9 }}>
                                    <User size={12} color="white" />
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{details.driverName}</span>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>

                {/* Decorative Divider */}
                <div style={{ height: '6px', background: '#D9AD71' }} />

                {/* Ticket Body */}
                <div style={{ padding: '24px', background: '#ffffff', borderRadius: '0 0 18px 18px', position: 'relative' }}>

                    {/* Logo (Left Aligned) */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
                        <img src={logoUrl} alt="Naqleen Logo" style={{ height: '48px', objectFit: 'contain' }} />
                    </div>

                    {/* Container Row */}
                    {details.containerNumber && (
                        <div style={{
                            border: '1px solid #f0f0f0',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                            <span style={{ fontSize: '13px', color: '#687b8d', fontWeight: 600 }}>Container</span>
                            <span style={{ fontSize: '14px', color: '#2b3034', fontWeight: 800 }}>
                                {details.containerNumber}
                            </span>
                        </div>
                    )}

                    {/* Customer Row */}
                    {details.customerName && (
                        <div style={{
                            border: '1px solid #f0f0f0',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                            <span style={{ fontSize: '13px', color: '#687b8d', fontWeight: 600 }}>Customer</span>
                            <span style={{ fontSize: '14px', color: '#2b3034', fontWeight: 800 }}>
                                {details.customerName}
                            </span>
                        </div>
                    )}

                    <div style={{ height: '1px', background: '#f0f0f0', marginBottom: '16px' }} />

                    {/* Gate & Shipment Info */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', color: '#687b8d', fontWeight: 700 }}>Gate</div>
                            <div style={{ fontSize: '16px', color: '#dc2626', fontWeight: 800, marginTop: '4px' }}>OUT</div>
                        </div>
                        <div style={{ flex: 2, textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#687b8d', fontWeight: 700 }}>Shipment ({details.shipmentName || 'LRO'})</div>
                            <div style={{ fontSize: '13px', color: '#2b3034', fontWeight: 800, marginTop: '4px' }}>
                                {details.shipmentNumber || '-'}
                            </div>
                        </div>
                    </div>

                    {/* Barcode Separator */}
                    <div style={{ position: 'relative', margin: '30px 0 20px' }}>
                        <div style={{ borderTop: '2px dashed #cbd5e1' }} />
                        {/* Circular cutouts */}
                        <div style={{ position: 'absolute', top: '-10px', left: '-34px', width: '20px', height: '20px', background: 'transparent', borderRadius: '50%' }} />
                        <div style={{ position: 'absolute', top: '-10px', right: '-34px', width: '20px', height: '20px', background: 'transparent', borderRadius: '50%' }} />
                    </div>

                    <div style={{ textAlign: 'center', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <Barcode
                            value={details.truckNumber || 'N/A'}
                            width={1.6}
                            height={45}
                            fontSize={12}
                            margin={0}
                            displayValue={true}
                            background="transparent"
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Render Footer Logic
    const renderFooter = () => {
        if (step === 'truck_list') return null;

        const currentDetails = truckDetailsArray[activeTab];
        if (!currentDetails) return null;
        const status = tabStatuses[activeTab] || 'review';

        let isAllSuccess = truckDetailsArray.length > 0;
        truckDetailsArray.forEach((_, index) => {
            if (tabStatuses[index] !== 'success') isAllSuccess = false;
        });

        if (status === 'success') {
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
                    {isAllSuccess ? (
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
                    ) : (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.colors.text.secondary,
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '0 8px',
                            textAlign: 'center',
                            lineHeight: 1.2
                        }}>
                            Submit remaining shipments to finish
                        </div>
                    )}
                </div>
            );
        }

        const isReady = truckDetailsArray.length > 0 && !isLoadingDetails;
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
    const renderTruckListView = () => {
        return (
            <>
                {/* Compact Search Bar - Always Visible */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: theme.colors.primary,
                            opacity: 0.6
                        }} />

                        <div style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {isLoadingTrucks && (
                                <Loader2 size={16} className="animate-spin" style={{ color: theme.colors.primary, opacity: 0.5 }} />
                            )}
                            {searchText && !isLoadingTrucks && (
                                <button
                                    onClick={() => setSearchText('')}
                                    style={{
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
                        </div>

                        <input
                            type="text"
                            placeholder="Search trucks..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            maxLength={10}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '12px 60px 12px 42px',
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

                {/* Truck List */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {isLoadingTrucks && allTrucks.length === 0 ? (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingBottom: '40px'
                        }}>
                            <TruckLoader message="LOADING TRUCKS" subMessage="Checking for trucks ready to exit..." height="150px" />
                        </div>
                    ) : filteredTrucks.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                            <PremiumStateView
                                type="empty"
                                graphic={<Truck />}
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
    };

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

            {/* Tab Navigation if Dual Shipment */}
            {truckDetailsArray.length > 1 && !isLoadingDetails && !submitMutation.isPending && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {truckDetailsArray.map((details, index) => {
                        const isActive = activeTab === index;
                        const isSuccess = tabStatuses[index] === 'success';
                        return (
                            <button
                                key={index}
                                onClick={() => setActiveTab(index)}
                                style={{
                                    flex: 1,
                                    padding: '12px 10px',
                                    borderRadius: '10px',
                                    background: isActive ? theme.colors.primary : `${theme.colors.primary}12`,
                                    color: isActive ? '#fff' : theme.colors.primary,
                                    border: `1px solid ${isActive ? theme.colors.primary : `${theme.colors.primary}26`}`,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <span style={{ zIndex: 1 }}>{details.shipmentNumber || `Shipment ${index + 1}`}</span>
                                {isSuccess && <CheckCircle size={14} color={isActive ? '#fff' : theme.colors.success} style={{ zIndex: 1 }} />}

                                {isActive && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: '10%',
                                        right: '10%',
                                        height: '3px',
                                        background: theme.gradients.secondary,
                                        borderRadius: '3px 3px 0 0'
                                    }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Content for Active Tab */}
            {truckDetailsArray.length > 0 && !isLoadingDetails && !submitMutation.isPending && (() => {
                const details = truckDetailsArray[activeTab];
                if (!details) return null;
                const status = tabStatuses[activeTab] || 'review';

                if (status === 'success') {
                    return (
                        <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '100%', maxWidth: '390px' }}>
                                {renderTicket(details)}
                            </div>
                        </div>
                    );
                }

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.primary }}>{details.truckNumber}</div>
                                        <div style={{ fontSize: '12px', color: theme.colors.text.primary, opacity: 0.7 }}>
                                            Truck Details
                                        </div>
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
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{details.driverName || 'N/A'}</span>
                            </div>
                            <div style={detailRowStyle}>
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Driver Iqama</span>
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{details.driverIqama || 'N/A'}</span>
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
                                    {details.shipmentName || 'N/A'}
                                </span>
                            </div>
                            <div style={detailRowStyle}>
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Shipment No</span>
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{details.shipmentNumber || 'N/A'}</span>
                            </div>

                            {details.containerNumber && (
                                <>
                                    <div style={detailRowStyle}>
                                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Container</span>
                                        <span style={{ color: theme.colors.primary, fontSize: '13px', fontWeight: 700 }}>{details.containerNumber}</span>
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
                                            {details.containerType || 'N/A'}
                                        </span>
                                    </div>
                                </>
                            )}

                            <div style={detailRowStyle}>
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Liner</span>
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{details.customerName || 'N/A'}</span>
                            </div>
                            <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Order No</span>
                                <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{details.orderNumber || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );

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
            </div>
        </PanelLayout>
    );
}
