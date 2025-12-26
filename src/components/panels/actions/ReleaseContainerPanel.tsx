import { useState, useEffect, useMemo } from 'react';
import {
    Search, Truck, Package, MapPin, ChevronRight, ChevronDown, Plus, Edit2, Trash2, X, Loader2, CheckCircle2,
    Container as ContainerIcon, ArrowLeft
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import PanelLayout from '../PanelLayout';
import TruckLoader from '../../ui/animations/TruckLoader';
import { showRichToast } from '../../ui/Toast';
import type { ToastDetailItem } from '../../ui/Toast';
import { useStore } from '../../../store/store';
import {
    useTruckSuggestionsQuery,
    useReleaseContainerTruckDetailsQuery,
    useSubmitReleaseContainerMutation
} from '../../../api/handlers/releaseContainerApi';
import type {
    ReleaseContainerTruckDetails,
    SelectedContainer,
    ReleaseContainerRequest
} from '../../../api/types/releaseContainerTypes';


interface ReleaseContainerPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReleaseContainerPanel({ isOpen, onClose }: ReleaseContainerPanelProps) {
    // Step-based navigation (like Position Container panel)
    const [step, setStep] = useState<'truck_list' | 'details' | 'container_selection' | 'success'>('truck_list');

    // Search state
    const [searchText, setSearchText] = useState('');
    const [selectedTruckNbr, setSelectedTruckNbr] = useState<string | null>(null);

    // Container selection state
    const [selectedContainers, setSelectedContainers] = useState<SelectedContainer[]>([]);
    const [selectedContainerType, setSelectedContainerType] = useState<string | null>(null);

    // Inline container selection state (replaces modal)
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [selectionStep, setSelectionStep] = useState(0); // 0=Type, 1=Container, 2=Shipment
    const [localContainerType, setLocalContainerType] = useState<string | null>(null);
    const [localContainer, setLocalContainer] = useState<string | null>(null);
    const [localPosition, setLocalPosition] = useState('');
    const [selectionSearchQuery, setSelectionSearchQuery] = useState('');

    // Success dialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successData, setSuccessData] = useState<{
        truckNbr: string;
        bookingNbr: string;
        customerName: string;
        containers: SelectedContainer[];
    } | null>(null);

    // API hooks
    // Fetch all trucks (empty search returns all)
    const { data: allTrucks = [], isLoading: isLoadingTrucks } = useTruckSuggestionsQuery('', isOpen);
    const { data: truckDetails, isLoading: isLoadingDetails } = useReleaseContainerTruckDetailsQuery(selectedTruckNbr);
    const submitMutation = useSubmitReleaseContainerMutation();

    // For container highlighting and cache invalidation
    const queryClient = useQueryClient();
    const setReleaseContainers = useStore((state) => state.setReleaseContainers);

    // For camera focus on container card click
    const setFocusPosition = useStore((state) => state.setFocusPosition);
    const entities = useStore((state) => state.entities);

    // Client-side filtering based on search
    const filteredTrucks = useMemo(() => {
        if (!searchText.trim()) return allTrucks;
        const search = searchText.toUpperCase();
        return allTrucks.filter(truck => truck.toUpperCase().includes(search));
    }, [allTrucks, searchText]);

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
        console.log('[ReleaseContainer] handleReset called');
        setSearchText('');
        setSelectedTruckNbr(null);
        setSelectedContainers([]);
        setSelectedContainerType(null);
        setShowSuccessDialog(false);
        setSuccessData(null);
        setStep('truck_list');
        // Clear release container highlights in 3D view
        setReleaseContainers([]);
    };

    const handleSelectTruck = (truckNbr: string) => {
        setSelectedTruckNbr(truckNbr);
        setSelectedContainers([]);
        setSelectedContainerType(null);
        setStep('details');
    };

    // Focus camera on a container in the 3D view
    const handleFocusContainer = (containerNbr: string) => {
        const entity = entities[containerNbr];
        if (entity) {
            setFocusPosition({
                positionString: containerNbr,
                x: entity.x,
                y: entity.y,
                z: entity.z
            });
        }
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
        // Reset selection state for new container
        setLocalContainerType(null);
        setLocalContainer(null);
        setLocalPosition('');
        setSelectionStep(0);
        setSelectionSearchQuery('');
        setStep('container_selection');
    };

    const handleEditContainer = (index: number) => {
        const container = selectedContainers[index];
        setEditingIndex(index);
        // Pre-populate with existing container data
        setLocalContainerType(container.containerType);
        setLocalContainer(container.containerNbr);
        setLocalPosition(container.position || '');
        setSelectionStep(2); // Start at shipment step for editing
        setSelectionSearchQuery('');
        setStep('container_selection');
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
        setEditingIndex(null);

        // Highlight all selected containers in the 3D yard view with orange border
        const allContainers = editingIndex !== null
            ? [...selectedContainers.slice(0, editingIndex), container, ...selectedContainers.slice(editingIndex + 1)]
            : [...selectedContainers, container];
        setReleaseContainers(allContainers.map(c => ({ container_nbr: c.containerNbr })));

        setStep('details'); // Return to details view
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
            console.log('[ReleaseContainer] API result:', result);
            if (result.success) {
                console.log('[ReleaseContainer] Success!');

                // Build container details for rich toast
                const containerDetailItems: ToastDetailItem[] = selectedContainers.map(c => ({
                    label: c.containerNbr,
                    sublabel: c.shipment,
                    badge: c.containerType
                }));

                // Show rich toast with structured content
                showRichToast(
                    'success',
                    `Container${selectedContainers.length > 1 ? 's' : ''} Released Successfully!`,
                    `Truck: ${truckDetails.truckNbr} • Booking: ${truckDetails.bookingNbr}`,
                    containerDetailItems,
                    10000
                );

                // Clear container highlight in 3D view
                setReleaseContainers([]);

                // Refresh containers in 3D yard view (removes released containers)
                queryClient.invalidateQueries({ queryKey: ['containers'] });

                // Refresh truck list (removes completed truck)
                queryClient.invalidateQueries({ queryKey: ['releaseContainerTrucks'] });

                // Reset selection and go back to truck list
                setSelectedTruckNbr(null);
                setSelectedContainers([]);
                setSelectedContainerType(null);
                setStep('truck_list');
            } else {
                console.error('[ReleaseContainer] API returned success=false:', result.message);
                // Show error toast with the API error message
                showRichToast(
                    'error',
                    'Release Failed',
                    result.message || 'Failed to release container. Please try again.',
                    undefined,
                    10000
                );
            }
        } catch (error: any) {
            console.error('[ReleaseContainer] Submit error:', error);
            // Show error toast with exception message
            showRichToast(
                'error',
                'Release Error',
                error?.message || 'An error occurred while releasing the container. Please try again.',
                undefined,
                10000
            );
        }
    };

    const handleSuccessClose = () => {
        console.log('[ReleaseContainer] handleSuccessClose called');
        handleReset();
        onClose();
    };

    const isReadOnly = truckDetails?.orderType === 'RELEASE_CFS';

    // Card Styles (matching Position Container panel)
    const truckCardStyle: React.CSSProperties = {
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid rgba(75, 104, 108, 0.15)',
        background: '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        marginBottom: '12px'
    };

    // Header back button for details and container_selection views
    const headerActions = (step === 'details' || step === 'container_selection') ? (
        <button
            onClick={() => {
                if (step === 'container_selection') {
                    setStep('details');
                    setEditingIndex(null);
                } else {
                    setStep('truck_list');
                    setSelectedTruckNbr(null);
                    setSelectedContainers([]);
                    setSelectedContainerType(null);
                }
            }}
            style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease',
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
            title={step === 'container_selection' ? 'Back to Details' : 'Back to List'}
        >
            <ArrowLeft size={18} />
        </button>
    ) : null;

    // Footer actions
    const renderFooter = () => {
        if (step === 'success') {
            return (
                <button onClick={handleReset} style={{
                    flex: 1, padding: '12px', background: '#4B686C', border: 'none', borderRadius: '12px',
                    color: 'white', fontWeight: 700, cursor: 'pointer'
                }}>
                    Done
                </button>
            );
        }

        if (step === 'truck_list') {
            return null;
        }

        // Details Footer: Release Button
        if (truckDetails && selectedContainers.length > 0) {
            return (
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
            );
        }

        return null;
    };

    // Render truck list view
    const renderTruckListView = () => (
        <>
            {/* Search Bar */}
            {!isLoadingTrucks && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--primary-color)', opacity: 0.6
                        }} />
                        {searchText && (
                            <button
                                onClick={() => setSearchText('')}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(75, 104, 108, 0.1)', border: 'none', borderRadius: '50%',
                                    width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', padding: 0
                                }}
                            >
                                <X size={12} style={{ color: 'var(--text-color)' }} />
                            </button>
                        )}
                        <input
                            type="text"
                            placeholder="Search trucks..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''))}
                            maxLength={15}
                            style={{
                                width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 42px',
                                border: '1px solid rgba(75, 104, 108, 0.15)', borderRadius: '10px',
                                background: 'rgba(75, 104, 108, 0.04)', fontSize: '14px', fontWeight: 500,
                                color: 'var(--text-color)', outline: 'none', transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.background = 'rgba(75, 104, 108, 0.06)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(75, 104, 108, 0.15)';
                                e.currentTarget.style.background = 'rgba(75, 104, 108, 0.04)';
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Truck List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {isLoadingTrucks ? (
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', paddingBottom: '40px', boxSizing: 'border-box'
                    }}>
                        <TruckLoader message="LOADING TRUCKS" subMessage="Fetching available trucks..." height="150px" />
                    </div>
                ) : filteredTrucks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-color)', opacity: 0.6 }}>
                        <Truck size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <div>{searchText ? 'No trucks match your search' : 'No trucks available'}</div>
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
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: 'var(--secondary-gradient)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <Truck size={20} style={{ color: 'var(--primary-color)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary-color)' }}>{truck}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.6 }}>Tap to release</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Loading Details */}
            {isLoadingDetails && (
                <div style={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', paddingBottom: '40px', boxSizing: 'border-box'
                }}>
                    <TruckLoader message="LOADING DETAILS" subMessage="Fetching truck information..." height="200px" />
                </div>
            )}

            {/* Content */}
            {truckDetails && !isLoadingDetails && (
                <>
                    {/* Truck Details Card (Premium UI like Position Container) */}
                    <div style={{
                        background: 'rgba(75, 104, 108, 0.08)',
                        border: '1px solid rgba(75, 104, 108, 0.15)',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '16px'
                    }}>
                        {/* Header with truck number prominent */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '12px',
                                    background: 'var(--secondary-gradient)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Truck size={22} style={{ color: 'var(--primary-color)' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary-color)', letterSpacing: '-0.5px' }}>
                                        {truckDetails.truckNbr}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.7 }}>
                                        Truck Details
                                    </div>
                                </div>
                            </div>
                            <span style={{
                                padding: '6px 12px',
                                background: truckDetails.orderType === 'RELEASE_CFS'
                                    ? 'rgba(34, 197, 94, 0.1)'
                                    : 'rgba(75, 104, 108, 0.1)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: truckDetails.orderType === 'RELEASE_CFS'
                                    ? '#22c55e'
                                    : 'var(--primary-color)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {truckDetails.orderType}
                            </span>
                        </div>

                        {/* Detail Rows (Position Container style) */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: '1px solid rgba(75, 104, 108, 0.1)'
                        }}>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver Name</span>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>
                                {truckDetails.driverName || 'N/A'}
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: '1px solid rgba(75, 104, 108, 0.1)'
                        }}>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver Iqama</span>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>
                                {truckDetails.driverIqamaNbr || 'N/A'}
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: '1px solid rgba(75, 104, 108, 0.1)'
                        }}>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Customer</span>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>
                                {truckDetails.customerName || 'N/A'}
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0'
                        }}>
                            <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Booking Number</span>
                            <span style={{
                                padding: '4px 10px',
                                background: 'rgba(75, 104, 108, 0.1)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: 'var(--primary-color)',
                                fontFamily: 'monospace',
                                letterSpacing: '0.5px'
                            }}>
                                {truckDetails.bookingNbr || 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* Container Selection Section */}
                    <div style={{
                        background: 'rgba(75, 104, 108, 0.08)',
                        borderRadius: '16px',
                        border: '1px solid rgba(75, 104, 108, 0.15)',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.12) 0%, rgba(75, 104, 108, 0.04) 100%)',
                            borderBottom: '1px solid rgba(75, 104, 108, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: 'var(--secondary-gradient)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <ContainerIcon size={20} style={{ color: 'var(--primary-color)' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary-color)' }}>
                                        {isReadOnly ? 'Container Details' : 'Container Selection'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.6 }}>
                                        {isReadOnly ? 'Container to be released' : 'Select type, container & shipment'}
                                    </div>
                                </div>
                            </div>
                            {selectedContainers.length > 0 && (
                                <span style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#22c55e'
                                }}>
                                    {selectedContainers.length} Selected
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ padding: '16px 20px' }}>
                            {/* Empty State */}
                            {selectedContainers.length === 0 && !isReadOnly && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '24px 16px',
                                    marginBottom: '16px',
                                    background: 'rgba(255, 255, 255, 0.5)',
                                    borderRadius: '12px',
                                    border: '1px dashed rgba(75, 104, 108, 0.2)'
                                }}>
                                    <div style={{
                                        width: '56px', height: '56px',
                                        margin: '0 auto 12px',
                                        background: 'var(--secondary-gradient)',
                                        borderRadius: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Package size={28} style={{ color: 'var(--primary-color)', opacity: 0.6 }} />
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-color)', marginBottom: '4px' }}>
                                        No containers selected
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.6 }}>
                                        Tap below to add a container for release
                                    </div>
                                </div>
                            )}

                            {/* Selected Containers */}
                            {selectedContainers.map((container, index) => (
                                <ContainerCard
                                    key={`${container.containerNbr}-${index}`}
                                    container={container}
                                    containerType={container.containerType}
                                    onEdit={() => handleEditContainer(index)}
                                    onRemove={() => handleRemoveContainer(index)}
                                    onFocus={() => handleFocusContainer(container.containerNbr)}
                                    readOnly={isReadOnly}
                                />
                            ))}

                            {/* Add Container Button */}
                            {!isReadOnly && (selectedContainers.length === 0 || canAddMoreContainers) && (
                                <button
                                    onClick={handleAddContainer}
                                    style={{
                                        width: '100%',
                                        padding: '16px 20px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #4B686C 0%, #3a5357 100%)',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 4px 12px rgba(75, 104, 108, 0.25)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(75, 104, 108, 0.35)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 104, 108, 0.25)';
                                    }}
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                    {selectedContainers.length === 0 ? 'Add Container' : 'Add Another'}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    // Computed values for container selection
    const containerTypes = useMemo(() => {
        if (!truckDetails?.containerTypes) return [];
        if (selectedContainers.length >= 2) {
            return Object.keys(truckDetails.containerTypes).filter(t => t.startsWith('2'));
        }
        if (selectedContainers.length === 1 && selectedContainerType?.startsWith('2')) {
            return Object.keys(truckDetails.containerTypes).filter(t => t.startsWith('2'));
        }
        return Object.keys(truckDetails.containerTypes);
    }, [truckDetails?.containerTypes, selectedContainers, selectedContainerType]);

    const containers = useMemo(() => {
        if (!localContainerType || !truckDetails?.containerTypes?.[localContainerType]) return [];
        const alreadySelected = selectedContainers.filter((_, i) => i !== editingIndex).map(c => c.containerNbr);
        return truckDetails.containerTypes[localContainerType].containers
            .filter(c => !alreadySelected.includes(c.containerNbr));
    }, [localContainerType, truckDetails?.containerTypes, selectedContainers, editingIndex]);

    const shipments = useMemo(() => {
        if (!localContainerType || !truckDetails?.containerTypes?.[localContainerType]) return [];
        const alreadySelected = selectedContainers.filter((_, i) => i !== editingIndex).map(c => c.shipment);
        return truckDetails.containerTypes[localContainerType].shipments
            .filter(s => !alreadySelected.includes(s));
    }, [localContainerType, truckDetails?.containerTypes, selectedContainers, editingIndex]);

    const getSelectionItems = () => {
        let items: string[] = [];
        switch (selectionStep) {
            case 0: items = containerTypes; break;
            case 1: items = containers.map(c => c.containerNbr); break;
            case 2: items = shipments; break;
        }
        if (selectionSearchQuery) {
            items = items.filter(item => item.toLowerCase().includes(selectionSearchQuery.toLowerCase()));
        }
        return items;
    };

    const handleSelectionItemClick = (item: string) => {
        setSelectionSearchQuery('');
        switch (selectionStep) {
            case 0:
                setLocalContainerType(item);
                setLocalContainer(null);
                setSelectionStep(1);
                break;
            case 1:
                setLocalContainer(item);
                const containerData = containers.find(c => c.containerNbr === item);
                setLocalPosition(containerData?.position || '');
                if (shipments.length === 1) {
                    handleContainerSelected({
                        containerNbr: item,
                        containerType: localContainerType!,
                        shipment: shipments[0],
                        position: containerData?.position || ''
                    });
                } else {
                    setSelectionStep(2);
                }
                break;
            case 2:
                handleContainerSelected({
                    containerNbr: localContainer!,
                    containerType: localContainerType!,
                    shipment: item,
                    position: localPosition
                });
                break;
        }
    };

    const selectionStepLabels = ['Container Type', 'Container', 'Shipment'];
    const selectionItems = getSelectionItems();

    // Render container selection view (inline, not modal)
    const renderContainerSelectionView = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Breadcrumb */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                background: 'rgba(75, 104, 108, 0.08)',
                borderRadius: '12px'
            }}>
                {selectionStepLabels.map((label, idx) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            onClick={() => {
                                if (idx < selectionStep) {
                                    setSelectionStep(idx);
                                    setSelectionSearchQuery('');
                                    if (idx === 0) {
                                        setLocalContainerType(null);
                                        setLocalContainer(null);
                                    } else if (idx === 1) {
                                        setLocalContainer(null);
                                    }
                                }
                            }}
                            disabled={idx > selectionStep}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: idx === selectionStep
                                    ? 'linear-gradient(135deg, #4B686C 0%, #3a5357 100%)'
                                    : idx < selectionStep ? 'rgba(75, 104, 108, 0.15)' : 'transparent',
                                color: idx === selectionStep ? 'white' : 'var(--text-color)',
                                fontSize: '12px',
                                fontWeight: idx === selectionStep ? 700 : 500,
                                cursor: idx < selectionStep ? 'pointer' : 'default',
                                opacity: idx > selectionStep ? 0.4 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            {label}
                        </button>
                        {idx < 2 && (
                            <ChevronRight size={14} style={{ color: 'var(--text-color)', opacity: 0.4 }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Current Selection Info */}
            {(localContainerType || localContainer) && (
                <div style={{
                    padding: '12px 16px',
                    background: 'rgba(34, 197, 94, 0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(34, 197, 94, 0.15)'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-color)', opacity: 0.6, marginBottom: '4px' }}>
                        Current Selection
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {localContainerType && (
                            <span style={{
                                padding: '4px 10px',
                                background: 'rgba(75, 104, 108, 0.1)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--primary-color)'
                            }}>
                                {localContainerType}
                            </span>
                        )}
                        {localContainer && (
                            <span style={{
                                padding: '4px 10px',
                                background: 'rgba(75, 104, 108, 0.1)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--primary-color)'
                            }}>
                                {localContainer}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative' }}>
                <Search size={16} style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--primary-color)', opacity: 0.6
                }} />
                {selectionSearchQuery && (
                    <button
                        onClick={() => setSelectionSearchQuery('')}
                        style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(75, 104, 108, 0.1)', border: 'none', borderRadius: '50%',
                            width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', padding: 0
                        }}
                    >
                        <X size={12} style={{ color: 'var(--text-color)' }} />
                    </button>
                )}
                <input
                    type="text"
                    placeholder={`Search ${selectionStepLabels[selectionStep].toLowerCase()}...`}
                    value={selectionSearchQuery}
                    onChange={(e) => setSelectionSearchQuery(e.target.value.toUpperCase())}
                    style={{
                        width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 42px',
                        border: '1px solid rgba(75, 104, 108, 0.15)', borderRadius: '10px',
                        background: 'rgba(75, 104, 108, 0.04)', fontSize: '14px', fontWeight: 500,
                        color: 'var(--text-color)', outline: 'none'
                    }}
                />
            </div>

            {/* Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectionItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-color)', opacity: 0.6 }}>
                        <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <div>No {selectionStepLabels[selectionStep].toLowerCase()}s available</div>
                    </div>
                ) : (
                    selectionItems.map((item) => (
                        <button
                            key={item}
                            onClick={() => handleSelectionItemClick(item)}
                            style={{
                                padding: '14px 16px',
                                background: 'rgba(75, 104, 108, 0.08)',
                                border: '1px solid rgba(75, 104, 108, 0.15)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(75, 104, 108, 0.15)';
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(75, 104, 108, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(75, 104, 108, 0.15)';
                            }}
                        >
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary-color)' }}>
                                {item}
                            </span>
                            <ChevronRight size={16} style={{ color: 'var(--primary-color)', opacity: 0.6 }} />
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    // Render success view
    const renderSuccessView = () => (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
                width: '64px', height: '64px', background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
                <CheckCircle2 size={32} color="#22c55e" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>Release Successful</h3>
            <p style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '14px', lineHeight: 1.6 }}>
                Container{selectedContainers.length > 1 ? 's have' : ' has'} been released successfully.
            </p>
        </div>
    );

    return (
        <>
            <PanelLayout
                title={
                    step === 'container_selection'
                        ? selectionStepLabels[selectionStep]
                        : step === 'details' && truckDetails
                            ? truckDetails.truckNbr
                            : `RELEASE${allTrucks.length > 0 ? ` (${allTrucks.length})` : ''}`
                }
                category="ACTION"
                isOpen={isOpen && !showSuccessDialog}
                onClose={onClose}
                width="460px"
                headerActions={headerActions}
                footerActions={renderFooter()}
            >
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); borderRadius: 4px; }
                `}</style>

                {/* Loading while fetching truck details */}
                {step === 'details' && isLoadingDetails && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        minHeight: '400px'
                    }}>
                        <TruckLoader
                            message="LOADING TRUCK DETAILS"
                            subMessage="Please wait..."
                            height="280px"
                        />
                    </div>
                )}

                {/* Main Content */}
                {step === 'truck_list' && renderTruckListView()}
                {step === 'details' && !isLoadingDetails && renderDetailsView()}
                {step === 'container_selection' && renderContainerSelectionView()}
                {step === 'success' && renderSuccessView()}

                {/* Inline Success Toast - Top of Panel */}
                {showSuccessDialog && successData && (
                    <div style={{
                        position: 'fixed',
                        top: '100px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'calc(100% - 40px)',
                        maxWidth: '460px',
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 8px 24px rgba(34, 197, 94, 0.35)',
                        zIndex: 1000,
                        animation: 'slideDown 0.3s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <CheckCircle2 size={20} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
                                    Container{successData.containers.length > 1 ? 's' : ''} Released Successfully
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
                                    {successData.truckNbr} • {successData.bookingNbr}
                                </div>
                            </div>
                            <button
                                onClick={handleSuccessClose}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'white'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Container List */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            borderRadius: '10px',
                            padding: '10px'
                        }}>
                            {successData.containers.map((container, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 0',
                                        borderBottom: index < successData.containers.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                                    }}
                                >
                                    <Package size={14} color="white" />
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'white', flex: 1 }}>
                                        {container.containerNbr}
                                    </span>
                                    <span style={{
                                        fontSize: '10px',
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        padding: '2px 6px',
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        borderRadius: '4px'
                                    }}>
                                        {container.containerType}
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                        {container.shipment}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Done Button */}
                        <button
                            onClick={handleSuccessClose}
                            style={{
                                width: '100%',
                                marginTop: '12px',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                background: 'rgba(255, 255, 255, 0.15)',
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Done
                        </button>
                    </div>
                )}
            </PanelLayout>


            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes slideUp {
                    from { 
                        transform: translate(-50%, 100%);
                        opacity: 0;
                    }
                    to { 
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
                @keyframes slideDown {
                    from { 
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                    to { 
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
            `}</style>
        </>
    );
}

// --- Subcomponents ---

function ContainerCard({ container, containerType, onEdit, onRemove, onFocus, readOnly }: {
    container: SelectedContainer;
    containerType: string;
    onEdit: () => void;
    onRemove: () => void;
    onFocus?: () => void;
    readOnly?: boolean;
}) {
    return (
        <div
            onClick={onFocus}
            style={{
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '16px',
                border: '1px solid rgba(75, 104, 108, 0.15)',
                marginBottom: '12px',
                cursor: onFocus ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                overflow: 'hidden'
            }}>
            {/* Header with Container Number */}
            <div style={{
                background: 'linear-gradient(135deg, #4B686C 0%, #3a5357 100%)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Package size={18} color="white" />
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                            Container
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', letterSpacing: '0.5px' }}>
                            {container.containerNbr}
                        </div>
                    </div>
                </div>
                {/* Container Type Badge */}
                <div style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'white'
                }}>
                    {containerType}
                </div>
            </div>

            {/* Details Section */}
            <div style={{ padding: '12px 16px' }}>
                {/* Shipment Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: container.position ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            background: 'rgba(75, 104, 108, 0.1)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Truck size={14} color="#4B686C" />
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Shipment</span>
                    </div>
                    <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1e293b',
                        maxWidth: '55%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'right'
                    }}>
                        {container.shipment}
                    </span>
                </div>

                {/* Position Row */}
                {container.position && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MapPin size={14} color="#16a34a" />
                            </div>
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>Position</span>
                        </div>
                        <span style={{
                            padding: '4px 10px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#16a34a',
                            fontFamily: 'monospace',
                            letterSpacing: '0.3px'
                        }}>
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
                            padding: '14px',
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
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(75, 104, 108, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <Edit2 size={15} />
                        Edit
                    </button>
                    <button
                        onClick={onRemove}
                        style={{
                            flex: 1,
                            padding: '14px',
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
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <Trash2 size={15} />
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
        console.log('[Modal] truckDetails.containerTypes:', truckDetails.containerTypes);
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
        const types = Object.keys(truckDetails.containerTypes);
        console.log('[Modal] Available container types:', types);
        return types;
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
