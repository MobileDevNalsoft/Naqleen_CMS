import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PanelLayout from '../../shared/components/PanelLayout';
import { Truck, FileText, Loader2, ChevronDown, Upload, X, Building2, Package, CheckCircle, BookOpen, Search, ArrowLeft, Download, User } from 'lucide-react';
import PremiumStateView from '../../../components/ui/feedback/PremiumStateView';
import { showToast } from '../../../components/ui/feedback/common/Toast';
import { toPng } from 'html-to-image';
import Barcode from 'react-barcode';
import TruckLoader from '../../../components/ui/feedback/trucks/TruckLoader';
import type { GateCustomer, GateCustomerShipments, GateDocument, GateTruckDetails, GateLclShipment } from '../types/gateTypes';
import { yardApi } from '../../yard-planning/apis/yardApi';
import naqleenLogo from '../../../assets/images/naqleen_logo.png';
import { useGateInTrucksQuery, useCustomerBookingsQuery, useBookingShipmentsQuery, useSubmitGateInMutation, getGateInTruckDetails, useLclActiveShipmentsQuery, getShipmentDetails } from '../apis/gateApi';
import { theme } from '../../../themes/theme';

interface GateInPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GateInPanel({ isOpen, onClose }: GateInPanelProps) {
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
    const [truckDetails, setTruckDetails] = useState<GateTruckDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Dual shipment. A truck can be attached to up to two shipments, one
    // container each, and gate in is submitted once PER SHIPMENT -- the backend
    // accumulates them in VM.GATE_IN_SHIPMENTS and holds the truck at
    // 'NAQLEEN.INSPECTED' until every one is in. Submitting only the first
    // therefore leaves the truck permanently in the gate-in list.
    //
    // completedShipments is seeded from the server's per-shipment
    // gate_in_completed, so an operator who gated in one shipment and closed
    // the app reopens on the one still outstanding.
    const [activeShipmentIndex, setActiveShipmentIndex] = useState(0);
    const [completedShipments, setCompletedShipments] = useState<Record<number, boolean>>({});

