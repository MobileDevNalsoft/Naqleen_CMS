
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, CheckCircle, Truck, ArrowRight, X, Loader2, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../../ui/custom-components/Toast';
import { yardApi } from '../../../api/handlers/yardApi';
import PanelLayout from '../PanelLayout';
import type {
    PositionTruckDetails
} from '../../../api/types/yardTypes';

import { useMemo } from 'react';
import TruckLoader from '../../ui/animations/TruckLoader';
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

    // Selected Truck State
    const [selectedTruck, setSelectedTruck] = useState<PositionTruckDetails | null>(null);

    // Position State
    const [selectedPosition, setSelectedPosition] = useState('');

    // Query client for cache updates
    const queryClient = useQueryClient();

    // --- API Queries ---

    // 1. Fetch All Trucks (Initial Load)
    const { data: allTrucks = [], isLoading: isLoadingTrucks } = useQuery({
        queryKey: ['positionTrucks', 'all'], // Cache key for all trucks
        queryFn: () => yardApi.getPositionTrucks({ searchText: '' }), // Empty search returns all
        enabled: isOpen,
        select: (res) => res.data || []
    });

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

    const { mutate: submitPosition, isPending: isSubmitting } = useMutation({
        mutationFn: yardApi.submitContainerPosition,
        onSuccess: (res) => {
            if (res.response_code === 200) {
                showToast('success', 'Container Positioned Successfully');

                // Get container data (either from truck flow or CFS mode)
                const containerId = isCfsMode
                    ? cfsContainer?.containerNbr
                    : selectedTruck?.containerNbr;
                const containerType = isCfsMode
                    ? cfsContainer?.containerType || '20'
                    : selectedTruck?.containerType || '20';

                // Add container to 3D scene using marking positions for O(1) lookup
                if (containerId && selectedPosition) {
                    // Extract marking key and level: "TRM-A-1-D-1" -> "TRM-A-1-D" + 1
                    const lastDashIndex = selectedPosition.lastIndexOf('-');
                    const markingKey = selectedPosition.substring(0, lastDashIndex).toUpperCase();
                    const level = parseInt(selectedPosition.substring(lastDashIndex + 1), 10) || 1;

                    // Get marking position from store for O(1) lookup
                    const markingPositions = useStore.getState().markingPositions;
                    const markingPos = markingPositions[markingKey];

                    if (markingPos) {
                        // Calculate Y position based on level and container type
                        const is20ft = !containerType || containerType.startsWith('2');
                        const containerHeight = is20ft ? 2.591 : 2.896;
                        const levelGap = 0.02;
                        const y = markingPos.y + containerHeight / 2 + (level - 1) * (containerHeight + levelGap);

                        // Derive values from markingKey: "TRM-A-1-D" -> terminal, block, lot, row
                        const keyParts = markingKey.split('-');
                        const terminal = keyParts[0] || '';
                        const block = keyParts[1] || '';
                        const lot = parseInt(keyParts[2], 10) || 1;
                        const rowLabel = keyParts[3] || 'A';
                        const blockId = `${terminal.toLowerCase()}_block_${block.toLowerCase()}`;

                        const newContainer = {
                            id: containerId,
                            x: markingPos.x,
                            y,
                            z: markingPos.z,
                            terminal,
                            block,
                            blockId,
                            lot,
                            row: rowLabel,
                            level,
                            type: containerType,
                            status: 'active'
                        };

                        // Add to 3D scene
                        setEntitiesBatch([newContainer]);
                        console.log('Container added to scene:', newContainer);
                    } else {
                        console.warn('Marking position not found for container placement:', markingKey);
                    }
                } else {
                    console.warn('Could not add container to scene:', {
                        containerId,
                        selectedPosition
                    });
                }

                // Clear ghost container
                setGhostContainer(null);

                // Mode-specific cleanup
                if (isCfsMode && cfsContainer?.containerNbr) {
                    // Remove container from CFS list
                    removeCfsContainer(cfsContainer.containerNbr);
                    console.log('Removed from CFS list:', cfsContainer.containerNbr);
                } else {
                    // Remove the positioned truck from local cache (instant feedback, no refetch)
                    queryClient.setQueryData(['positionTrucks', 'all'], (oldData: any) => {
                        if (!oldData?.data) return oldData;
                        return {
                            ...oldData,
                            data: oldData.data.filter((t: string) => t !== selectedTruck?.truckNbr)
                        };
                    });
                }

                setStep('success');
            } else {
                showToast('error', res.response_message || 'Failed to position container');
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
            setSearchText('');
            setSelectedTruck(null);
            setSelectedPosition('');
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

    const handlePlace = () => {
        // For CFS mode, use cfsContainer data; otherwise use selectedTruck
        if (isCfsMode && cfsContainer) {
            if (!selectedPosition) return;
            submitPosition({
                shipment_nbr: cfsContainer.shipmentNbr,
                container_nbr: cfsContainer.containerNbr,
                position: selectedPosition
            });
        } else {
            if (!selectedTruck || !selectedPosition) return;
            submitPosition({
                shipment_nbr: selectedTruck.shipmentNbr,
                container_nbr: selectedTruck.containerNbr,
                position: selectedPosition
            });
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

    // Handle Done button - return to truck list or close panel for CFS mode
    const handleDone = () => {
        setSelectedTruck(null);
        setSelectedPosition('');
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
        // Only enable if position is FULLY complete (Terminal-Block-Lot-Row-Level)
        const isPositionComplete = selectedPosition && selectedPosition.split('-').length === 5;
        const hasRequiredData = isCfsMode ? !!cfsContainer : !!selectedTruck;
        const isEnabled = hasRequiredData && isPositionComplete && !isSubmitting;

        return (
            <button
                onClick={handlePlace}
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
                        Submit Position <ArrowRight size={16} />
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
            {/* Search Bar */}
            {!isLoadingTrucks && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--primary-color)', opacity: 0.6
                        }} />
                        {searchText && !isLoadingTrucks && (
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
                            onChange={(e) => setSearchText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            maxLength={10}
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
                        <TruckLoader message="LOADING TRUCKS" subMessage="Checking for waiting trucks..." height="150px" />
                    </div>
                ) : filteredTrucks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-color)', opacity: 0.6 }}>
                        <Truck size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <div>{searchText ? 'No trucks match your search' : 'No trucks found'}</div>
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

    // Render details view
    const renderDetailsView = () => {
        // Determine container type for position selectors
        const effectiveContainerType = isCfsMode
            ? cfsContainer?.containerType || '20GP'
            : selectedTruck?.containerType || '20GP';

        return (
            <>
                {/* Loading Details or Submitting (Not applicable for CFS mode) */}
                {!isCfsMode && (isLoadingDetails || isSubmitting) && (
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', paddingBottom: '40px', boxSizing: 'border-box'
                    }}>
                        <TruckLoader
                            message={isSubmitting ? "CONFIRMING POSITION" : "RETRIEVING DETAILS"}
                            subMessage={isSubmitting ? "Updating container location..." : "Fetching truck information..."}
                            height="200px"
                        />
                    </div>
                )}

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
                                color: selectedPosition ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
                                fontFamily: 'monospace',
                                letterSpacing: '2px',
                                minHeight: '32px'
                            }}>
                                {selectedPosition || 'Select Position'}
                            </div>
                        </div>

                        {/* Position Selectors */}
                        <PositionSelectors
                            containerType={effectiveContainerType}
                            onPositionChange={setSelectedPosition}
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
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{selectedTruck.driverNbr || 'N/A'}</span>
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
                                    {selectedTruck.shipmentName}
                                </span>
                            </div>
                            <div style={detailRowStyle}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Shipment No</span>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{selectedTruck.shipmentNbr || 'N/A'}</span>
                            </div>
                            <div style={detailRowStyle}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Container</span>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: 600 }}>{selectedTruck.containerNbr || 'N/A'}</span>
                            </div>
                            <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                                <span style={{ color: 'var(--text-color)', fontSize: '13px', opacity: 0.7 }}>Container Type</span>
                                <span style={{
                                    padding: '2px 8px', background: 'rgba(75, 104, 108, 0.1)',
                                    borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--primary-color)'
                                }}>
                                    {selectedTruck.containerType || 'N/A'}
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
                                color: selectedPosition ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
                                fontFamily: 'monospace',
                                letterSpacing: '2px',
                                minHeight: '32px'
                            }}>
                                {selectedPosition || 'Select Position'}
                            </div>
                        </div>

                        {/* Position Selectors */}
                        <PositionSelectors
                            containerType={effectiveContainerType}
                            onPositionChange={setSelectedPosition}
                        />
                    </>
                )}

                {/* CFS Mode Submitting State */}
                {isCfsMode && isSubmitting && (
                    <TruckLoader
                        message="POSITIONING CONTAINER"
                        subMessage="Please wait..."
                        height="280px"
                    />
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
                setSelectedPosition('');
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
    const panelTitle = isCfsMode && cfsContainer
        ? cfsContainer.containerNbr
        : (selectedTruck ? selectedTruck.containerNbr : `CONTAINER${allTrucks.length > 0 ? ` (${allTrucks.length})` : ''}`);

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
            {isLoadingDetails && (
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

            {/* Main Content Area */}
            {step === 'truck_list' && !isLoadingDetails && renderTruckListView()}
            {step === 'details' && !isSubmitting && renderDetailsView()}

            {/* Loading during submission */}
            {step === 'details' && isSubmitting && (
                <TruckLoader
                    message="POSITIONING CONTAINER"
                    subMessage="Please wait..."
                    height="280px"
                />
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
                    <p style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '14px', lineHeight: 1.6 }}>
                        Container <strong style={{ color: 'var(--primary-color)' }}>{selectedTruck?.containerNbr}</strong> has been positioned at <strong style={{ color: 'var(--primary-color)' }}>{selectedPosition}</strong>
                    </p>
                </div>
            )}
        </PanelLayout>
    );
}

