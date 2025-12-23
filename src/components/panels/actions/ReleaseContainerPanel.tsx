import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Search, User, CreditCard, Truck, Building2, BookOpen, Package,
    MapPin, ChevronRight, Plus, Edit2, Trash2, X, Loader2, CheckCircle2,
    Container as ContainerIcon
} from 'lucide-react';
import PanelLayout from '../PanelLayout';
import {
    useTruckSuggestionsQuery,
    useReleaseContainerTruckDetailsQuery,
    useSubmitReleaseContainerMutation
} from '../../../api/handlers/releaseContainerApi';
import type {
    ReleaseContainerTruckDetails,
    SelectedContainer,
    ReleaseContainerItem,
    ReleaseContainerRequest,
    ContainerData
} from '../../../api/types/releaseContainerTypes';

interface ReleaseContainerPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReleaseContainerPanel({ isOpen, onClose }: ReleaseContainerPanelProps) {
    // Search state
    const [searchText, setSearchText] = useState('');
    const [selectedTruckNbr, setSelectedTruckNbr] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Container selection state
    const [selectedContainers, setSelectedContainers] = useState<SelectedContainer[]>([]);
    const [selectedContainerType, setSelectedContainerType] = useState<string | null>(null);

    // Modal state
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Success dialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successData, setSuccessData] = useState<{
        truckNbr: string;
        bookingNbr: string;
        customerName: string;
        containers: SelectedContainer[];
    } | null>(null);

    // API hooks
    const { data: suggestions = [], isLoading: isLoadingSuggestions } = useTruckSuggestionsQuery(searchText);
    const { data: truckDetails, isLoading: isLoadingDetails, refetch: refetchDetails } = useReleaseContainerTruckDetailsQuery(selectedTruckNbr);
    const submitMutation = useSubmitReleaseContainerMutation();

    // Debounce search
    const [debouncedSearchText, setDebouncedSearchText] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchText(searchText), 300);
        return () => clearTimeout(timer);
    }, [searchText]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target as Node) &&
                !searchInputRef.current?.contains(e.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle RELEASE_CFS - auto-populate container
    useEffect(() => {
        if (truckDetails?.orderType === 'RELEASE_CFS' && truckDetails.containerNbr) {
            setSelectedContainerType(truckDetails.containerType || '');
            setSelectedContainers([{
                containerNbr: truckDetails.containerNbr,
                containerType: truckDetails.containerType || '',
                shipment: truckDetails.shipmentNbr || '',
                position: truckDetails.position || ''
            }]);
        }
    }, [truckDetails]);

    // Reset state when panel closes
    useEffect(() => {
        if (!isOpen) {
            handleReset();
        }
    }, [isOpen]);

    const handleReset = () => {
        setSearchText('');
        setSelectedTruckNbr(null);
        setSelectedContainers([]);
        setSelectedContainerType(null);
        setShowSuccessDialog(false);
        setSuccessData(null);
    };

    const handleSelectTruck = (truckNbr: string) => {
        setSearchText(truckNbr);
        setSelectedTruckNbr(truckNbr);
        setShowSuggestions(false);
        setSelectedContainers([]);
        setSelectedContainerType(null);
    };

    // Business rule: 20ft allows up to 2, others allow 1
    const canAddMoreContainers = useMemo(() => {
        if (!selectedContainerType) return true;
        if (selectedContainerType.startsWith('2')) {
            return selectedContainers.length < 2;
        }
        return selectedContainers.length === 0;
    }, [selectedContainerType, selectedContainers]);

    const handleAddContainer = () => {
        setEditingIndex(null);
        setShowSelectionModal(true);
    };

    const handleEditContainer = (index: number) => {
        setEditingIndex(index);
        setShowSelectionModal(true);
    };

    const handleRemoveContainer = (index: number) => {
        const updated = [...selectedContainers];
        updated.splice(index, 1);
        setSelectedContainers(updated);
        if (updated.length === 0) {
            setSelectedContainerType(null);
        }
    };

    const handleContainerSelected = (container: SelectedContainer) => {
        if (editingIndex !== null) {
            const updated = [...selectedContainers];
            updated[editingIndex] = container;
            setSelectedContainers(updated);
        } else {
            setSelectedContainers([...selectedContainers, container]);
        }
        if (!selectedContainerType) {
            setSelectedContainerType(container.containerType);
        }
        setShowSelectionModal(false);
        setEditingIndex(null);
    };

    const handleSubmit = async () => {
        if (!truckDetails || selectedContainers.length === 0) return;

        const request: ReleaseContainerRequest = {
            truckNbr: truckDetails.truckNbr,
            bookingNbr: truckDetails.bookingNbr,
            orderType: truckDetails.orderType,
            customerNbr: truckDetails.customerNbr,
            customerName: truckDetails.customerName,
            orderNbr: truckDetails.orderMovementXid,
            containers: selectedContainers.map(c => ({
                containerNbr: c.containerNbr,
                containerType: c.containerType,
                shipmentNbr: c.shipment,
                position: c.position
            }))
        };

        try {
            const result = await submitMutation.mutateAsync(request);
            if (result.success) {
                setSuccessData({
                    truckNbr: truckDetails.truckNbr,
                    bookingNbr: truckDetails.bookingNbr,
                    customerName: truckDetails.customerName,
                    containers: [...selectedContainers]
                });
                setShowSuccessDialog(true);
            }
        } catch (error) {
            console.error('Submit error:', error);
        }
    };

    const handleSuccessClose = () => {
        handleReset();
        onClose();
    };

    const isReadOnly = truckDetails?.orderType === 'RELEASE_CFS';

    return (
        <>
            <PanelLayout
                title="Release Container"
                category="ACTION"
                isOpen={isOpen && !showSuccessDialog}
                onClose={onClose}
                width="460px"
                footerActions={
                    truckDetails && selectedContainers.length > 0 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={submitMutation.isPending}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: 'none',
                                background: submitMutation.isPending
                                    ? 'rgba(0, 0, 0, 0.05)'
                                    : 'var(--secondary-gradient)',
                                color: submitMutation.isPending
                                    ? 'rgba(75, 104, 108, 0.3)'
                                    : 'var(--primary-color)',
                                fontSize: '14px',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                cursor: submitMutation.isPending ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                textTransform: 'uppercase'
                            }}
                        >
                            {submitMutation.isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Releasing...
                                </>
                            ) : (
                                <>
                                    <ContainerIcon size={18} />
                                    Release Container{selectedContainers.length > 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    ) : undefined
                }
            >
                {/* Truck Search Section */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                            padding: '10px',
                            background: 'rgba(75, 104, 108, 0.1)',
                            borderRadius: '12px'
                        }}>
                            <Search size={18} color="#4B686C" />
                        </div>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                                Search Truck
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                Enter truck number to load details
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchText}
                            onChange={(e) => {
                                setSearchText(e.target.value.toUpperCase());
                                setShowSuggestions(true);
                                if (selectedTruckNbr) {
                                    setSelectedTruckNbr(null);
                                    setSelectedContainers([]);
                                    setSelectedContainerType(null);
                                }
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            placeholder="Enter truck number..."
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                paddingLeft: '44px',
                                borderRadius: '10px',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                fontSize: '14px',
                                fontWeight: 500,
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                boxSizing: 'border-box'
                            }}
                        />
                        <Truck
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#64748b'
                            }}
                        />
                        {isLoadingSuggestions && (
                            <Loader2
                                size={18}
                                style={{
                                    position: 'absolute',
                                    right: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#4B686C',
                                    animation: 'spin 1s linear infinite'
                                }}
                            />
                        )}

                        {/* Suggestions dropdown */}
                        {showSuggestions && suggestions.length > 0 && searchText.length >= 3 && (
                            <div
                                ref={suggestionsRef}
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                                    zIndex: 100,
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}
                            >
                                {suggestions.map((suggestion) => (
                                    <div
                                        key={suggestion}
                                        onClick={() => handleSelectTruck(suggestion)}
                                        style={{
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: '#1e293b',
                                            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading state */}
                {isLoadingDetails && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        color: '#64748b'
                    }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '12px' }} />
                        Loading truck details...
                    </div>
                )}

                {/* Truck Details Card */}
                {truckDetails && !isLoadingDetails && (
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                padding: '8px',
                                background: 'rgba(75, 104, 108, 0.1)',
                                borderRadius: '10px'
                            }}>
                                <Truck size={16} color="#4B686C" />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                Truck Details
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <DetailItem icon={<User size={14} />} label="Driver Name" value={truckDetails.driverName} />
                            <DetailItem icon={<CreditCard size={14} />} label="Driver Iqama" value={truckDetails.driverIqamaNbr} />
                            <DetailItem icon={<Truck size={14} />} label="Truck Number" value={truckDetails.truckNbr} />
                            <DetailItem icon={<Building2 size={14} />} label="Customer" value={truckDetails.customerName} />
                            <DetailItem icon={<BookOpen size={14} />} label="Booking" value={truckDetails.bookingNbr} fullWidth />
                        </div>
                    </div>
                )}

                {/* Container Selection Section */}
                {truckDetails && !isLoadingDetails && (
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        border: '1px solid rgba(75, 104, 108, 0.15)',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.08) 0%, rgba(75, 104, 108, 0.03) 100%)',
                            borderBottom: '1px solid rgba(75, 104, 108, 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    padding: '10px',
                                    background: 'linear-gradient(135deg, #4B686C 0%, #3a5357 100%)',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(75, 104, 108, 0.3)'
                                }}>
                                    <ContainerIcon size={18} color="white" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                                        {isReadOnly ? 'Container Details' : 'Container Selection'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        {isReadOnly ? 'Container to be released' : 'Select container type, container, and shipment'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '16px 20px' }}>
                            {/* Selected Containers */}
                            {selectedContainers.map((container, index) => (
                                <ContainerCard
                                    key={`${container.containerNbr}-${index}`}
                                    container={container}
                                    containerType={container.containerType}
                                    onEdit={() => handleEditContainer(index)}
                                    onRemove={() => handleRemoveContainer(index)}
                                    readOnly={isReadOnly}
                                />
                            ))}

                            {/* Add Container Button */}
                            {!isReadOnly && (selectedContainers.length === 0 || canAddMoreContainers) && (
                                <button
                                    onClick={handleAddContainer}
                                    style={{
                                        width: '100%',
                                        padding: '14px 20px',
                                        borderRadius: '12px',
                                        border: '1.5px solid rgba(75, 104, 108, 0.3)',
                                        background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.1) 0%, rgba(75, 104, 108, 0.05) 100%)',
                                        color: '#4B686C',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s',
                                        marginTop: selectedContainers.length > 0 ? '12px' : '0'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(75, 104, 108, 0.15)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(75, 104, 108, 0.1) 0%, rgba(75, 104, 108, 0.05) 100%)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Plus size={18} />
                                    {selectedContainers.length === 0 ? 'Add Container' : 'Add Another Container'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </PanelLayout>

            {/* Container Selection Modal */}
            {showSelectionModal && truckDetails && (
                <ContainerSelectionModal
                    truckDetails={truckDetails}
                    selectedContainerType={selectedContainerType}
                    alreadySelectedContainers={selectedContainers.filter((_, i) => i !== editingIndex).map(c => c.containerNbr)}
                    alreadySelectedShipments={selectedContainers.filter((_, i) => i !== editingIndex).map(c => c.shipment)}
                    editingContainer={editingIndex !== null ? selectedContainers[editingIndex] : null}
                    onSelect={handleContainerSelected}
                    onClose={() => {
                        setShowSelectionModal(false);
                        setEditingIndex(null);
                    }}
                />
            )}

            {/* Success Dialog */}
            {showSuccessDialog && successData && (
                <SuccessDialog
                    data={successData}
                    onClose={handleSuccessClose}
                />
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}

// --- Subcomponents ---

function DetailItem({ icon, label, value, fullWidth }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    fullWidth?: boolean;
}) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            gridColumn: fullWidth ? '1 / -1' : 'auto'
        }}>
            <div style={{
                padding: '6px',
                background: 'rgba(75, 104, 108, 0.08)',
                borderRadius: '8px',
                color: '#4B686C'
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    {label}
                </div>
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700 }}>
                    {value || '—'}
                </div>
            </div>
        </div>
    );
}