    // Customer/Booking/Shipment selection state
    const [selectedCustomer, setSelectedCustomer] = useState<GateCustomer | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
    const [selectedShipment, setSelectedShipment] = useState<GateCustomerShipments | GateLclShipment | null>(null);
    const [selectedLclOption, setSelectedLclOption] = useState<string | null>(null);
    const [bookingOrderType, setBookingOrderType] = useState<string | null>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showBookingDropdown, setShowBookingDropdown] = useState(false);
    const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
    const [showLclOptionDropdown, setShowLclOptionDropdown] = useState(false);

    // Dropdown search states
    const [customerSearchText, setCustomerSearchText] = useState('');
    const [bookingSearchText, setBookingSearchText] = useState('');
    const [shipmentSearchText, setShipmentSearchText] = useState('');

    // Dropdown refs for auto-scroll
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    const bookingDropdownRef = useRef<HTMLDivElement>(null);
    const shipmentDropdownRef = useRef<HTMLDivElement>(null);
    const lclOptionDropdownRef = useRef<HTMLDivElement>(null);

    // Document upload state
    const [documents, setDocuments] = useState<GateDocument[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Container Number state (for non-LRO/CRO)
    const [containerNumber, setContainerNumber] = useState('');

    // Driver slip generation
    const slipRef = useRef<HTMLDivElement>(null);
    const [isGeneratingSlip, setIsGeneratingSlip] = useState(false);

    // Container Validation State
    const [isValidatingContainer, setIsValidatingContainer] = useState(false);
    const [containerValidationStatus, setContainerValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

    // Validation logic for container number
    useEffect(() => {
        if (!containerNumber) {
            setContainerValidationStatus('idle');
            return;
        }

        // Reset validation status when user edits
        if (containerValidationStatus !== 'idle' && containerNumber.length < 11) {
            setContainerValidationStatus('idle');
        }

        // Trigger validation only when length is 11 and not already validated for this number (implied by dependency on containerNumber)
        // However, we only want to trigger once when it reaches 11.
        if (containerNumber.length === 11 && containerValidationStatus === 'idle' && !isValidatingContainer) {
            const validate = async () => {
                setIsValidatingContainer(true);
                try {
                    const response = await yardApi.validateCfsContainer({ containerNbr: containerNumber });
                    if (response.data?.is_valid) {
                        setContainerValidationStatus('valid');
                        showToast('success', response.data.validation_message || 'Container number is valid');
                    } else {
                        setContainerValidationStatus('invalid');
                        showToast('error', response.data?.validation_message || 'Invalid container number');
                    }
                } catch (error) {
                    console.error('Validation failed', error);
                    setContainerValidationStatus('invalid');
                    showToast('error', 'Failed to validate container number');
                } finally {
                    setIsValidatingContainer(false);
                }
            };
            validate();
        }
    }, [containerNumber]);

    // Gate In Steps: 'truck_list' | 'details' | 'success'
    const [step, setStep] = useState<'truck_list' | 'details' | 'success'>('truck_list');

    // API hooks - fetch trucks based on search
    const { data: allTrucks = [], isLoading: isLoadingTrucks, refetch: refetchTrucks } = useGateInTrucksQuery(
        debouncedSearch.trim(), // Use debounced search for server-side filtering
        isOpen // Enabled when panel is open
    );

    // Client-side filtering based on search text
    const filteredTrucks = useMemo(() => {
        if (!searchText.trim()) return allTrucks;
        const search = searchText.toUpperCase();
        return allTrucks.filter(truck => truck.toUpperCase().includes(search));
    }, [allTrucks, searchText]);

    const isLclFlow = truckDetails?.orderType === 'LCL';
    const lclOptionsList = truckDetails?.lclOptions || [];

    const { data: bookings = [], isLoading: isLoadingBookings } = useCustomerBookingsQuery(
        selectedCustomer?.customerNbr || '',
        '',
        // The chosen LCL operation IS the shipment_name the bookings are filtered
        // by. Empty on the standard flow, which selects the non-LCL booking set.
        isLclFlow ? (selectedLclOption || '') : '',
        !!selectedCustomer && (!isLclFlow || !!selectedLclOption)
    );

    const { data: bookingShipmentsData, isLoading: isLoadingShipments } = useBookingShipmentsQuery(
        selectedBooking || '',
        0,
        '',
        !!selectedBooking && !isLclFlow
    );

    const { data: lclShipmentsData = [], isLoading: isLoadingLclShipments } = useLclActiveShipmentsQuery(
        selectedCustomer?.customerNbr || '',
        selectedBooking || '',
        selectedLclOption || '',
        !!selectedCustomer && !!selectedBooking && !!selectedLclOption && isLclFlow
    );

    const shipments = isLclFlow ? lclShipmentsData : (bookingShipmentsData?.shipments || []);

    // Update order type when booking shipments are fetched
    useEffect(() => {
        if (bookingShipmentsData?.orderType) {
            setBookingOrderType(bookingShipmentsData.orderType);
        }
    }, [bookingShipmentsData]);

    const submitMutation = useSubmitGateInMutation();

    // --- Dual shipment derived state ---

    const truckShipments = truckDetails?.shipments ?? [];
    const isMultiShipment = truckShipments.length > 1;
    const allShipmentsDone = truckShipments.length > 0
        && truckShipments.every((_, i) => completedShipments[i]);

    /**
     * Point the flat top-level fields at one shipment.
     *
     * The server mirrors shipments[0] onto them and this panel reads them
     * everywhere, so swapping the projection is what makes a tab switch work
     * without touching the rest of the layout.
     *
     * containerNbr is assigned rather than defaulted: a shipment that arrives
     * without a container number must leave the field EMPTY so the operator is
     * prompted for one, not inherit the previous tab's container.
     */
    const projectShipment = (details: GateTruckDetails, index: number): GateTruckDetails => {
        const s = details.shipments?.[index];
        if (!s) return details;
        return {
            ...details,
            shipmentNumber: s.shipmentNbr,
            shipmentName: s.shipmentName || details.shipmentName,
            containerNumber: s.containerNbr,
            containerType: s.containerType || details.containerType,
            customerName: s.customerName || details.customerName,
            orderNumber: s.orderNumber || details.orderNumber
        };
    };

    /** Container number and documents belong to one shipment, never to the truck. */
    const resetPerShipmentState = () => {
        setContainerNumber('');
        setContainerValidationStatus('idle');
        setDocuments([]);
    };

    const handleSelectShipmentTab = (index: number) => {
        if (index === activeShipmentIndex) return;
        setActiveShipmentIndex(index);
        setTruckDetails(prev => (prev ? projectShipment(prev, index) : prev));
        resetPerShipmentState();
    };

    /**
     * Same projection, on the success screen -- the driver gets ONE SLIP PER
     * CONTAINER, as the mobile app does, so both have to be reachable after the
     * last submit. No per-shipment reset here: container number and documents
     * are spent by this point, and clearing them would only churn state.
     */
    const handleSelectSlipShipment = (index: number) => {
        if (index === activeShipmentIndex) return;
        setActiveShipmentIndex(index);
        setTruckDetails(prev => (prev ? projectShipment(prev, index) : prev));
    };

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

    // LCL option is required if it's LCL flow
    const isLclOptionRequired = isLclFlow;

    const isBookingSelectionRequired = useMemo(() =>
        isCustomerSelectionRequired && selectedCustomer !== null && (!isLclFlow || selectedLclOption !== null),
        [isCustomerSelectionRequired, selectedCustomer, isLclFlow, selectedLclOption]
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
        // The active shipment is already in. Resubmitting it is harmless -- the
        // backend's comma-bounded membership test refuses to double-count -- but
        // it also does not advance the truck, so the operator would be pressing
        // a button that cannot finish the job.
        if (completedShipments[activeShipmentIndex]) return false;
        if (isCustomerSelectionRequired && !selectedCustomer) return false;
        if (isLclOptionRequired && !selectedLclOption) return false;
        if (isBookingSelectionRequired && !selectedBooking) return false;
        if (isShipmentSelectionRequired && !selectedShipment) return false;
        // Container number checks
        const hasApiContainer = !!truckDetails.containerNumber;
        if (!isCroOrLro && !hasApiContainer) {
            if (!isValidContainerNumber) return false;
            if (containerValidationStatus !== 'valid') return false;
        }

        return true;
    }, [truckDetails, isCustomerSelectionRequired, selectedCustomer, isBookingSelectionRequired, selectedBooking, isShipmentSelectionRequired, selectedShipment, isCroOrLro, isValidContainerNumber, isLclOptionRequired, selectedLclOption, containerValidationStatus, completedShipments, activeShipmentIndex]);

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
            setActiveShipmentIndex(0);
            setCompletedShipments({});
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
                // Open on the first shipment still outstanding, so a truck being
                // resumed lands on the work that is left rather than on the one
                // already done. Everything done (or nothing to do) opens on the
                // first tab.
                const list = details.shipments ?? [];
                const alreadyDone: Record<number, boolean> = {};
                list.forEach((s, i) => {
                    if (s.gateInCompleted) alreadyDone[i] = true;
                });
                const firstPending = list.findIndex(s => !s.gateInCompleted);
                const startIndex = firstPending === -1 ? 0 : firstPending;

                setCompletedShipments(alreadyDone);
                setActiveShipmentIndex(startIndex);
                setTruckDetails(list.length ? projectShipment(details, startIndex) : details);

                if (list.length > 1) {
                    const pending = details.pendingCount ?? list.filter(s => !s.gateInCompleted).length;
                    if (pending < list.length) {
                        showToast(
                            'info',
                            `Truck carries ${list.length} shipments, ${pending} still to gate in.`
                        );
                    }
                }

                // Reset selections
                setSelectedCustomer(null);
                setSelectedLclOption(null);
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
        setActiveShipmentIndex(0);
        setCompletedShipments({});
        setSelectedCustomer(null);
        setSelectedLclOption(null);
        setSelectedBooking(null);
        setSelectedShipment(null);
        setBookingOrderType(null);
        setContainerNumber('');
        setDocuments([]);
    };

    // Handle customer selection
    const handleSelectCustomer = (customer: GateCustomer) => {
        setSelectedCustomer(customer);
        setSelectedLclOption(null);
        setSelectedBooking(null);
        setSelectedShipment(null);
        setBookingOrderType(null);
        setShowCustomerDropdown(false);
        setCustomerSearchText('');
    };

    // Handle LCL option selection
    const handleSelectLclOption = (option: string) => {
        setSelectedLclOption(option);
        setSelectedBooking(null);
        setSelectedShipment(null);
        setShowLclOptionDropdown(false);
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
    const handleSelectShipment = async (shipment: GateCustomerShipments | GateLclShipment) => {
        setSelectedShipment(shipment);
        setShowShipmentDropdown(false);
        setShipmentSearchText('');

        if (isLclFlow) {
            const lclShip = shipment as GateLclShipment;
            // Fully flattened merge
            setTruckDetails(prev => prev ? {
                ...prev,
                shipmentNumber: lclShip.shipmentNbr,
                shipmentName: lclShip.shipmentName || prev.shipmentName,
                containerNumber: lclShip.containerNbr || prev.containerNumber,
                containerType: lclShip.containerType || prev.containerType,
                customerName: lclShip.customerName || prev.customerName,
                orderNumber: lclShip.orderNbr || prev.orderNumber,
                truckNumber: lclShip.truckNbr || prev.truckNumber,
                driverName: lclShip.driverName || prev.driverName,
                driverIqama: lclShip.driverIqama || prev.driverIqama
            } : null);
        } else {
            setIsLoadingDetails(true);
            try {
                const details = await getShipmentDetails(shipment.shipmentNbr);
                if (details) {
                    setTruckDetails(prev => prev ? {
                        ...prev,
                        shipmentNumber: details.shipment_nbr || prev.shipmentNumber,
                        shipmentName: details.shipment_name || prev.shipmentName,
                        containerNumber: details.container_nbr || prev.containerNumber,
                        containerType: details.container_type || prev.containerType,
                        orderNumber: details.otm_order_nbr || details.order_nbr || prev.orderNumber,
                        customerName: details.customer_name || prev.customerName,
                    } : null);
                }
            } finally {
                setIsLoadingDetails(false);
            }
        }
    };

    // Handle Done button on success screen - return to truck list and refresh
    const handleDone = () => {
        // Reset all state
        setTruckDetails(null);
        setActiveShipmentIndex(0);
        setCompletedShipments({});
        setSelectedCustomer(null);
        setSelectedLclOption(null);
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
            // Container number is in the filename because a two-container truck
            // produces two slips; without it the second download overwrites the
            // first, which both name after the truck and the date.
            const slipContainer = truckDetails.containerNumber || truckDetails.shipmentNumber || '';
            link.download = [
                'gate_in_slip',
                truckDetails.truckNumber,
                slipContainer,
                new Date().toISOString().split('T')[0]
            ].filter(Boolean).join('_') + '.png';
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
                    order_type: truckDetails?.orderType || bookingOrderType || ''
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
                    order_type: truckDetails?.orderType || bookingOrderType || ''
                });
            }

            // One shipment is in. The truck is NOT finished until every shipment
            // on it is -- the backend deliberately holds the status at
            // 'NAQLEEN.INSPECTED' until then, which is what allows this resume
            // and what makes stopping here leave the truck stuck in the list.
            const nextCompleted = { ...completedShipments, [activeShipmentIndex]: true };
            setCompletedShipments(nextCompleted);

            const nextPending = truckShipments.findIndex((_, i) => !nextCompleted[i]);

            if (nextPending === -1) {
                // Single shipment, CRO/LRO (no shipments array), or the last of
                // two -- the truck is done.
                showToast('success', 'Gate In submitted successfully');
                setStep('success');
            } else {
                const remaining = truckShipments.length - Object.keys(nextCompleted).length;
                showToast(
                    'success',
                    `Shipment ${truckShipments[activeShipmentIndex]?.shipmentNbr || ''} gated in. `
                    + `${remaining} remaining on this truck.`
                );
                setActiveShipmentIndex(nextPending);
                setTruckDetails(prev => (prev ? projectShipment(prev, nextPending) : prev));
                resetPerShipmentState();
            }
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
        color: theme.colors.primary,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    };

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

    const dropdownStyle = {
        position: 'absolute' as const,
        top: '100%',
        left: 0,
        right: 0,
        background: '#ffffff',
        border: `1px solid ${theme.colors.primary}33`, // 0.2 opacity
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
        borderBottom: `1px solid ${theme.colors.primary}14` // 0.08 opacity
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

    // Footer Logic
    const renderFooter = () => {
        if (step === 'success') {
            return (
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    {isInboundContainer && (
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
                    )}
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

        if (step === 'truck_list') {
            return null; // No footer button needed on truck list view
        }

        // Details step
        const isEnabled = canSubmit && !submitMutation.isPending;

        // Name the button after what it actually does. On a two-shipment truck
        // the first press gates in one container and leaves the truck in the
        // yard's INSPECTED state -- calling that "Confirm Gate In" reads as
        // "the truck is done", which is the misunderstanding that leaves the
        // second container behind.
        const activeDone = !!completedShipments[activeShipmentIndex];
        const remainingAfterThis = isMultiShipment
            ? truckShipments.length - Object.keys(completedShipments).length - 1
            : 0;
        const submitLabel = activeDone
            ? 'Already Gated In'
            : isMultiShipment && remainingAfterThis > 0
                ? `Gate In This Container (${remainingAfterThis} more after this)`
                : isMultiShipment
                    ? 'Gate In Last Container'
                    : 'Confirm Gate In';

        return (
            <button
                onClick={handleSubmitGateIn}
                disabled={!isEnabled}
                style={{
                    padding: '10px 24px',
                    background: isEnabled ? theme.gradients.secondary : `${theme.colors.primary}26`,
                    border: 'none',
                    borderRadius: '12px',
                    color: isEnabled ? theme.colors.primary : `${theme.colors.primary}66`,
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
                {submitLabel}
            </button>
        );
    };

    // Render truck list view
    const renderTruckListView = () => (
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
                        paddingBottom: '40px', // Optical centering offset
                        boxSizing: 'border-box'
                    }}>
                        <TruckLoader message="LOADING TRUCKS" subMessage="Checking for waiting trucks..." height="150px" />
                    </div>
                ) : filteredTrucks.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <PremiumStateView
                            type="empty"
                            graphic={<Truck />}
                            title={searchText ? 'No Truck Found' : 'No Trucks Waiting'}
                            description={searchText ? `We couldn't find any truck matching "${searchText}"` : "There are currently no trucks scheduled for Gate In."}
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
                                e.currentTarget.style.backgroundColor = `${theme.colors.primary}14`;
                                e.currentTarget.style.borderColor = theme.colors.primary;
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
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

            {/* Tab per shipment, for a truck carrying two containers. Matches
                the Gate Out panel, which already works this way. A completed
                tab stays selectable so its details can be reviewed; its submit
                button is disabled below. */}
            {isMultiShipment && !isLoadingDetails && !submitMutation.isPending && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {truckShipments.map((shipment, index) => {
                        const isActive = activeShipmentIndex === index;
                        const isDone = !!completedShipments[index];
                        return (
                            <button
                                key={shipment.shipmentNbr || index}
                                onClick={() => handleSelectShipmentTab(index)}
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
                                <span style={{ zIndex: 1 }}>
                                    {shipment.containerNbr || shipment.shipmentNbr || `Shipment ${index + 1}`}
                                </span>
                                {isDone && (
                                    <CheckCircle
                                        size={14}
                                        color={isActive ? '#fff' : theme.colors.success}
                                        style={{ zIndex: 1 }}
                                    />
                                )}
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

            {/* Every shipment on this truck is already in, yet the truck is still
                being offered for gate in. That means the backend's expected-count
                and its GATE_IN_SHIPMENTS list disagree, so the status never
                flipped. There is no client-side action that fixes it -- say so
                rather than leaving a disabled button with no explanation. */}
            {allShipmentsDone && !isLoadingDetails && !submitMutation.isPending && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    borderRadius: '10px',
                    background: `${theme.colors.success}14`,
                    border: `1px solid ${theme.colors.success}40`
                }}>
                    <CheckCircle size={16} color={theme.colors.success} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '12.5px', lineHeight: 1.5, color: theme.colors.text.primary }}>
                        Every shipment on this truck has already been gated in. If it is still
                        showing in the list, the truck's status did not advance &mdash; report it
                        rather than submitting again.
                    </span>
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
                                background: `${theme.colors.primary}1a`,
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: theme.colors.primary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px'
                            }}>
                                {truckDetails.truckType || '3PL'}
                            </span>
                        </div>

                        <div style={detailRowStyle}>
                            <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Driver Name</span>
                            <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverName || 'N/A'}</span>
                        </div>
                        <div style={{ ...detailRowStyle, borderBottom: (truckDetails.shipmentName === 'INBOUND_CONTAINER' || !!truckDetails.shipmentNumber) ? undefined : 'none' }}>
                            <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Driver Nbr / Iqama</span>
                            <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.driverIqama || 'N/A'}</span>
                        </div>

                        {/* Shipment & Container Details */}
                        {(truckDetails.shipmentName === 'INBOUND_CONTAINER' || !!truckDetails.shipmentNumber) && (
                            <>
                                {truckDetails.shipmentName && (
                                    <div style={detailRowStyle}>
                                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Shipment Type</span>
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
                                )}
                                <div style={detailRowStyle}>
                                    <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Shipment No</span>
                                    <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.shipmentNumber || 'N/A'}</span>
                                </div>
                                <div style={detailRowStyle}>
                                    <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Container</span>
                                    <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.containerNumber || 'N/A'}</span>
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
                                {truckDetails.customerName && (
                                    <div style={detailRowStyle}>
                                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Customer</span>
                                        <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.customerName}</span>
                                    </div>
                                )}
                                <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                                    <span style={{ color: theme.colors.text.primary, fontSize: '13px', opacity: 0.7 }}>Order No</span>
                                    <span style={{ color: theme.colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{truckDetails.orderNumber || 'N/A'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Customer Selection */}
                    {isCustomerSelectionRequired && !truckDetails?.shipmentNumber && truckDetails?.customerList && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Select Customer *</label>
                            <div style={{ position: 'relative' }}>
                                <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.text.secondary }} />
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
                                    color: theme.colors.text.secondary,
                                    transition: 'transform 0.2s'
                                }} />

                                {showCustomerDropdown && (
                                    <div ref={customerDropdownRef} style={dropdownStyle}>
                                        {/* Search Input */}
                                        <div style={{ padding: '8px', borderBottom: `1px solid ${theme.colors.border}`, position: 'sticky', top: 0, background: theme.colors.background.primary, zIndex: 1 }}>
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
                                                    border: `1px solid ${theme.colors.border}`,
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        {/* Customer List */}
                                        {filteredCustomers.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.text.primary, opacity: 0.6, fontSize: '13px' }}>
                                                No customers found
                                            </div>
                                        ) : (
                                            filteredCustomers.map((customer, index) => (
                                                <div
                                                    key={index}
                                                    style={dropdownItemStyle}
                                                    onMouseEnter={e => e.currentTarget.style.background = `${theme.colors.primary}0a`}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    onClick={() => handleSelectCustomer(customer)}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Building2 size={14} style={{ color: theme.colors.primary }} />
                                                        <span style={{ color: theme.colors.text.primary, fontWeight: 500, fontSize: '14px' }}>{customer.customerName}</span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: theme.colors.text.primary, opacity: 0.6, marginTop: '2px', marginLeft: '22px' }}>
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

                    {/* LCL Option Selection */}
                    {isLclOptionRequired && !truckDetails?.shipmentNumber && selectedCustomer && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Select LCL Option *</label>
                            <div style={{ position: 'relative' }}>
                                <Package size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.text.secondary }} />
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
                                        setShowCustomerDropdown(false);
                                        setShowBookingDropdown(false);
                                        setShowShipmentDropdown(false);
                                        setShowLclOptionDropdown(!showLclOptionDropdown);
                                    }}
                                >
                                    {selectedLclOption || 'Select an option...'}
                                </div>
                                <ChevronDown size={18} style={{
                                    position: 'absolute',
                                    right: '14px',
                                    top: '50%',
                                    transform: `translateY(-50%) rotate(${showLclOptionDropdown ? 180 : 0}deg)`,
                                    color: theme.colors.text.secondary,
                                    transition: 'transform 0.2s'
                                }} />

                                {showLclOptionDropdown && (
                                    <div ref={lclOptionDropdownRef} style={{ ...dropdownStyle, maxHeight: '200px' }}>
                                        {lclOptionsList.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.text.primary, opacity: 0.6, fontSize: '13px' }}>
                                                No LCL Options found
                                            </div>
                                        ) : (
                                            lclOptionsList.map((option, index) => (
                                                <div
                                                    key={index}
                                                    style={dropdownItemStyle}
                                                    onMouseEnter={e => e.currentTarget.style.background = `${theme.colors.primary}0a`}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    onClick={() => handleSelectLclOption(option)}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Package size={14} style={{ color: theme.colors.primary }} />
                                                        <span style={{ color: theme.colors.text.primary, fontWeight: 500, fontSize: '14px' }}>{option}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Booking Selection */}
                    {
                        isBookingSelectionRequired && !truckDetails?.shipmentNumber && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Select Booking *</label>
                                <div style={{ position: 'relative' }}>
                                    <BookOpen size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.text.secondary }} />
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
                                                background: theme.colors.background.secondary // Lighter background for better contrast
                                            }}
                                        >
                                            {/* Shimmer Effect Overlay */}
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                background: `linear-gradient(90deg, transparent, ${theme.colors.primary}0a, transparent)`,
                                                transform: 'translateX(-100%)',
                                                animation: 'shimmer 1.5s infinite'
                                            }} />
                                            <span style={{ color: theme.colors.text.primary, opacity: 0.5 }}>Loading bookings...</span>
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
                                                    setShowLclOptionDropdown(false);
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
                                        color: theme.colors.text.secondary,
                                        transition: 'transform 0.2s'
                                    }} />

                                    {showBookingDropdown && (
                                        <div ref={bookingDropdownRef} style={dropdownStyle}>
                                            {/* Search Input */}
                                            <div style={{ padding: '8px', borderBottom: `1px solid ${theme.colors.border}`, position: 'sticky', top: 0, background: theme.colors.background.primary, zIndex: 1 }}>
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
                                                        border: `1px solid ${theme.colors.border}`,
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>
                                            {/* Booking List */}
                                            {filteredBookings.length === 0 ? (
                                                <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.text.primary, opacity: 0.6, fontSize: '13px' }}>
                                                    {bookings.length === 0 ? 'No bookings available' : 'No bookings found'}
                                                </div>
                                            ) : (
                                                filteredBookings.map((booking, index) => (
                                                    <div
                                                        key={index}
                                                        style={dropdownItemStyle}
                                                        onMouseEnter={e => e.currentTarget.style.background = `${theme.colors.primary}0a`}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        onClick={() => handleSelectBooking(booking)}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <BookOpen size={14} style={{ color: theme.colors.primary }} />
                                                            <span style={{ color: theme.colors.text.primary, fontWeight: 500, fontSize: '13px' }}>{booking}</span>
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
                        isShipmentSelectionRequired && !truckDetails?.shipmentNumber && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Select Shipment *</label>
                                <div style={{ position: 'relative' }}>
                                    <Package size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.text.secondary }} />
                                    {isLoadingShipments || isLoadingLclShipments ? (
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
                                                background: theme.colors.background.secondary
                                            }}
                                        >
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                background: `linear-gradient(90deg, transparent, ${theme.colors.primary}0a, transparent)`,
                                                transform: 'translateX(-100%)',
                                                animation: 'shimmer 1.5s infinite'
                                            }} />
                                            <span style={{ color: theme.colors.text.primary, opacity: 0.5 }}>Loading shipments...</span>
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
                                                if (!isLoadingShipments && !isLoadingLclShipments) {
                                                    setShowCustomerDropdown(false);
                                                    setShowBookingDropdown(false);
                                                    setShowLclOptionDropdown(false);
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
                                                            background: `${theme.colors.primary}1a`,
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            color: theme.colors.primary
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
                                        color: theme.colors.text.secondary,
                                        transition: 'transform 0.2s'
                                    }} />

                                    {showShipmentDropdown && (
                                        <div ref={shipmentDropdownRef} style={dropdownStyle}>
                                            {/* Search Input */}
                                            <div style={{ padding: '8px', borderBottom: `1px solid ${theme.colors.border}`, position: 'sticky', top: 0, background: theme.colors.background.primary, zIndex: 1 }}>
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
                                                        border: `1px solid ${theme.colors.border}`,
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>
                                            {/* Shipment List */}
                                            {filteredShipments.length === 0 ? (
                                                <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.text.primary, opacity: 0.6, fontSize: '13px' }}>
                                                    {shipments.length === 0 ? 'No shipments available' : 'No shipments found'}
                                                </div>
                                            ) : (
                                                filteredShipments.map((shipment, index) => (
                                                    <div
                                                        key={index}
                                                        style={dropdownItemStyle}
                                                        onMouseEnter={e => e.currentTarget.style.background = `${theme.colors.primary}0a`}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        onClick={() => handleSelectShipment(shipment)}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                            <Package size={14} style={{ color: theme.colors.primary, marginTop: '2px', flexShrink: 0 }} />
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ color: theme.colors.text.primary, fontWeight: 600, fontSize: '13px' }}>{shipment.shipmentNbr}</span>
                                                                    {shipment.containerType && (
                                                                        <span style={{
                                                                            padding: '2px 6px',
                                                                            background: `${theme.colors.primary}1a`,
                                                                            borderRadius: '4px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 600,
                                                                            color: theme.colors.primary
                                                                        }}>
                                                                            {shipment.containerType}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {shipment.shipmentName && (
                                                                    <div style={{ fontSize: '11px', color: theme.colors.text.primary, opacity: 0.6, marginTop: '2px' }}>
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

                    {/* Container Number Input - only for non-CRO/LRO, when shipment is selected, and container is not populated by API */}
                    {
                        !isCroOrLro && (selectedShipment || truckDetails?.shipmentNumber) && !truckDetails?.containerNumber && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Container Number *</label>
                                <div style={{ position: 'relative' }}>
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
                                        disabled={isValidatingContainer}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            paddingRight: isValidatingContainer ? '36px' : '12px', // Make room for spinner
                                            background: `${theme.colors.primary}0a`,
                                            border: `1px solid ${containerValidationStatus === 'valid'
                                                ? '#86efac' // Pastel green for valid
                                                : containerValidationStatus === 'invalid'
                                                    ? '#ef4444' // Red for invalid
                                                    : isValidContainerNumber
                                                        ? `${theme.colors.primary}26`
                                                        : containerNumber
                                                            ? '#ef4444'
                                                            : `${theme.colors.primary}26`
                                                }`,
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            color: theme.colors.text.primary,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            letterSpacing: '1px',
                                            fontWeight: 600,
                                            transition: 'border-color 0.2s',
                                        }}
                                        className="light-placeholder"
                                    />
                                    {isValidatingContainer && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            pointerEvents: 'none'
                                        }}>
                                            <Loader2 size={16} className="animate-spin" style={{ color: theme.colors.primary, opacity: 0.7 }} />
                                        </div>
                                    )}
                                </div>
                                <style>{`
                                    .light-placeholder::placeholder {
                                        opacity: 0.4;
                                        color: ${theme.colors.text.primary};
                                    }
                                `}</style>
                                {containerNumber && !isValidContainerNumber && (
                                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', opacity: 0.75 }}>
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
                                        background: `${theme.colors.primary}0a`,
                                        border: `2px dashed ${theme.colors.primary}26`,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        color: theme.colors.primary,
                                        fontSize: '13px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = theme.colors.primary;
                                        e.currentTarget.style.background = `${theme.colors.primary}14`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = `${theme.colors.primary}26`;
                                        e.currentTarget.style.background = `${theme.colors.primary}0a`;
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
                                                    background: `${theme.colors.primary}0a`,
                                                    border: `1px solid ${theme.colors.primary}1a`,
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileText size={16} style={{ color: theme.colors.primary }} />
                                                    <span style={{ color: theme.colors.text.primary, fontSize: '13px' }}>{doc.documentName}</span>
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
        if (!truckDetails) return null;

        // If not inbound container, just show success message (no slip)
        if (!isInboundContainer) {
            return (
                <div style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    padding: '40px'
                }}>
                    <div className="animate-fade-in" style={{
                        width: '120px',
                        height: '120px',
                        background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '32px',
                        boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.4)'
                    }}>
                        <CheckCircle size={64} className="text-green-600" style={{ strokeWidth: 2.5 }} />
                    </div>

                    <h2 className="animate-slide-up" style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        color: theme.colors.primary,
                        marginBottom: '12px',
                        textAlign: 'center'
                    }}>
                        Gate In Successful
                    </h2>

                    <p className="animate-slide-up" style={{
                        color: theme.colors.text.primary,
                        opacity: 0.7,
                        fontSize: '15px',
                        textAlign: 'center',
                        maxWidth: '280px',
                        lineHeight: '1.5'
                    }}>
                        The truck has been successfully gated in. No driver slip required for this shipment type.
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

                    {/* One slip per container. Both shipments are gated in by the
                        time this screen appears, so the tabs select which slip to
                        view and download rather than which to submit. */}
                    {isMultiShipment && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {truckShipments.map((shipment, index) => {
                                const isActive = activeShipmentIndex === index;
                                return (
                                    <button
                                        key={shipment.shipmentNbr || index}
                                        onClick={() => handleSelectSlipShipment(index)}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '10px',
                                            background: isActive ? theme.colors.primary : `${theme.colors.primary}12`,
                                            color: isActive ? '#fff' : theme.colors.primary,
                                            border: `1px solid ${isActive ? theme.colors.primary : `${theme.colors.primary}26`}`,
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {shipment.containerNbr || shipment.shipmentNbr || `Slip ${index + 1}`}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div ref={slipRef} className="driver-slip-ticket animate-fade-in" style={{
                        background: theme.colors.background.primary,
                        borderRadius: '18px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        {/* Header Section */}
                        <div style={{
                            background: 'linear-gradient(135deg, #4B686C, #33455F)',
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

                        {/* Ticket Body.

                            Content and order follow the mobile app's driver slip
                            (_DriverSlipTicket in gate_in_screen.dart) so the two
                            hand the driver the same document: logo + customer,
                            container with its equipment type, Gate/Shipment,
                            truck barcode, then a Remarks box to write in.

                            The mobile slip has no "Request Type" row, so the one
                            that used to sit above Container is gone. It showed
                            shipmentName (INBOUND_CONTAINER); restore it here if
                            the yard wants it on both. */}
                        <div style={{ padding: '20px', background: theme.colors.background.primary, borderRadius: '0 0 18px 18px' }}>

                            {/* Company logo left, customer right */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                <img
                                    src={naqleenLogo}
                                    alt="Naqleen"
                                    style={{ height: '38px', maxWidth: '140px', objectFit: 'contain' }}
                                />
                                {truckDetails.customerName && (
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: theme.colors.text.primary,
                                        textAlign: 'right',
                                        lineHeight: 1.3
                                    }}>
                                        {truckDetails.customerName}
                                    </span>
                                )}
                            </div>

                            {/* Container Row. The equipment type rides with the
                                container number in parentheses, as on mobile --
                                one line, not a separate row. */}
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
                                <span style={{ fontSize: '12px', color: theme.colors.text.secondary, fontWeight: 600 }}>Container</span>
                                <span style={{ fontSize: '13px', color: theme.colors.text.primary, fontWeight: 700 }}>
                                    {truckDetails.containerNumber || '-'}
                                    {truckDetails.containerType ? ` (${truckDetails.containerType})` : ''}
                                </span>
                            </div>

                            <div style={{ height: '1px', background: theme.colors.border, marginBottom: '16px' }} />

                            {/* Gate & Shipment Info */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '10px', color: theme.colors.text.secondary, fontWeight: 700, textTransform: 'uppercase' }}>Gate</div>
                                    <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: 800, marginTop: '2px' }}>IN</div>
                                </div>
                                <div style={{ flex: 2, textAlign: 'right' }}>
                                    <div style={{ fontSize: '10px', color: theme.colors.text.secondary, fontWeight: 700, textTransform: 'uppercase' }}>Shipment</div>
                                    <div style={{ fontSize: '12px', color: theme.colors.text.primary, fontWeight: 600, marginTop: '2px' }}>
                                        {truckDetails.shipmentNumber || '-'}
                                    </div>
                                </div>
                            </div>

                            {/* Perforation visual */}
                            <div style={{ margin: '16px 0', borderTop: `2px dashed ${theme.colors.border}`, position: 'relative' }}>
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

                            {/* Remarks. Deliberately empty -- it is space for the
                                gate officer to write on the printed slip, which
                                is why it has a fixed height and no input. */}
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                borderRadius: '8px',
                                border: `1px solid ${theme.colors.border}`,
                                background: 'transparent'
                            }}>
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: theme.colors.text.secondary
                                }}>
                                    Remarks:
                                </div>
                                <div style={{ height: '25px' }} />
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
