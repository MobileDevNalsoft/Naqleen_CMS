import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PanelLayout from './PanelLayout';
import { Truck, FileText, Loader2, ChevronDown, Upload, X, Building2, Package, CheckCircle } from 'lucide-react';
import { useGateInTrucksQuery, useCustomerShipmentsQuery, useSubmitGateInMutation, getGateInTruckDetails } from '../../api';
import type { GateTruckDetails, GateCustomer, GateShipment, GateDocument } from '../../api/types';

interface GateInPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function GateInPanel({ isOpen, onClose }: GateInPanelProps) {
    // Form state
    const [truckNumber, setTruckNumber] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [truckDetails, setTruckDetails] = useState<GateTruckDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Customer/Shipment selection state
    const [selectedCustomer, setSelectedCustomer] = useState<GateCustomer | null>(null);
    const [selectedShipment, setSelectedShipment] = useState<GateShipment | null>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);

    // Document upload state
    const [documents, setDocuments] = useState<GateDocument[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounced search
    const debouncedSearch = useDebounce(truckNumber, 300);

    // API hooks
    const { data: truckSuggestions = [], isLoading: isLoadingSuggestions } = useGateInTrucksQuery(
        debouncedSearch,
        showSuggestions && debouncedSearch.length >= 3
    );

    const { data: shipments = [], isLoading: isLoadingShipments } = useCustomerShipmentsQuery(
        selectedCustomer?.customerNbr || '',
        0,
        '',
        !!selectedCustomer
    );

    const submitMutation = useSubmitGateInMutation();

    // Computed states
    const isCustomerSelectionRequired = useMemo(() =>
        truckDetails?.customerList && truckDetails.customerList.length > 0,
        [truckDetails]
    );

    const isShipmentSelectionRequired = useMemo(() =>
        isCustomerSelectionRequired && selectedCustomer !== null,
        [isCustomerSelectionRequired, selectedCustomer]
    );

    const canSubmit = useMemo(() => {
        if (!truckDetails) return false;
        if (isCustomerSelectionRequired && !selectedCustomer) return false;
        if (isShipmentSelectionRequired && !selectedShipment) return false;
        return true;
    }, [truckDetails, isCustomerSelectionRequired, selectedCustomer, isShipmentSelectionRequired, selectedShipment]);

    // Reset state when panel closes
    useEffect(() => {
        if (!isOpen) {
            setTruckNumber('');
            setTruckDetails(null);
            setSelectedCustomer(null);
            setSelectedShipment(null);
            setDocuments([]);
            setShowSuggestions(false);
        }
    }, [isOpen]);

    // Handle truck search input
    const handleTruckInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        setTruckNumber(value);
        setShowSuggestions(true);
        // Reset details when searching again
        if (truckDetails) {
            setTruckDetails(null);
            setSelectedCustomer(null);
            setSelectedShipment(null);
        }
    };

    // Handle truck selection from suggestions
    const handleSelectTruck = (truck: string) => {
        setTruckNumber(truck);
        setShowSuggestions(false);
    };

    // Fetch truck details
    const handleGetDetails = async () => {
        if (truckNumber.length < 3) return;

        setIsLoadingDetails(true);
        try {
            const details = await getGateInTruckDetails(truckNumber);
            if (details) {
                setTruckDetails(details);
                // Reset selections
                setSelectedCustomer(null);
                setSelectedShipment(null);
            } else {
                // Show error toast
                console.error('Truck not found');
            }
        } catch (error) {
            console.error('Error fetching truck details:', error);
        } finally {
            setIsLoadingDetails(false);
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
            await submitMutation.mutateAsync({
                shipment_nbr: selectedShipment?.shipmentNbr || truckDetails.shipmentNumber,
                truck_nbr: truckDetails.truckNumber,
                driver_nbr: truckDetails.driverName,
                truck_type: truckDetails.truckType || '3PL',
                container_nbr: truckDetails.containerNumber,
                documents: documents
            });

            // Success - close panel
            onClose();
        } catch (error) {
            console.error('Error submitting gate in:', error);
        }
    };

    // Styles
    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    };

    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
    };

    const detailRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    };

    const dropdownStyle = {
        position: 'absolute' as const,
        top: '100%',
        left: 0,
        right: 0,
        background: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        marginTop: '4px',
        maxHeight: '200px',
        overflowY: 'auto' as const,
        zIndex: 100,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
    };

    const dropdownItemStyle = {
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'background 0.2s',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    };

    return (
        <PanelLayout
            title="Gate In"
            category="GATE OPERATION"
            isOpen={isOpen}
            onClose={onClose}
            footerActions={
                <>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={truckDetails ? handleSubmitGateIn : handleGetDetails}
                        disabled={truckDetails ? !canSubmit || submitMutation.isPending : truckNumber.length < 3 || isLoadingDetails}
                        style={{
                            padding: '10px 24px',
                            background: (truckDetails ? canSubmit : truckNumber.length >= 3) && !submitMutation.isPending && !isLoadingDetails
                                ? 'var(--secondary-gradient)'
                                : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '12px',
                            color: (truckDetails ? canSubmit : truckNumber.length >= 3) ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.5)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: (truckDetails ? canSubmit : truckNumber.length >= 3) ? 'pointer' : 'not-allowed',
                            boxShadow: (truckDetails ? canSubmit : truckNumber.length >= 3) ? '0 4px 12px rgba(247, 207, 155, 0.3)' : 'none',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {(isLoadingDetails || submitMutation.isPending) && <Loader2 size={16} className="animate-spin" />}
                        {truckDetails ? 'Confirm Gate In' : 'Get Details'}
                    </button>
                </>
            }
        >
            {/* Truck Search Section */}
            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Truck Number *</label>
                <div style={{ position: 'relative' }}>
                    <Truck size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                    {isLoadingSuggestions && (
                        <Loader2 size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} className="animate-spin" />
                    )}
                    <input
                        type="text"
                        placeholder="Enter truck number (min 3 chars)"
                        value={truckNumber}
                        onChange={handleTruckInputChange}
                        onFocus={() => truckNumber.length >= 3 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        maxLength={10}
                        className="modern-input"
                        style={{ paddingLeft: '48px', paddingRight: isLoadingSuggestions ? '48px' : '14px' }}
                        disabled={isLoadingDetails}
                    />

                    {/* Suggestions dropdown */}
                    {showSuggestions && truckSuggestions.length > 0 && (
                        <div style={dropdownStyle}>
                            {truckSuggestions.map((truck, index) => (
                                <div
                                    key={index}
                                    style={dropdownItemStyle}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    onMouseDown={() => handleSelectTruck(truck)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Truck size={14} style={{ color: 'var(--secondary-color)' }} />
                                        <span style={{ color: 'white', fontWeight: 500 }}>{truck}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Truck Details Card */}
            {truckDetails && (
                <div style={cardStyle}>
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
                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{truckDetails.truckNumber}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Truck Details</div>
                        </div>
                    </div>

                    <div style={detailRowStyle}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Driver Name</span>
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>{truckDetails.driverName || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Driver Iqama</span>
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>{truckDetails.driverIqama || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Container</span>
                        <span style={{ color: 'var(--secondary-color)', fontSize: '13px', fontWeight: 600 }}>{truckDetails.containerNumber || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Container Type</span>
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>{truckDetails.containerType || 'N/A'}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Shipment Type</span>
                        <span style={{
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'var(--primary-color)',
                            padding: '4px 10px',
                            borderRadius: '6px'
                        }}>
                            {truckDetails.shipmentName || 'N/A'}
                        </span>
                    </div>
                    {truckDetails.customerName && (
                        <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                            <span style={{ color: '#64748b', fontSize: '13px' }}>Customer</span>
                            <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>{truckDetails.customerName}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Customer Selection - shown when customer_list is returned */}
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
                            onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
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
                            <div style={dropdownStyle}>
                                {truckDetails.customerList.map((customer, index) => (
                                    <div
                                        key={index}
                                        style={dropdownItemStyle}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => {
                                            setSelectedCustomer(customer);
                                            setSelectedShipment(null);
                                            setShowCustomerDropdown(false);
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Building2 size={14} style={{ color: 'var(--secondary-color)' }} />
                                            <span style={{ color: 'white', fontWeight: 500 }}>{customer.customerName}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', marginLeft: '22px' }}>
                                            {customer.customerNbr}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Shipment Selection - shown after customer is selected */}
            {isShipmentSelectionRequired && (
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Select Shipment *</label>
                    <div style={{ position: 'relative' }}>
                        <Package size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                        {isLoadingShipments && (
                            <Loader2 size={16} style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} className="animate-spin" />
                        )}
                        <div
                            className="modern-input"
                            style={{
                                paddingLeft: '48px',
                                paddingRight: '48px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onClick={() => !isLoadingShipments && setShowShipmentDropdown(!showShipmentDropdown)}
                        >
                            {selectedShipment ? selectedShipment.shipmentNbr : 'Select a shipment...'}
                        </div>
                        <ChevronDown size={18} style={{
                            position: 'absolute',
                            right: '14px',
                            top: '50%',
                            transform: `translateY(-50%) rotate(${showShipmentDropdown ? 180 : 0}deg)`,
                            color: '#4B686C',
                            transition: 'transform 0.2s'
                        }} />

                        {showShipmentDropdown && shipments.length > 0 && (
                            <div style={dropdownStyle}>
                                {shipments.map((shipment, index) => (
                                    <div
                                        key={index}
                                        style={dropdownItemStyle}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => {
                                            setSelectedShipment(shipment);
                                            setShowShipmentDropdown(false);
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Package size={14} style={{ color: 'var(--secondary-color)' }} />
                                            <span style={{ color: 'white', fontWeight: 500 }}>{shipment.shipmentNbr}</span>
                                        </div>
                                        {shipment.containerNbr && (
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', marginLeft: '22px' }}>
                                                Container: {shipment.containerNbr}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Document Upload Section */}
            {truckDetails && (
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
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '2px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#64748b',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--secondary-color)';
                            e.currentTarget.style.color = 'var(--secondary-color)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.color = '#64748b';
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
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={16} style={{ color: 'var(--secondary-color)' }} />
                                        <span style={{ color: 'white', fontSize: '13px' }}>{doc.documentName}</span>
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
            )}

            {/* Success state indicator */}
            {submitMutation.isSuccess && (
                <div style={{
                    padding: '12px 16px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#22c55e',
                    fontSize: '13px',
                    fontWeight: 500
                }}>
                    <CheckCircle size={16} />
                    Gate In submitted successfully
                </div>
            )}

            {/* Error state indicator */}
            {submitMutation.isError && (
                <div style={{
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: 500
                }}>
                    <X size={16} />
                    Failed to submit Gate In. Please try again.
                </div>
            )}
        </PanelLayout>
    );
}