function ContainerCard({ container, containerType, onEdit, onRemove, readOnly }: {
    container: SelectedContainer;
    containerType: string;
    onEdit: () => void;
    onRemove: () => void;
    readOnly?: boolean;
}) {
    return (
        <div style={{
            background: 'white',
            borderRadius: '14px',
            border: '1px solid rgba(75, 104, 108, 0.15)',
            marginBottom: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
        }}>
            <div style={{ padding: '16px', position: 'relative' }}>
                {/* Container Type Badge */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #4B686C 0%, #3a5357 100%)',
                    borderBottomLeftRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'white',
                    letterSpacing: '0.5px'
                }}>
                    {containerType}
                </div>

                {/* Container Number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{
                        padding: '8px',
                        background: 'rgba(75, 104, 108, 0.1)',
                        borderRadius: '10px'
                    }}>
                        <Package size={16} color="#4B686C" />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', letterSpacing: '0.5px' }}>
                        {container.containerNbr}
                    </span>
                </div>

                {/* Shipment */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: container.position ? '10px' : '0' }}>
                    <div style={{
                        padding: '8px',
                        background: 'rgba(75, 104, 108, 0.1)',
                        borderRadius: '10px'
                    }}>
                        <Truck size={16} color="#4B686C" />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {container.shipment}
                    </span>
                </div>

                {/* Position */}
                {container.position && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            padding: '8px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '10px'
                        }}>
                            <MapPin size={16} color="#16a34a" />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                            {container.position}
                        </span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {!readOnly && (
                <div style={{
                    display: 'flex',
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)'
                }}>
                    <button
                        onClick={onEdit}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'transparent',
                            border: 'none',
                            borderRight: '1px solid rgba(0, 0, 0, 0.06)',
                            color: '#4B686C',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Edit2 size={14} />
                        Edit
                    </button>
                    <button
                        onClick={onRemove}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Trash2 size={14} />
                        Remove
                    </button>
                </div>
            )}
        </div>
    );
}

