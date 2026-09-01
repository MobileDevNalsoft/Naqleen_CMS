
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, CheckCircle, Truck, ArrowRight, X, Loader2, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../../../components/ui/feedback/common/Toast';
import { yardApi } from '../apis/yardApi';
import PanelLayout from '../../shared/components/PanelLayout';
import type {
    PositionTruckDetails
} from '../types/yardTypes';

import { useMemo } from 'react';
import TruckLoader from '../../../components/ui/feedback/trucks/TruckLoader';

import PremiumStateView from '../../../components/ui/feedback/PremiumStateView';
import { useStore } from '../../../store/store';

interface CfsContainerData {
    containerNbr: string;
    containerType: string;
    shipmentNbr: string;
    customerName?: string;
}

interface PositionContainerPanelProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'truck_flow' | 'cfs_container';
    cfsContainer?: CfsContainerData;
    categoryLabel?: string; // Optional override for the panel category header
}

export default function PositionContainerPanel({ isOpen, onClose, mode = 'truck_flow', cfsContainer, categoryLabel }: PositionContainerPanelProps) {
    const isCfsMode = mode === 'cfs_container';
    const [step, setStep] = useState<'truck_list' | 'details' | 'success'>(isCfsMode ? 'details' : 'truck_list');

    // Search state
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Selected Truck State
    const [selectedTruck, setSelectedTruck] = useState<PositionTruckDetails | null>(null);

    // Batch Position State
    const [activeContainerIndex, setActiveContainerIndex] = useState(0);
    const [draftPositions, setDraftPositions] = useState<Record<number, string>>({});
    const [selectionOrder, setSelectionOrder] = useState<number[]>([]);

    // Debounce search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchText);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchText]);

    // Query client for cache updates
    const queryClient = useQueryClient();

    // --- API Queries ---

    // 1. Fetch Trucks (Server-side search)
    const { data: allTrucksResponse, isLoading: isLoadingTrucks, isError: isTrucksError, refetch: refetchTrucks } = useQuery({
        queryKey: ['positionTrucks', debouncedSearch], // Dynamic key triggers refetch on search
        queryFn: () => yardApi.getPositionTrucks({ searchText: debouncedSearch }),
        enabled: isOpen && step === 'truck_list',
    });

    const allTrucks = useMemo(() => allTrucksResponse?.data || [], [allTrucksResponse]);

    // 2. Fetch Truck Details (When a truck is selected)
    const { mutate: fetchTruckDetails, isPending: isLoadingDetails } = useMutation({
        mutationFn: yardApi.getPositionTruckDetails,
        onSuccess: (res) => {
            if (res.responseCode === 200 && res.data) {
                setSelectedTruck(res.data);
                // showToast('success', 'Truck details loaded'); // Optional: Too noisy for this flow
                setStep('details');
            } else {
                showToast('error', res.responseMessage || 'Truck not found');
                setSelectedTruck(null);
            }
        },
        onError: () => showToast('error', 'Failed to fetch truck details')
    });

    // 3. Submit Position
    const setEntitiesBatch = useStore((state) => state.setEntitiesBatch);
    const removeCfsContainer = useStore((state) => state.removeCfsContainer);
    const setGhostContainer = useStore((state) => state.setGhostContainer);

    const { mutate: submitPositionBatch, isPending: isSubmitting } = useMutation({
        mutationFn: yardApi.submitContainerPositionBatch,
        onSuccess: (res: any) => {
            if (res.response_code === 200) {
                showToast('success', 'Containers Positioned Successfully');

                const shipments = selectedTruck?.shipments || [];

                Object.entries(draftPositions).forEach(([idxStr, pos]) => {
                    const idx = parseInt(idxStr, 10);
                    const containerId = isCfsMode ? cfsContainer?.containerNbr : shipments[idx]?.containerNbr;
                    const containerType = isCfsMode ? cfsContainer?.containerType || '20' : shipments[idx]?.containerType || '20';

                    if (containerId && pos) {
                        const lastDashIndex = pos.lastIndexOf('-');
                        const markingKey = pos.substring(0, lastDashIndex).toUpperCase();
                        const level = parseInt(pos.substring(lastDashIndex + 1), 10) || 1;
                        const markingPositions = useStore.getState().markingPositions;
                        const markingPos = markingPositions[markingKey];

                        if (markingPos) {
                            const is20ft = !containerType || containerType.startsWith('2');
                            const containerHeight = is20ft ? 2.591 : 2.896;
                            const levelGap = 0.02;
                            const y = markingPos.y + containerHeight / 2 + (level - 1) * (containerHeight + levelGap);

                            const keyParts = markingKey.split('-');
                            const terminal = keyParts[0] || '';
                            const block = keyParts[1] || '';
                            const lot = parseInt(keyParts[2], 10) || 1;
                            const rowLabel = keyParts[3] || 'A';
                            const blockId = `${terminal.toLowerCase()}_block_${block.toLowerCase()}`;

                            const newContainer = {
                                id: containerId, x: markingPos.x, y, z: markingPos.z,
                                terminal, block, blockId, lot, row: rowLabel, level,
                                type: containerType, status: 'active'
                            };
                            setEntitiesBatch([newContainer]);
                        }
                    }
                });

                setGhostContainer(null);

                if (isCfsMode && cfsContainer && cfsContainer.containerNbr) {
                    removeCfsContainer(cfsContainer.containerNbr);
                    
                    // Invalidate invalid containers list and specific container details
                    queryClient.invalidateQueries({ queryKey: ['invalidContainers'] });
                    queryClient.invalidateQueries({ queryKey: ['container-details', cfsContainer.containerNbr] });
                } else {
                    queryClient.setQueryData(['positionTrucks', debouncedSearch], (oldData: any) => {
                        if (!oldData?.data) return oldData;
                        return {
                            ...oldData,
                            data: oldData.data.filter((t: string) => t !== selectedTruck?.truckNbr)
                        };
                    });
                }

                setStep('success');
            } else {
                showToast('error', res.response_message || 'Failed to position containers');
            }
        },
        onError: (err: any) => showToast('error', err.message || 'Submission failed')
    });

    // Client-side filtering
    const filteredTrucks = useMemo(() => {
        if (!searchText.trim()) return allTrucks;
        const search = searchText.toUpperCase();
        return allTrucks.filter(truck => truck.toUpperCase().includes(search));
    }, [allTrucks, searchText]);

    // Get setFocusPosition for cleanup (setGhostContainer already defined above)
    const setFocusPosition = useStore((state) => state.setFocusPosition);

    // Reset when panel closes
    useEffect(() => {
        if (!isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSearchText('');
            setSelectedTruck(null);
            setDraftPositions({});
            setSelectionOrder([]);
            setActiveContainerIndex(0);
            setStep(isCfsMode ? 'details' : 'truck_list');
            setFocusPosition(null); // Reset camera to main view
            setGhostContainer(null); // Clear ghost container
        } else {
            // Invalidate cache when opening to ensure fresh list on next access
            if (!isCfsMode) {
                queryClient.invalidateQueries({ queryKey: ['positionTrucks', 'all'] });
            }
        }
    }, [isOpen, isCfsMode]);

    const handleSelectTruck = (truck: string) => {
        fetchTruckDetails({ truckNbr: truck });
    };

    const handlePositionDraft = (newPos: string) => {
        setDraftPositions(prev => {
            const currentDraft = prev[activeContainerIndex] || '';
            if (currentDraft === newPos) return prev;

            const newDrafts = { ...prev };
            let newOrder = [...selectionOrder];
            const currentIndexInOrder = newOrder.indexOf(activeContainerIndex);

            if (newPos) {
                if (currentIndexInOrder === -1) {
                    newOrder.push(activeContainerIndex);
                } else {
                    // Check if the change actually invalidates the selection
                    // If the new position starts with the old position OR the old position starts with the new one,
                    // it's a progressive refinement or a back-trace, not necessarily a "change" of the root selection.
                    // However, to be safe and match the requirement "Only changing Container A triggers reset",
                    // we should only reset if the USER explicitly changed a dropdown to a DIFFERENT value,
                    // not just selecting the next dropdown in the cascade.
                    
                    // We check if newPos is NOT just an extension of currentDraft
                    // For example: "TRM-A" -> "TRM-A-1" should NOT reset dependents.
                    // But "TRM-A" -> "TRM-B" SHOULD reset dependents.
                    const isExtension = newPos.startsWith(currentDraft) && currentDraft !== '';
                    const isReduction = currentDraft.startsWith(newPos) && newPos !== '';
                    
                    if (!isExtension && !isReduction && currentDraft !== newPos) {
                        const dependentIndices = newOrder.slice(currentIndexInOrder + 1);
                        if (dependentIndices.length > 0) {
                            dependentIndices.forEach(idx => delete newDrafts[idx]);
                            newOrder = newOrder.slice(0, currentIndexInOrder + 1);
                        }
                    }
                }
                newDrafts[activeContainerIndex] = newPos;
            } else {
                if (currentIndexInOrder !== -1) {
                    const indicesToWipe = newOrder.slice(currentIndexInOrder);
                    indicesToWipe.forEach(idx => delete newDrafts[idx]);
                    newOrder = newOrder.slice(0, currentIndexInOrder);
                } else {
                    delete newDrafts[activeContainerIndex];
                }
            }

            setSelectionOrder(newOrder);
            return newDrafts;
        });
    };

    const handleSubmitAll = () => {
        if (isCfsMode && cfsContainer) {
            const pos = draftPositions[0];
            if (!pos) return;
            // No truck_nbr. A CFS container is already in the yard and arrived
            // on no truck, and the backend guards both of its truck steps with
            // IF l_truck_nbr IS NOT NULL, so omitting it is the supported path.
            //
            // This previously sent the literal 'STORE_AS_IT_IS' as a "fallback",
            // which is a SHIPMENT NAME, not a truck number. Being non-null it
            // satisfied that guard, so the backend then looked for a vehicle
            // master row with truck_nbr = 'STORE_AS_IT_IS' in a GATE IN state,
            // found none, and refused every CFS positioning with
            // "Truck STORE_AS_IT_IS is not in a valid Gate In state".
            submitPositionBatch([{
                shipment_nbr: cfsContainer.shipmentNbr,
                container_nbr: cfsContainer.containerNbr,
                position: pos
            }]);
        } else {
            if (!selectedTruck) return;
            const shipments = selectedTruck.shipments || [];

            const allComplete = shipments.length > 0 && Object.keys(draftPositions).length === shipments.length && Object.values(draftPositions).every(pos => typeof pos === 'string' && pos.split('-').length === 5);
            if (!allComplete) return;

            const payload = shipments.map((shipment, idx) => ({
                shipment_nbr: shipment.shipmentNbr,
                container_nbr: shipment.containerNbr,
                position: draftPositions[idx]!,
                truck_nbr: selectedTruck.truckNbr
            }));

            submitPositionBatch(payload);
        }
    };

    // Styles (Copied from GateInPanel for consistency)
    const cardStyle: React.CSSProperties = {
        background: 'rgba(75, 104, 108, 0.08)',
        border: '1px solid rgba(75, 104, 108, 0.15)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
    };

    const detailRowStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid rgba(75, 104, 108, 0.1)'
    };

    const handleDone = () => {
        setSelectedTruck(null);
        setDraftPositions({});
        setSelectionOrder([]);
        setFocusPosition(null); // Reset camera

        if (isCfsMode) {
            // CFS mode: close panel to return to CFS Details
            onClose();
        } else {
            // Truck flow: return to truck list
            setStep('truck_list');
        }
    };

    const renderFooter = () => {
        if (step === 'success') {
            return (
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button onClick={handleDone} style={{
                        flex: 1, padding: '12px', background: '#4B686C', border: 'none', borderRadius: '12px',
                        color: 'white', fontWeight: 700, cursor: 'pointer'
                    }}>
                        Done
                    </button>
                </div>
            );
        }

        if (step === 'truck_list') {
            return null; // No footer actions on list view
        }

        // Details Footer: Confirm Button
        // Validate every container is assigned a position
        const shipmentsCount = isCfsMode ? 1 : (selectedTruck?.shipments?.length || 0);
        const hasRequiredData = isCfsMode ? !!cfsContainer : !!selectedTruck;
        const allPositionsSelected = shipmentsCount > 0 && 
            Object.keys(draftPositions).length === shipmentsCount && 
            Object.values(draftPositions).every(pos => typeof pos === 'string' && pos.split('-').length === 5);
        const isEnabled = hasRequiredData && allPositionsSelected && !isSubmitting;

        return (
            <button
                onClick={handleSubmitAll}
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
                        Submit All Positions <ArrowRight size={16} />
                    </>
                )}
            </button>
        );
    };

    // Card Styles (Reused from GateInPanel for consistency)
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

    // Render list view
    const renderTruckListView = () => (
        <>
            {/* Search Bar - Always Visible */}
            <div style={{ marginBottom: '8px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{
                        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--primary-color)', opacity: 0.6
                    }} />
                    {(searchText || isLoadingTrucks) && (
                        <div style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            {isLoadingTrucks ? (
                                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                            ) : (
                                <button
                                    onClick={() => setSearchText('')}
                                    style={{
                                        background: 'rgba(75, 104, 108, 0.1)', border: 'none', borderRadius: '50%',
                                        width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', padding: 0
                                    }}
                                >
                                    <X size={12} style={{ color: 'var(--text-color)' }} />
                                </button>
                            )}
                        </div>
                    )}
                    <input
                        type="text"
                        placeholder={searchText.length > 0 ? `${searchText}` : "Search trucks..."}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        maxLength={10}
                        style={{
                            width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 42px',
                            border: '1px solid rgba(75, 104, 108, 0.15)', borderRadius: '10px',
                            background: 'rgba(75, 104, 108, 0.04)', fontSize: '14px', fontWeight: 500,
                            color: 'var(--text-color)', outline: 'none', transition: 'all 0.2s',
                            borderColor: isLoadingTrucks ? 'var(--primary-color)' : 'rgba(75, 104, 108, 0.15)'
                        }}
                    />
                </div>
            </div>

            {/* Truck List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {isLoadingTrucks ? (
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', paddingBottom: '40px', boxSizing: 'border-box'
                    }}>
                        <TruckLoader message="LOADING TRUCKS" subMessage="Checking for waiting trucks..." height="150px" />
                    </div>
                ) : isTrucksError ? (
                    <PremiumStateView
                        type="error"
                        title="Unable to Load Trucks"
                        description="There was a problem connecting to the system. Please try again."
                        height={300}
                        action={{
                            label: "Retry",
                            onClick: () => refetchTrucks()
                        }}
                    />
                ) : filteredTrucks.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <PremiumStateView
                            type="empty"
                            title={searchText ? 'No Truck Found' : 'No Trucks Available'}
                            description={searchText ? `We couldn't find any truck matching "${searchText}"` : "There are currently no trucks available for positioning."}
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
                                <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.6 }}>Tap to position</div>
                            </div>
                            <ChevronDown size={18} style={{ color: 'var(--text-color)', opacity: 0.4, transform: 'rotate(-90deg)' }} />
                        </div>
                    ))
                )}
            </div>
        </>
    );

    // Render tabs for multi-container trucks
    const renderTabs = () => {
        const shipments = selectedTruck?.shipments || [];
        if (shipments.length <= 1) return null;

        return (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {shipments.map((shipment, index) => {
                    const isCompleted = draftPositions[index] !== undefined && draftPositions[index].split('-').length === 5;
                    const isActive = activeContainerIndex === index;

                    return (
                        <button
                            key={index}
                            onClick={() => !isSubmitting && setActiveContainerIndex(index)}
                            style={{
                                flex: 1,
                                padding: '12px 10px',
                                borderRadius: '10px',
                                background: isActive ? 'var(--primary-color)' : 'rgba(75, 104, 108, 0.08)',
                                color: isActive ? '#fff' : 'var(--primary-color)',
                                border: `1px solid ${isActive ? 'var(--primary-color)' : 'rgba(75, 104, 108, 0.15)'}`,
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                position: 'relative',
                                overflow: 'hidden',
                                opacity: (isSubmitting && !isActive) ? 0.6 : 1
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '2px' }}>
                                <span style={{ textTransform: 'uppercase', lineHeight: 1 }}>
                                    {shipment.containerNbr || `Container ${index + 1}`}
                                </span>
                                {draftPositions[index] && (
                                    <span style={{ 
                                        fontSize: '10px', 
                                        opacity: isActive ? 0.9 : 0.6, 
                                        fontWeight: 500, 
                                        fontFamily: 'monospace',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {draftPositions[index]}
                                    </span>
                                )}
                            </div>
                            {isCompleted && <CheckCircle size={14} color={isActive ? '#fff' : '#22c55e'} style={{ zIndex: 1 }} />}

                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: '10%',
                                    right: '10%',
                                    height: '3px',
                                    background: 'var(--secondary-gradient)',
                                    borderRadius: '3px 3px 0 0'
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    // Render details view
    const renderDetailsView = () => {
        const shipments = selectedTruck?.shipments || [];
        const currentShipment = shipments[activeContainerIndex];

        // Determine container type for position selectors
        const effectiveContainerType = isCfsMode
            ? cfsContainer?.containerType || '20GP'
            : currentShipment?.containerType || '20GP';

        const effectiveContainerNbr = isCfsMode
            ? cfsContainer?.containerNbr
            : currentShipment?.containerNbr;

        return (
            <>
                {/* Loading Details or Submitting (Not applicable for CFS mode) */}
                {!isCfsMode && (isLoadingDetails || isSubmitting) && (
                    <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PremiumStateView
                            type="loading"
                            graphic={<TruckLoader message={isSubmitting ? "CONFIRMING POSITION" : "RETRIEVING DETAILS"} subMessage={isSubmitting ? "Updating container location..." : "Fetching truck information..."} />}
                        />
                    </div>
                )}

                {/* Multi-container Tabs */}
                {!isCfsMode && renderTabs()}

                {/* CFS Mode - Simplified Direct Position Selection */}
                {isCfsMode && cfsContainer && !isSubmitting && (
                    <>
                        {/* Composed Position Display */}
                        <div style={{
                            marginBottom: '16px',
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.6)',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                            textAlign: 'center',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                color: 'var(--text-color)',
                                opacity: 0.6,
                                fontWeight: 600,
                                letterSpacing: '1.5px',
                                marginBottom: '6px'
                            }}>
                                Target Position
                            </div>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 800,
                                color: draftPositions[activeContainerIndex] ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
                                fontFamily: 'monospace',
                                letterSpacing: '2px',
                                minHeight: '32px'
                            }}>
                                {draftPositions[activeContainerIndex] || 'Select Position'}
                            </div>
                        </div>

                        <PositionSelectors
                            key={activeContainerIndex}
                            containerType={effectiveContainerType}
                            onPositionChange={handlePositionDraft}
                            busyPositions={Object.entries(draftPositions)
                                .filter(([idx, pos]) => idx !== activeContainerIndex.toString() && typeof pos === 'string' && pos.split('-').length === 5)
                                .map(([, pos]) => pos as string)
                                .join(',')}
                            initialPosition={draftPositions[activeContainerIndex]}
                        />
                    </>
                )}

                {/* Truck Flow Mode - Full Details Card */}
                {!isCfsMode && selectedTruck && !isLoadingDetails && !isSubmitting && (
                    <>
                        {/* Truck Details Card (Premium UI) */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '10px',
                                        background: 'var(--secondary-gradient)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Truck size={20} style={{ color: 'var(--primary-color)' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-color)' }}>{selectedTruck.truckNbr}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.7 }}>Truck Details</div>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '4px 10px', background: 'rgba(75, 104, 108, 0.1)',
                                    borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                    color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.3px'
                                }}>
                                    3PL
                                </span>
                            </div>

                            <div style={detailRowStyle}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver Name</span>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{selectedTruck.driverName || 'N/A'}</span>
                            </div>
                            <div style={detailRowStyle}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Driver Iqama</span>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{selectedTruck.driverIqama || 'N/A'}</span>
                            </div>

                            {/* Additional details */}
                            <div style={detailRowStyle}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Shipment Type</span>
                                <span style={{
                                    padding: '2px 8px', background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#22c55e'
                                }}>
                                    {currentShipment?.shipmentName || 'N/A'}
                                </span>
                            </div>
                            <div style={detailRowStyle}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Shipment No</span>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{currentShipment?.shipmentNbr || 'N/A'}</span>
                            </div>
                            <div style={detailRowStyle}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Container</span>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{effectiveContainerNbr || 'N/A'}</span>
                            </div>
                            <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Container Type</span>
                                <span style={{
                                    padding: '2px 8px', background: 'rgba(75, 104, 108, 0.1)',
                                    borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--primary-color)'
                                }}>
                                    {effectiveContainerType || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Composed Position Display */}
                        <div style={{
                            marginBottom: '16px',
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.6)',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                            textAlign: 'center',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                color: 'var(--text-color)',
                                opacity: 0.6,
                                fontWeight: 600,
                                letterSpacing: '1.5px',
                                marginBottom: '6px'
                            }}>
                                Target Position
                            </div>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 800,
                                color: draftPositions[activeContainerIndex] ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
                                fontFamily: 'monospace',
                                letterSpacing: '2px',
                                minHeight: '32px'
                            }}>
                                {draftPositions[activeContainerIndex] || 'Select Position'}
                            </div>
                        </div>

                        <PositionSelectors
                            key={activeContainerIndex}
                            containerType={effectiveContainerType}
                            onPositionChange={handlePositionDraft}
                            busyPositions={Object.entries(draftPositions)
                                .filter(([idx, pos]) => idx !== activeContainerIndex.toString() && typeof pos === 'string' && pos.split('-').length === 5)
                                .map(([, pos]) => pos as string)
                                .join(',')}
                            initialPosition={draftPositions[activeContainerIndex]}
                        />
                    </>
                )}

                {/* CFS Mode Submitting State */}
                {isCfsMode && isSubmitting && (
                    <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PremiumStateView
                            type="loading"
                            graphic={<TruckLoader message="POSITIONING CONTAINER" subMessage="Please wait..." height="150px" />}
                        />
                    </div>
                )}
            </>
        );
    };

    // Hide back button in CFS mode
    const headerActions = (step === 'details' && !isCfsMode) ? (
        <button
            onClick={() => {
                setStep('truck_list');
                setSelectedTruck(null);
                setDraftPositions({});
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
            title="Back to List"
        >
            <ArrowLeft size={18} />
        </button>
    ) : null;

    // Determine panel title
    const panelTitle = 'Container Position';

    return (
        <PanelLayout
            title={panelTitle}
            category={categoryLabel || (isCfsMode ? 'CFS POSITIONING' : 'POSITIONING')}
            isOpen={isOpen}
            onClose={onClose}
            headerActions={headerActions}
            footerActions={renderFooter()}
        >
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); borderRadius: 4px; }
            `}</style>

            {/* Loading while fetching truck details */}
            {/* Loading while fetching truck details */}
            {isLoadingDetails && (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PremiumStateView
                        type="loading"
                        title="LOADING TRUCK DETAILS"
                        description="Please wait..."
                    />
                </div>
            )}

            {/* Main Content Area */}
            {step === 'truck_list' && !isLoadingDetails && renderTruckListView()}
            {step === 'details' && !isSubmitting && renderDetailsView()}

            {/* Loading during submission */}
            {step === 'details' && isSubmitting && (
                <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PremiumStateView
                        type="loading"
                        title="POSITIONING CONTAINER"
                        description="Please wait..."
                    />
                </div>
            )}

            {/* Success Message */}
            {step === 'success' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{
                        width: '64px', height: '64px', background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                    }}>
                        <CheckCircle size={32} color="#22c55e" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>Positioning Successful</h3>

                    {Object.keys(draftPositions).length > 1 ? (
                        <div style={{ margin: '20px 0', textAlign: 'left', background: 'rgba(75, 104, 108, 0.05)', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-color)', opacity: 0.5, marginBottom: '12px', textTransform: 'uppercase' }}>Positioned Containers</div>
                            {Object.entries(draftPositions).map(([idx, pos]) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: parseInt(idx) === Object.keys(draftPositions).length - 1 ? 'none' : '1px solid rgba(75, 104, 108, 0.1)' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{isCfsMode ? cfsContainer?.containerNbr : selectedTruck?.shipments?.[parseInt(idx)]?.containerNbr}</span>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--primary-color)' }}>{pos}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '14px', lineHeight: 1.6 }}>
                            Container <strong style={{ color: 'var(--primary-color)' }}>{isCfsMode ? cfsContainer?.containerNbr : selectedTruck?.shipments?.[0]?.containerNbr}</strong> has been positioned at <strong style={{ color: 'var(--primary-color)' }}>{draftPositions[0]}</strong>
                        </p>
                    )}
                </div>
            )}
        </PanelLayout>
    );
}

// Helper Component for Cascading Dropdowns
function PositionSelectors({ containerType, onPositionChange, busyPositions, initialPosition }: { containerType: string, onPositionChange: (pos: string) => void, busyPositions?: string, initialPosition?: string }) {
    const [terminal, setTerminal] = useState(() => initialPosition ? initialPosition.split('-')[0] || '' : '');
    const [block, setBlock] = useState(() => initialPosition ? initialPosition.split('-')[1] || '' : '');
    const [lot, setLot] = useState(() => initialPosition ? initialPosition.split('-')[2] || '' : '');
    const [row, setRow] = useState(() => initialPosition ? initialPosition.split('-')[3] || '' : '');
    const [level, setLevel] = useState(() => initialPosition ? initialPosition.split('-')[4] || '' : '');

    // Track which dropdown is open
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Store for camera focus and ghost container
    const setFocusPosition = useStore((state) => state.setFocusPosition);
    const setGhostContainer = useStore((state) => state.setGhostContainer);

    // Track if position was complete (for reset logic)
    const wasCompleteRef = useRef(false);

    // Query Available Options with loading states
    const { data: termData, isLoading: isLoadingTerminals } = useQuery({
        queryKey: ['posInit', containerType, busyPositions],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'I', containerType, busyPositions }),
        select: res => res.data
    });

    const { data: blockData, isLoading: isLoadingBlocks } = useQuery({
        queryKey: ['posBlock', terminal, busyPositions],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'T', containerType, terminal, busyPositions }),
        enabled: !!terminal,
        select: res => res.data
    });

    const { data: lotData, isLoading: isLoadingLots } = useQuery({
        queryKey: ['posLot', block, busyPositions],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'B', containerType, terminal, block, busyPositions }),
        enabled: !!block,
        select: res => res.data
    });

    const { data: rowData, isLoading: isLoadingRows } = useQuery({
        queryKey: ['posRow', lot, busyPositions],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'L', containerType, terminal, block, lot, busyPositions }),
        enabled: !!lot,
        select: res => res.data
    });

    const { data: levelData, isLoading: isLoadingLevel } = useQuery({
        queryKey: ['posLevel', row, busyPositions],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'R', containerType, terminal, block, lot, row, busyPositions }),
        enabled: !!row,
        select: res => res.data
    });

    const buildPositionString = () => {
        const parts: string[] = [];
        if (terminal) parts.push(terminal);
        if (block) parts.push(block);
        if (lot) parts.push(lot);
        if (row) parts.push(row);
        if (level) parts.push(level);
        return parts.join('-');
    };

    // Track last emitted position to avoid redundant parent updates
    const lastEmittedRef = useRef(initialPosition || '');

    // Check if position is complete
    const isComplete = !!(terminal && block && lot && row && level);

    // Auto-update parent with progressive position
    useEffect(() => {
        const pos = buildPositionString();
        // If it matches initialPosition during first mount, skip update to avoid reset logic side effects
        if (pos === lastEmittedRef.current) return;
        
        lastEmittedRef.current = pos;
        onPositionChange(pos);
    }, [terminal, block, lot, row, level]);

    // Handle camera focus when position is complete
    useEffect(() => {
        if (isComplete) {
            // Position is complete - build full position string then extract marking key
            const positionString = buildPositionString(); // "TRS-A-1-D-1"

            // Extract marking key and level: "TRS-A-1-D-1" -> "TRS-A-1-D" + 1
            const lastDashIndex = positionString.lastIndexOf('-');
            const markingKey = positionString.substring(0, lastDashIndex).toUpperCase();
            const levelNum = parseInt(positionString.substring(lastDashIndex + 1), 10) || 1;

            // Get marking position from store for O(1) lookup
            const markingPositions = useStore.getState().markingPositions;
            const markingPos = markingPositions[markingKey];

            if (markingPos) {
                // Calculate Y position based on level and container type
                const is20ft = !containerType || containerType.startsWith('2');
                const containerHeight = is20ft ? 2.591 : 2.896;
                const levelGap = 0.02;
                const y = markingPos.y + containerHeight / 2 + (levelNum - 1) * (containerHeight + levelGap);

                // Derive blockId from markingKey: "TRS-A-1-D" -> terminal=TRS, block=A
                const keyParts = markingKey.split('-');
                const terminalPart = keyParts[0] || '';
                const blockPart = keyParts[1] || '';
                const blockId = `${terminalPart.toLowerCase()}_block_${blockPart.toLowerCase()}`;

                setFocusPosition({
                    positionString,
                    x: markingPos.x,
                    y,
                    z: markingPos.z
                });

                setGhostContainer({
                    x: markingPos.x,
                    y,
                    z: markingPos.z,
                    containerType: containerType,
                    blockId
                });
            } else {
                console.warn('Marking position not found for:', markingKey);
            }
            wasCompleteRef.current = true;
        } else if (wasCompleteRef.current) {
            // Position was complete but now incomplete - clear focus and ghost
            setFocusPosition(null);
            setGhostContainer(null);
            wasCompleteRef.current = false;
        }
    }, [isComplete, terminal, block, lot, row, level, setFocusPosition, setGhostContainer, containerType]);

    // Auto-select level if single value available
    // Also trigger when row changes (in case levelData is already cached)
    useEffect(() => {
        if (levelData?.level && row) {
            setLevel(levelData.level.toString());
        }
    }, [levelData, row]);

    return (
        <div>
            {/* Shimmer keyframes */}
            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                Select Position
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Dropdown
                        label="Terminal"
                        value={terminal}
                        options={termData?.terminals || []}
                        onChange={(v: string) => { setTerminal(v); setBlock(''); setLot(''); setRow(''); setLevel(''); }}
                        isLoading={isLoadingTerminals}
                        isOpen={openDropdown === 'terminal'}
                        onToggle={(open) => setOpenDropdown(open ? 'terminal' : null)}
                        flex={1}
                    />
                    <Dropdown
                        label="Block"
                        value={block}
                        options={blockData?.blocks || []}
                        onChange={(v: string) => { setBlock(v); setLot(''); setRow(''); setLevel(''); }}
                        disabled={!terminal}
                        isLoading={isLoadingBlocks && !!terminal}
                        isOpen={openDropdown === 'block'}
                        onToggle={(open) => setOpenDropdown(open ? 'block' : null)}
                        flex={1}
                    />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Dropdown
                        label="Lot"
                        value={lot}
                        options={lotData?.lots || []}
                        onChange={(v: string) => { setLot(v); setRow(''); setLevel(''); }}
                        disabled={!block}
                        isLoading={isLoadingLots && !!block}
                        isOpen={openDropdown === 'lot'}
                        onToggle={(open) => setOpenDropdown(open ? 'lot' : null)}
                        flex={1}
                    />
                    <Dropdown
                        label="Row"
                        value={row}
                        options={rowData?.rows || []}
                        onChange={(v: string) => { setRow(v); setLevel(''); }}
                        disabled={!lot}
                        isLoading={isLoadingRows && !!lot}
                        isOpen={openDropdown === 'row'}
                        onToggle={(open) => setOpenDropdown(open ? 'row' : null)}
                        flex={1}
                    />
                    <Dropdown
                        label="Level"
                        value={level}
                        options={[]}
                        onChange={() => { }}
                        disabled={!row}
                        readOnly={true}
                        isLoading={isLoadingLevel && !!row}
                        flex={1}
                        hideChevron={true}
                    />
                </div>
            </div>
        </div>
    );
}

interface DropdownProps {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
    disabled?: boolean;
    readOnly?: boolean;
    isLoading?: boolean;
    isOpen?: boolean;
    onToggle?: (open: boolean) => void;
    flex?: number;
    hideChevron?: boolean;
}

function Dropdown({ label, value, options, onChange, disabled, readOnly, isLoading, isOpen, onToggle, flex, hideChevron }: DropdownProps) {
    const dropdownListRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to reveal dropdown when opened
    useEffect(() => {
        if (isOpen && dropdownListRef.current) {
            // Use setTimeout to ensure scroll happens after render
            setTimeout(() => {
                if (dropdownListRef.current) {
                    dropdownListRef.current.scrollTop = 0;
                    // Scroll the dropdown list into view to ensure it's visible in the panel
                    dropdownListRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }
    }, [isOpen, options.length]);

    return (
        <div style={{ flex: flex || 'none', position: 'relative' }}>
            <div
                onClick={() => !disabled && !readOnly && !isLoading && onToggle?.(!isOpen)}
                style={{
                    padding: '10px 12px',
                    background: disabled ? '#f1f5f9' : 'white',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    cursor: disabled || isLoading ? 'not-allowed' : (readOnly ? 'default' : 'pointer'),
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {isLoading ? (
                    <>
                        {/* Shimmer Effect Overlay */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(75, 104, 108, 0.12), transparent)',
                            transform: 'translateX(-100%)',
                            animation: 'shimmer 1.5s infinite'
                        }} />
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>Loading...</span>
                    </>
                ) : (
                    <span style={{ fontSize: '13px', color: value ? '#0f172a' : '#94a3b8', fontWeight: value ? 600 : 400 }}>
                        {value || label}
                    </span>
                )}
                {!hideChevron && (
                    <ChevronDown
                        size={14}
                        color="#94a3b8"
                        style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                        }}
                    />
                )}
            </div>
            {isOpen && !isLoading && (
                <div
                    ref={dropdownListRef}
                    style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                        background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 200, maxHeight: '200px', overflowY: 'auto'
                    }}
                >
                    {options.length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                            No options available
                        </div>
                    ) : (
                        options.map((opt: string) => (
                            <div key={opt}
                                onClick={() => { onChange(opt); onToggle?.(false); }}
                                style={{ padding: '10px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                                {opt}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}


