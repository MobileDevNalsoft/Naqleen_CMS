import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PanelLayout from '../PanelLayout';
import { Truck, FileText, Loader2, ChevronDown, Upload, X, Building2, Package, CheckCircle, BookOpen, Search, ArrowLeft, Download, User } from 'lucide-react';
import { useGateInTrucksQuery, useCustomerBookingsQuery, useBookingShipmentsQuery, useSubmitGateInMutation, getGateInTruckDetails } from '../../../api';
import type { GateTruckDetails, GateCustomer, GateCustomerShipments, GateDocument } from '../../../api/types';
import { showToast } from '../../ui/Toast';
import { toPng } from 'html-to-image';
import Barcode from 'react-barcode';
import TruckLoader from '../../ui/animations/TruckLoader';

interface GateInPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GateInPanel({ isOpen, onClose }: GateInPanelProps) {
    // Search state
    const [searchText, setSearchText] = useState('');

    // Truck details state
    const [truckDetails, setTruckDetails] = useState<GateTruckDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Customer/Booking/Shipment selection state
    const [selectedCustomer, setSelectedCustomer] = useState<GateCustomer | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
    const [selectedShipment, setSelectedShipment] = useState<GateCustomerShipments | null>(null);
    const [bookingOrderType, setBookingOrderType] = useState<string | null>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showBookingDropdown, setShowBookingDropdown] = useState(false);
    const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);

    // Dropdown search states
    const [customerSearchText, setCustomerSearchText] = useState('');
    const [bookingSearchText, setBookingSearchText] = useState('');
    const [shipmentSearchText, setShipmentSearchText] = useState('');

    // Dropdown refs for auto-scroll
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    const bookingDropdownRef = useRef<HTMLDivElement>(null);
    const shipmentDropdownRef = useRef<HTMLDivElement>(null);

    // Document upload state
    const [documents, setDocuments] = useState<GateDocument[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Container Number state (for non-LRO/CRO)
    const [containerNumber, setContainerNumber] = useState('');

    // Driver slip generation
    const slipRef = useRef<HTMLDivElement>(null);
    const [isGeneratingSlip, setIsGeneratingSlip] = useState(false);

    // Gate In Steps: 'truck_list' | 'details' | 'success'
    const [step, setStep] = useState<'truck_list' | 'details' | 'success'>('truck_list');

    // API hooks - fetch all trucks ONCE on mount with empty search
    const { data: allTrucks = [], isLoading: isLoadingTrucks, refetch: refetchTrucks } = useGateInTrucksQuery(
        '', // Always fetch all trucks with empty search
        isOpen // Enabled when panel is open
    );

    // Client-side filtering based on search text
    const filteredTrucks = useMemo(() => {
        if (!searchText.trim()) return allTrucks;
        const search = searchText.toUpperCase();
        return allTrucks.filter(truck => truck.toUpperCase().includes(search));
    }, [allTrucks, searchText]);

    const { data: bookings = [], isLoading: isLoadingBookings } = useCustomerBookingsQuery(
        selectedCustomer?.customerNbr || '',
        '',
        !!selectedCustomer
    );

    const { data: bookingShipmentsData, isLoading: isLoadingShipments } = useBookingShipmentsQuery(
        selectedBooking || '',
        0,
        '',
        !!selectedBooking
    );

    const shipments = bookingShipmentsData?.shipments || [];

    // Update order type when booking shipments are fetched
    useEffect(() => {
        if (bookingShipmentsData?.orderType) {
            setBookingOrderType(bookingShipmentsData.orderType);
        }
    }, [bookingShipmentsData]);

    const submitMutation = useSubmitGateInMutation();

    // Check if CRO or LRO order type (skip shipment selection)
    const isCroOrLro = useMemo(() => {
        const orderType = bookingOrderType?.toUpperCase();
        return orderType === 'CRO' || orderType === 'LRO';
    }, [bookingOrderType]);

    // Computed states - skip selections for INBOUND_CONTAINER (already has all data)
    const isInboundContainer = truckDetails?.shipmentName === 'INBOUND_CONTAINER';

    const isCustomerSelectionRequired = useMemo(() =>
        !isInboundContainer && truckDetails?.customerList && truckDetails.customerList.length > 0,
        [truckDetails, isInboundContainer]
    );

    const isBookingSelectionRequired = useMemo(() =>
        isCustomerSelectionRequired && selectedCustomer !== null,
        [isCustomerSelectionRequired, selectedCustomer]
    );

    // Shipment selection is required only if NOT CRO/LRO
    const isShipmentSelectionRequired = useMemo(() =>
        isBookingSelectionRequired && selectedBooking !== null && !isCroOrLro,
        [isBookingSelectionRequired, selectedBooking, isCroOrLro]
    );

    // Validate container number: 4 letters + 7 digits
    const isValidContainerNumber = useMemo(() => {
        if (!containerNumber) return false;
        return /^[A-Z]{4}[0-9]{7}$/.test(containerNumber);
    }, [containerNumber]);

    const canSubmit = useMemo(() => {
        if (!truckDetails) return false;
        if (isCustomerSelectionRequired && !selectedCustomer) return false;
        if (isBookingSelectionRequired && !selectedBooking) return false;
        if (isShipmentSelectionRequired && !selectedShipment) return false;
        if (!isCroOrLro && !isValidContainerNumber) return false;
        return true;
    }, [truckDetails, isCustomerSelectionRequired, selectedCustomer, isBookingSelectionRequired, selectedBooking, isShipmentSelectionRequired, selectedShipment, isCroOrLro, isValidContainerNumber]);

    // Filtered lists for searchable dropdowns
    const filteredCustomers = useMemo(() => {
        if (!truckDetails?.customerList) return [];
        if (!customerSearchText.trim()) return truckDetails.customerList;
        const search = customerSearchText.toUpperCase();
        return truckDetails.customerList.filter(c =>
            c.customerName.toUpperCase().includes(search) ||
            c.customerNbr.toUpperCase().includes(search)
        );
    }, [truckDetails?.customerList, customerSearchText]);

    const filteredBookings = useMemo(() => {
        if (!bookingSearchText.trim()) return bookings;
        const search = bookingSearchText.toUpperCase();
        return bookings.filter(b => b.toUpperCase().includes(search));
    }, [bookings, bookingSearchText]);

    const filteredShipments = useMemo(() => {
        if (!shipmentSearchText.trim()) return shipments;
        const search = shipmentSearchText.toUpperCase();
        return shipments.filter(s =>
            s.shipmentNbr.toUpperCase().includes(search)
        );
    }, [shipments, shipmentSearchText]);

    // Reset state when panel closes
    useEffect(() => {
        if (!isOpen) {
            setSearchText('');
            setTruckDetails(null);
            setSelectedCustomer(null);
            setSelectedBooking(null);
            setSelectedShipment(null);
            setBookingOrderType(null);
            setContainerNumber('');
            setDocuments([]);
            setStep('truck_list');
        }
    }, [isOpen]);

    // Auto-scroll dropdowns into view when opened
    useEffect(() => {
        if (showCustomerDropdown && customerDropdownRef.current) {
            setTimeout(() => {
                customerDropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 50);
        }
    }, [showCustomerDropdown]);

    useEffect(() => {
        if (showBookingDropdown && bookingDropdownRef.current) {
            setTimeout(() => {
                bookingDropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 50);
        }
    }, [showBookingDropdown]);

    useEffect(() => {
        if (showShipmentDropdown && shipmentDropdownRef.current) {
            setTimeout(() => {
                shipmentDropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 50);
        }
    }, [showShipmentDropdown]);

    // Handle truck selection from list
    const handleSelectTruck = async (truckNumber: string) => {
        setIsLoadingDetails(true);
        setStep('details');

        try {
            const details = await getGateInTruckDetails(truckNumber);
            if (details) {
                setTruckDetails(details);
                // Reset selections
                setSelectedCustomer(null);
                setSelectedBooking(null);
                setSelectedShipment(null);
                setBookingOrderType(null);
            } else {
                showToast('error', 'Truck not found');
                setStep('truck_list');
            }
        } catch (error) {
            console.error('Error fetching truck details:', error);
            showToast('error', 'Failed to fetch truck details');
            setStep('truck_list');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Handle back to truck list
    const handleBackToList = () => {
        setStep('truck_list');
        setTruckDetails(null);
        setSelectedCustomer(null);
        setSelectedBooking(null);
        setSelectedShipment(null);
        setBookingOrderType(null);
        setDocuments([]);
    };

    // Handle customer selection
    const handleSelectCustomer = (customer: GateCustomer) => {
        setSelectedCustomer(customer);
        setSelectedBooking(null);
        setSelectedShipment(null);
        setBookingOrderType(null);
        setShowCustomerDropdown(false);
        setCustomerSearchText('');
    };

    // Handle booking selection
    const handleSelectBooking = (booking: string) => {
        setSelectedBooking(booking);
        setSelectedShipment(null);
        setBookingOrderType(null);
        setShowBookingDropdown(false);
        setBookingSearchText('');
    };

    // Handle shipment selection
    const handleSelectShipment = (shipment: GateCustomerShipments) => {
        setSelectedShipment(shipment);
        // Prefill container number if available in shipment, otherwise clear it
        setContainerNumber(shipment.containerNbr || '');
        setShowShipmentDropdown(false);
        setShipmentSearchText('');
    };

    // Handle Done button on success screen - return to truck list and refresh
    const handleDone = () => {
        // Reset all state
        setTruckDetails(null);
        setSelectedCustomer(null);
        setSelectedBooking(null);
        setSelectedShipment(null);
        setBookingOrderType(null);
        setDocuments([]);
        setSearchText('');
        // Return to truck list
        setStep('truck_list');
        // Refetch trucks list to get updated data (gated-in truck will be removed)
        refetchTrucks();
    };

    // Handle generate driver slip
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
            link.download = `gate_in_slip_${truckDetails.truckNumber}_${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();

            showToast('success', 'Gate In slip downloaded successfully');
        } catch (error) {
            console.error('Error generating slip:', error);
            showToast('error', 'Failed to generate driver slip');
        } finally {
            setIsGeneratingSlip(false);
        }
    };

    // Handle document upload
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                console.warn('Invalid file type:', file.type);
                continue;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                console.warn('File too large:', file.name);
                continue;
            }

            // Convert to base64
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                const newDoc: GateDocument = {
                    documentXid: `GATEIN-${Date.now()}`,
                    documentName: file.name,
                    documentMimeType: file.type,
                    documentBase64Content: base64
                };
                setDocuments(prev => [...prev, newDoc]);
            };
            reader.readAsDataURL(file);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // Remove document
    const handleRemoveDocument = (index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    };

    // Submit Gate In
    const handleSubmitGateIn = async () => {
        if (!truckDetails || !canSubmit) return;

        try {
            // Build payload based on order type
            if (isCroOrLro) {
                // CRO/LRO simplified payload
                await submitMutation.mutateAsync({
                    shipment_nbr: '',
                    truck_nbr: truckDetails.truckNumber,
                    driver_nbr: truckDetails.driverName,
                    truck_type: truckDetails.truckType || '3PL',
                    container_nbr: '',
                    documents: [],
                    customer_nbr: selectedCustomer?.customerNbr || '',
                    customer_name: selectedCustomer?.customerName || '',
                    booking_id: selectedBooking || '',
                    order_type: bookingOrderType || ''
                });
            } else {
                // Standard payload
                await submitMutation.mutateAsync({
                    shipment_nbr: selectedShipment?.shipmentNbr || truckDetails.shipmentNumber,
                    truck_nbr: truckDetails.truckNumber,
                    driver_nbr: truckDetails.driverName,
                    truck_type: truckDetails.truckType || '3PL',
                    container_nbr: containerNumber, // Use validated state value
                    documents: documents,
                    order_type: bookingOrderType || ''
                });
            }

            showToast('success', 'Gate In submitted successfully');
            setStep('success');
        } catch (error) {
            console.error('Error submitting gate in:', error);
            showToast('error', 'Failed to submit Gate In');
        }
    };

    // Styles
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
        maxHeight: '350px',
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

    // Footer Logic
    const renderFooter = () => {
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

        if (step === 'truck_list') {
            return null; // No footer button needed on truck list view
        }

        // Details step
        const isEnabled = canSubmit && !submitMutation.isPending;
        return (
            <button
                onClick={handleSubmitGateIn}
                disabled={!isEnabled}
                style={{
                    padding: '10px 24px',
                    background: isEnabled ? 'var(--secondary-gradient)' : 'rgba(75, 104, 108, 0.15)',
                    border: 'none',
                    borderRadius: '12px',
                    color: isEnabled ? 'var(--primary-color)' : 'rgba(75, 104, 108, 0.4)',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: isEnabled ? 'pointer' : 'not-allowed',
                    boxShadow: isEnabled ? '0 4px 12px rgba(247, 207, 155, 0.3)' : 'none',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%'
                }}
                onMouseEnter={e => {
                    if (isEnabled) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(247, 207, 155, 0.4)';
                    }
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isEnabled ? '0 4px 12px rgba(247, 207, 155, 0.3)' : 'none';
                }}
            >
                {submitMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Confirm Gate In
            </button>
        );
    };

    // Render truck list view
    const renderTruckListView = () => (
        <>
            {/* Compact Search Bar */}
            {!isLoadingTrucks && (
                <div style={{ marginBottom: '16px' }}>
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
                        paddingBottom: '40px', // Optical centering offset
                        boxSizing: 'border-box'
                    }}>
                        <TruckLoader message="LOADING TRUCKS" subMessage="Checking for waiting trucks..." height="150px" />
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
                        <div>{searchText ? 'No trucks match your search' : 'No trucks waiting for Gate In'}</div>
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

    // Render details view
    const renderDetailsView = () => (
        <>
            {/* Loading Details */}
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
                        message={submitMutation.isPending ? "PROCESSING GATE IN" : "RETRIEVING DETAILS"}
                        subMessage={submitMutation.isPending ? "Verifying and submitting data..." : "Fetching truck information..."}
                        height="200px"
                    />
                </div>
            )}

            {/* Truck Details Card */}
            {truckDetails && !isLoadingDetails && !submitMutation.isPending && (
                <>
                    <div style={cardStyle}>
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
                                background: 'rgba(75, 104, 108, 0.1)',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--primary-color)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px'
                            }}>
                                {truckDetails.truckType || '3PL'}
                            </span>
                        </div>

                        <div style={detailRowStyle}>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver Name</span>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverName || 'N/A'}</span>
                        </div>
                        <div style={{ ...detailRowStyle, borderBottom: truckDetails.shipmentName === 'INBOUND_CONTAINER' ? undefined : 'none' }}>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver Iqama</span>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverIqama || 'N/A'}</span>
                        </div>

                        {/* Additional details for INBOUND_CONTAINER */}
                        {truckDetails.shipmentName === 'INBOUND_CONTAINER' && (
                            <>
                                <div style={detailRowStyle}>
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Shipment Type</span>
                                    <span style={{
                                        padding: '2px 8px',
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: '#22c55e'
                                    }}>
                                        {truckDetails.shipmentName}
                                    </span>
                                </div>
                                <div style={detailRowStyle}>
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Shipment No</span>
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.shipmentNumber || 'N/A'}</span>
                                </div>
                                <div style={detailRowStyle}>
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Container</span>
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.containerNumber || 'N/A'}</span>
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
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Customer</span>
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.customerName || 'N/A'}</span>
                                </div>
                                <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Order No</span>
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.orderNumber || 'N/A'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Customer Selection */}
                    {isCustomerSelectionRequired && truckDetails?.customerList && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Select Customer *</label>
                            <div style={{ position: 'relative' }}>
                                <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                                <div
                                    className="modern-input"
                                    style={{
                                        paddingLeft: '48px',
                                        paddingRight: '48px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    onClick={() => {
                                        setShowBookingDropdown(false);
                                        setShowShipmentDropdown(false);
                                        setShowCustomerDropdown(!showCustomerDropdown);
                                    }}
                                >
                                    {selectedCustomer ? selectedCustomer.customerName : 'Select a customer...'}
                                </div>
                                <ChevronDown size={18} style={{
                                    position: 'absolute',
                                    right: '14px',
                                    top: '50%',
                                    transform: `translateY(-50%) rotate(${showCustomerDropdown ? 180 : 0}deg)`,
                                    color: '#4B686C',
                                    transition: 'transform 0.2s'
                                }} />

                                {showCustomerDropdown && (
                                    <div ref={customerDropdownRef} style={dropdownStyle}>
                                        {/* Search Input */}
                                        <div style={{ padding: '8px', borderBottom: '1px solid rgba(75, 104, 108, 0.1)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                                            <input
                                                type="text"
                                                placeholder="Search customers..."
                                                value={customerSearchText}
                                                onChange={(e) => setCustomerSearchText(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    border: '1px solid rgba(75, 104, 108, 0.2)',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        {/* Customer List */}
                                        {filteredCustomers.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-color)', opacity: 0.6, fontSize: '13px' }}>
                                                No customers found
                                            </div>
                                        ) : (
                                            filteredCustomers.map((customer, index) => (
                                                <div
                                                    key={index}
                                                    style={dropdownItemStyle}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(75, 104, 108, 0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    onClick={() => handleSelectCustomer(customer)}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Building2 size={14} style={{ color: 'var(--primary-color)' }} />
                                                        <span style={{ color: 'var(--text-color)', fontWeight: 500, fontSize: '14px' }}>{customer.customerName}</span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-color)', opacity: 0.6, marginTop: '2px', marginLeft: '22px' }}>
                                                        {customer.customerNbr}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                    }

                    {/* Booking Selection */}
                    {
                        isBookingSelectionRequired && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Select Booking *</label>
                                <div style={{ position: 'relative' }}>
                                    <BookOpen size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                                    {isLoadingBookings ? (
                                        <div
                                            className="modern-input"
                                            style={{
                                                paddingLeft: '48px',
                                                paddingRight: '48px',
                                                cursor: 'wait',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                background: '#f8fafc' // Lighter background for better contrast
                                            }}
                                        >
                                            {/* Shimmer Effect Overlay */}
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                background: 'linear-gradient(90deg, transparent, rgba(75, 104, 108, 0.08), transparent)',
                                                transform: 'translateX(-100%)',
                                                animation: 'shimmer 1.5s infinite'
                                            }} />
                                            <span style={{ color: 'var(--text-color)', opacity: 0.5 }}>Loading bookings...</span>
                                        </div>
                                    ) : (
                                        <div
                                            className="modern-input"
                                            style={{
                                                paddingLeft: '48px',
                                                paddingRight: '48px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            onClick={() => {
                                                if (!isLoadingBookings) {
                                                    setShowCustomerDropdown(false);
                                                    setShowShipmentDropdown(false);
                                                    setShowBookingDropdown(!showBookingDropdown);
                                                }
                                            }}
                                        >
                                            {selectedBooking || 'Select a booking...'}
                                        </div>
                                    )}
                                    <style>{`
                                    @keyframes shimmer {
                                        100% { transform: translateX(100%); }
                                    }
                                `}</style>
                                    <ChevronDown size={18} style={{
                                        position: 'absolute',
                                        right: '14px',
                                        top: '50%',
                                        transform: `translateY(-50%) rotate(${showBookingDropdown ? 180 : 0}deg)`,
                                        color: '#4B686C',
                                        transition: 'transform 0.2s'
                                    }} />

                                    {showBookingDropdown && (
                                        <div ref={bookingDropdownRef} style={dropdownStyle}>
                                            {/* Search Input */}
                                            <div style={{ padding: '8px', borderBottom: '1px solid rgba(75, 104, 108, 0.1)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Search bookings..."
                                                    value={bookingSearchText}
                                                    onChange={(e) => setBookingSearchText(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        border: '1px solid rgba(75, 104, 108, 0.2)',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>
                                            {/* Booking List */}
                                            {filteredBookings.length === 0 ? (
                                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-color)', opacity: 0.6, fontSize: '13px' }}>
                                                    {bookings.length === 0 ? 'No bookings available' : 'No bookings found'}
                                                </div>
                                            ) : (
                                                filteredBookings.map((booking, index) => (
                                                    <div
                                                        key={index}
                                                        style={dropdownItemStyle}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(75, 104, 108, 0.08)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        onClick={() => handleSelectBooking(booking)}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <BookOpen size={14} style={{ color: 'var(--primary-color)' }} />
                                                            <span style={{ color: 'var(--text-color)', fontWeight: 500, fontSize: '13px' }}>{booking}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {/* CRO/LRO Badge */}
                    {
                        isCroOrLro && selectedBooking && (
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <CheckCircle size={18} color="#22c55e" />
                                <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                                    {bookingOrderType} Order - No shipment selection required
                                </span>
                            </div>
                        )
                    }

                    {/* Shipment Selection */}
                    {
                        isShipmentSelectionRequired && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Select Shipment *</label>
                                <div style={{ position: 'relative' }}>
                                    <Package size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                                    {isLoadingShipments ? (
                                        <div
                                            className="modern-input"
                                            style={{
                                                paddingLeft: '48px',
                                                paddingRight: '48px',
                                                cursor: 'wait',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                background: '#f8fafc'
                                            }}
                                        >
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                background: 'linear-gradient(90deg, transparent, rgba(75, 104, 108, 0.08), transparent)',
                                                transform: 'translateX(-100%)',
                                                animation: 'shimmer 1.5s infinite'
                                            }} />
                                            <span style={{ color: 'var(--text-color)', opacity: 0.5 }}>Loading shipments...</span>
                                        </div>
                                    ) : (
                                        <div
                                            className="modern-input"
                                            style={{
                                                paddingLeft: '48px',
                                                paddingRight: '48px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            onClick={() => {
                                                if (!isLoadingShipments) {
                                                    setShowCustomerDropdown(false);
                                                    setShowBookingDropdown(false);
                                                    setShowShipmentDropdown(!showShipmentDropdown);
                                                }
                                            }}
                                        >
                                            {selectedShipment ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{selectedShipment.shipmentNbr}</span>
                                                    {selectedShipment.containerType && (
                                                        <span style={{
                                                            padding: '2px 6px',
                                                            background: 'rgba(75, 104, 108, 0.1)',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            color: 'var(--primary-color)'
                                                        }}>
                                                            {selectedShipment.containerType}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : 'Select a shipment...'}
                                        </div>
                                    )}
                                    <ChevronDown size={18} style={{
                                        position: 'absolute',
                                        right: '14px',
                                        top: '50%',
                                        transform: `translateY(-50%) rotate(${showShipmentDropdown ? 180 : 0}deg)`,
                                        color: '#4B686C',
                                        transition: 'transform 0.2s'
                                    }} />

                                    {showShipmentDropdown && (
                                        <div ref={shipmentDropdownRef} style={dropdownStyle}>
                                            {/* Search Input */}
                                            <div style={{ padding: '8px', borderBottom: '1px solid rgba(75, 104, 108, 0.1)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Search shipments..."
                                                    value={shipmentSearchText}
                                                    onChange={(e) => setShipmentSearchText(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        border: '1px solid rgba(75, 104, 108, 0.2)',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>
                                            {/* Shipment List */}
                                            {filteredShipments.length === 0 ? (
                                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-color)', opacity: 0.6, fontSize: '13px' }}>
                                                    {shipments.length === 0 ? 'No shipments available' : 'No shipments found'}
                                                </div>
                                            ) : (
                                                filteredShipments.map((shipment, index) => (
                                                    <div
                                                        key={index}
                                                        style={dropdownItemStyle}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(75, 104, 108, 0.08)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        onClick={() => handleSelectShipment(shipment)}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                            <Package size={14} style={{ color: 'var(--primary-color)', marginTop: '2px', flexShrink: 0 }} />
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ color: 'var(--text-color)', fontWeight: 600, fontSize: '13px' }}>{shipment.shipmentNbr}</span>
                                                                    {shipment.containerType && (
                                                                        <span style={{
                                                                            padding: '2px 6px',
                                                                            background: 'rgba(75, 104, 108, 0.1)',
                                                                            borderRadius: '4px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 600,
                                                                            color: 'var(--primary-color)'
                                                                        }}>
                                                                            {shipment.containerType}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {shipment.shipmentName && (
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-color)', opacity: 0.6, marginTop: '2px' }}>
                                                                        {shipment.shipmentName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {/* Container Number Input - only for non-CRO/LRO */}
                    {
                        !isCroOrLro && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Container Number *</label>
                                <input
                                    type="text"
                                    placeholder="ABCD1234567"
                                    value={containerNumber}
                                    onChange={(e) => {
                                        // Auto-uppercase and strict alphanumeric filter
                                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                        if (val.length <= 11) {
                                            setContainerNumber(val);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(75, 104, 108, 0.05)',
                                        border: `1px solid ${isValidContainerNumber ? 'rgba(75, 104, 108, 0.2)' : containerNumber ? '#ef4444' : 'rgba(75, 104, 108, 0.2)'}`,
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        color: 'var(--text-color)',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        letterSpacing: '1px',
                                        fontWeight: 600
                                    }}
                                />
                                {containerNumber && !isValidContainerNumber && (
                                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                                        Must be 4 letters followed by 7 digits
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* Document Upload Section - only for non-CRO/LRO */}
                    {
                        !isCroOrLro && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Documents (Optional)</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    multiple
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: 'rgba(75, 104, 108, 0.05)',
                                        border: '2px dashed rgba(75, 104, 108, 0.25)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        color: 'var(--primary-color)',
                                        fontSize: '13px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = 'var(--primary-color)';
                                        e.currentTarget.style.background = 'rgba(75, 104, 108, 0.1)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'rgba(75, 104, 108, 0.25)';
                                        e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)';
                                    }}
                                >
                                    <Upload size={18} />
                                    Upload Documents (PDF, Images)
                                </button>

                                {/* Uploaded documents list */}
                                {documents.length > 0 && (
                                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {documents.map((doc, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 14px',
                                                    background: 'rgba(75, 104, 108, 0.08)',
                                                    border: '1px solid rgba(75, 104, 108, 0.15)',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileText size={16} style={{ color: 'var(--primary-color)' }} />
                                                    <span style={{ color: 'var(--text-color)', fontSize: '13px' }}>{doc.documentName}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveDocument(index)}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '4px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <X size={14} style={{ color: '#ef4444' }} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }
                </>
            )}
        </>
    );

    // Render success view with driver slip ticket
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
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>Gate In Successful</h3>
                    <p style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '14px' }}>
                        Operation completed successfully.
                    </p>
                </div>
            );
        }

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

        return (
            <div style={{ height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div style={{ padding: '25px', width: '100%', maxWidth: '390px' }}>
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
                                    <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: 800, marginTop: '2px' }}>IN</div>
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
                    {/* Bottom Spacer */}
                    <div style={{ height: '20px' }} />
                </div>
            </div>
        );
    };

    return (
        <PanelLayout
            title="Gate In"
            category="GATE OPERATION"
            titleBadge={step === 'truck_list' && (
                <span style={{
                    padding: '4px 10px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.9)',
                    whiteSpace: 'nowrap'
                }}>
                    {filteredTrucks.length} truck{filteredTrucks.length !== 1 ? 's' : ''}
                </span>
            )}
            isOpen={isOpen}
            onClose={onClose}
            footerActions={renderFooter()}
            headerActions={step === 'details' && (
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
                {step === 'details' && renderDetailsView()}
                {step === 'success' && renderSuccessView()}
            </div>
        </PanelLayout>
    );
}