// --- Container Selection Modal ---

function ContainerSelectionModal({
    truckDetails,
    selectedContainerType,
    alreadySelectedContainers,
    alreadySelectedShipments,
    editingContainer,
    onSelect,
    onClose
}: {
    truckDetails: ReleaseContainerTruckDetails;
    selectedContainerType: string | null;
    alreadySelectedContainers: string[];
    alreadySelectedShipments: string[];
    editingContainer: SelectedContainer | null;
    onSelect: (container: SelectedContainer) => void;
    onClose: () => void;
}) {
    const [currentStep, setCurrentStep] = useState(editingContainer ? 2 : 0);
    const [localContainerType, setLocalContainerType] = useState<string | null>(editingContainer?.containerType || null);
    const [localContainer, setLocalContainer] = useState<string | null>(editingContainer?.containerNbr || null);
    const [localShipment, setLocalShipment] = useState<string | null>(editingContainer?.shipment || null);
    const [localPosition, setLocalPosition] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const containerTypes = useMemo(() => {
        if (!truckDetails.containerTypes) return [];

        // Business rule: If already have containers, may need to filter types
        if (alreadySelectedContainers.length >= 2) {
            // Can only select 2-series types
            return Object.keys(truckDetails.containerTypes).filter(t => t.startsWith('2'));
        }
        if (alreadySelectedContainers.length === 1 && selectedContainerType?.startsWith('2')) {
            // Adding second container - only 2-series allowed
            return Object.keys(truckDetails.containerTypes).filter(t => t.startsWith('2'));
        }
        return Object.keys(truckDetails.containerTypes);
    }, [truckDetails.containerTypes, alreadySelectedContainers, selectedContainerType]);

    const containers = useMemo(() => {
        if (!localContainerType || !truckDetails.containerTypes?.[localContainerType]) return [];
        return truckDetails.containerTypes[localContainerType].containers
            .filter(c => !alreadySelectedContainers.includes(c.containerNbr));
    }, [localContainerType, truckDetails.containerTypes, alreadySelectedContainers]);

    const shipments = useMemo(() => {
        if (!localContainerType || !truckDetails.containerTypes?.[localContainerType]) return [];
        return truckDetails.containerTypes[localContainerType].shipments
            .filter(s => !alreadySelectedShipments.includes(s));
    }, [localContainerType, truckDetails.containerTypes, alreadySelectedShipments]);

    const getListItems = () => {
        let items: string[] = [];
        switch (currentStep) {
            case 0:
                items = containerTypes;
                break;
            case 1:
                items = containers.map(c => c.containerNbr);
                break;
            case 2:
                items = shipments;
                break;
        }
        if (searchQuery) {
            items = items.filter(item =>
                item.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return items;
    };

    const handleItemSelect = (item: string) => {
        setSearchQuery('');
        switch (currentStep) {
            case 0:
                setLocalContainerType(item);
                setLocalContainer(null);
                setLocalShipment(null);
                setCurrentStep(1);
                break;
            case 1:
                setLocalContainer(item);
                // Find position for this container
                const containerData = containers.find(c => c.containerNbr === item);
                setLocalPosition(containerData?.position || '');

                // Auto-select if only one shipment
                if (shipments.length === 1) {
                    onSelect({
                        containerNbr: item,
                        containerType: localContainerType!,
                        shipment: shipments[0],
                        position: containerData?.position || ''
                    });
                } else {
                    setCurrentStep(2);
                }
                break;
            case 2:
                setLocalShipment(item);
                onSelect({
                    containerNbr: localContainer!,
                    containerType: localContainerType!,
                    shipment: item,
                    position: localPosition
                });
                break;
        }
    };

    const stepLabels = ['Container Type', 'Container', 'Shipment'];
    const stepIcons = [
        <Package size={18} key="type" />,
        <ContainerIcon size={18} key="container" />,
        <Truck size={18} key="shipment" />
    ];

    const items = getListItems();

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '500px',
                maxHeight: '70vh',
                background: 'white',
                borderRadius: '24px 24px 0 0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Handle */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '4px',
                        background: '#e2e8f0',
                        borderRadius: '2px'
                    }} />
                </div>

                {/* Header with Breadcrumb */}
                <div style={{ padding: '0 20px 20px' }}>
                    {/* Breadcrumb */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginBottom: '16px'
                    }}>
                        {[0, 1, 2].map((step, i) => (
                            <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                                <button
                                    onClick={() => {
                                        if (step < currentStep) {
                                            setCurrentStep(step);
                                            setSearchQuery('');
                                        }
                                    }}
                                    disabled={step > currentStep}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: step === currentStep
                                            ? 'rgba(75, 104, 108, 0.1)'
                                            : step < currentStep
                                                ? 'rgba(34, 197, 94, 0.1)'
                                                : 'transparent',
                                        color: step === currentStep
                                            ? '#4B686C'
                                            : step < currentStep
                                                ? '#16a34a'
                                                : '#94a3b8',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: step < currentStep ? 'pointer' : 'default',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {step === 0 && (localContainerType || stepLabels[0])}
                                    {step === 1 && (localContainer || stepLabels[1])}
                                    {step === 2 && (localShipment || stepLabels[2])}
                                </button>
                                {i < 2 && (
                                    <ChevronRight size={16} color="#cbd5e1" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            padding: '10px',
                            background: 'rgba(75, 104, 108, 0.1)',
                            borderRadius: '12px',
                            color: '#4B686C'
                        }}>
                            {stepIcons[currentStep]}
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                            Select {stepLabels[currentStep]}
                        </span>
                        <button
                            onClick={onClose}
                            style={{
                                marginLeft: 'auto',
                                background: 'rgba(0, 0, 0, 0.05)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#64748b'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div style={{ padding: '0 20px 12px' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            paddingLeft: '44px',
                            borderRadius: '10px',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 20px 20px'
                }}>
                    {items.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: '#64748b'
                        }}>
                            {searchQuery ? 'No matches found' : 'No items available'}
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item}
                                onClick={() => handleItemSelect(item)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    padding: '8px',
                                    background: 'rgba(75, 104, 108, 0.1)',
                                    borderRadius: '8px',
                                    color: '#4B686C'
                                }}>
                                    {stepIcons[currentStep]}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', flex: 1 }}>
                                    {item}
                                </span>
                                <ChevronRight size={16} color="#cbd5e1" />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Success Dialog ---

function SuccessDialog({ data, onClose }: {
    data: {
        truckNbr: string;
        bookingNbr: string;
        customerName: string;
        containers: SelectedContainer[];
    };
    onClose: () => void;
}) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '420px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Success Header */}
                <div style={{
                    padding: '32px',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <CheckCircle2 size={32} color="white" />
                    </div>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: 'white',
                        margin: 0
                    }}>
                        Container{data.containers.length > 1 ? 's' : ''} Released Successfully
                    </h2>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Truck Info */}
                    <div style={{
                        background: 'rgba(75, 104, 108, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Truck Number</div>
                                <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>{data.truckNbr}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Booking</div>
                                <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>{data.bookingNbr}</div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Customer</div>
                                <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>{data.customerName}</div>
                            </div>
                        </div>
                    </div>

                    {/* Released Containers */}
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>
                        Released Containers
                    </div>
                    {data.containers.map((container, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                background: 'rgba(34, 197, 94, 0.05)',
                                borderRadius: '10px',
                                border: '1px solid rgba(34, 197, 94, 0.1)',
                                marginBottom: '8px'
                            }}
                        >
                            <div style={{
                                padding: '8px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: '8px'
                            }}>
                                <ContainerIcon size={16} color="#16a34a" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                    {container.containerNbr}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {container.containerType} • {container.shipment}
                                </div>
                            </div>
                            {container.position && (
                                <div style={{
                                    padding: '4px 10px',
                                    background: '#16a34a',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: 'white'
                                }}>
                                    {container.position}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px 24px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.05)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