// Helper Component for Cascading Dropdowns
function PositionSelectors({ containerType, onPositionChange }: { containerType: string, onPositionChange: (pos: string) => void }) {
    const [terminal, setTerminal] = useState('');
    const [block, setBlock] = useState('');
    const [lot, setLot] = useState('');
    const [row, setRow] = useState('');
    const [level, setLevel] = useState('');

    // Track which dropdown is open
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Store for camera focus and ghost container
    const setFocusPosition = useStore((state) => state.setFocusPosition);
    const setGhostContainer = useStore((state) => state.setGhostContainer);

    // Track if position was complete (for reset logic)
    const wasCompleteRef = useRef(false);

    // Query Available Options with loading states
    const { data: termData, isLoading: isLoadingTerminals } = useQuery({
        queryKey: ['posInit', containerType],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'I', containerType }),
        select: res => res.data
    });

    const { data: blockData, isLoading: isLoadingBlocks } = useQuery({
        queryKey: ['posBlock', terminal],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'T', containerType, terminal }),
        enabled: !!terminal,
        select: res => res.data
    });

    const { data: lotData, isLoading: isLoadingLots } = useQuery({
        queryKey: ['posLot', block],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'B', containerType, terminal, block }),
        enabled: !!block,
        select: res => res.data
    });

    const { data: rowData, isLoading: isLoadingRows } = useQuery({
        queryKey: ['posRow', lot],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'L', containerType, terminal, block, lot }),
        enabled: !!lot,
        select: res => res.data
    });

    const { data: levelData, isLoading: isLoadingLevel } = useQuery({
        queryKey: ['posLevel', row],
        queryFn: () => yardApi.getAvailablePositionLov({ flag: 'R', containerType, terminal, block, lot, row }),
        enabled: !!row,
        select: res => res.data
    });

    // Build progressive position string
    const buildPositionString = () => {
        const parts: string[] = [];
        if (terminal) parts.push(terminal);
        if (block) parts.push(block);
        if (lot) parts.push(lot);
        if (row) parts.push(row);
        if (level) parts.push(level);
        return parts.join('-');
    };

    // Check if position is complete
    const isComplete = !!(terminal && block && lot && row && level);

    // Auto-update parent with progressive position
    useEffect(() => {
        onPositionChange(buildPositionString());
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
                        options={levelData?.level ? [levelData.level.toString()] : []}
                        onChange={setLevel}
                        disabled={!row}
                        isLoading={isLoadingLevel && !!row}
                        isOpen={openDropdown === 'level'}
                        onToggle={(open) => setOpenDropdown(open ? 'level' : null)}
                        flex={1}
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
    isLoading?: boolean;
    isOpen?: boolean;
    onToggle?: (open: boolean) => void;
    flex?: number;
}

function Dropdown({ label, value, options, onChange, disabled, isLoading, isOpen, onToggle, flex }: DropdownProps) {
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
                onClick={() => !disabled && !isLoading && onToggle?.(!isOpen)}
                style={{
                    padding: '10px 12px',
                    background: disabled ? '#f1f5f9' : 'white',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
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
                <ChevronDown
                    size={14}
                    color="#94a3b8"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                    }}
                />
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


