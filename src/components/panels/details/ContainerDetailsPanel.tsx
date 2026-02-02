import React, { useEffect, useState, useMemo } from 'react';
import { Truck, MapPin, FileText, Ship, Package, X, Check, ChevronsRight, ClipboardCheck, DoorOpen, DoorClosed, Archive, LogOut, ArrowLeftRight, PackageOpen, Boxes, PackageCheck, Plug } from 'lucide-react';
import PlugIcon from '../../ui/icons/PlugIcon';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../../../store/store';
import { useUIStore } from '../../../store/uiStore';
import { getContainerDetails } from '../../../api';
import ContainerLoader from '../../ui/animations/ContainerLoader';

// Helper function to parse blockId into terminal and block
const parseBlockId = (blockId?: string): { terminal: string; block: string } => {
    if (!blockId) return { terminal: '--', block: '--' };

    // Format: "trs_block_a" or "trm_block_b"
    const parts = blockId.split('_');
    if (parts.length >= 3) {
        const terminal = parts[0].toUpperCase(); // "TRS" or "TRM"
        const block = parts[2].toUpperCase(); // "A", "B", etc.
        return { terminal, block };
    }

    return { terminal: '--', block: '--' };
};


export default function ContainerDetailsPanel() {
    const selectId = useStore(state => state.selectId);
    const entities = useStore(state => state.entities);
    const setSelectId = useStore(state => state.setSelectId);

    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    const selectedContainer = selectId ? entities[selectId] : null;

    // Fetch details on demand
    const { data: details, isLoading } = useQuery({
        queryKey: ['container-details', selectId],
        queryFn: async () => {
            if (!selectId) return null;
            return getContainerDetails(selectId);
        },
        enabled: !!selectId && isVisible,
        staleTime: 60000 // Cache for 1 min
    });

    // Check if selected container is at the top of its stack (Y position comparison)
    // Only top-level containers can be restacked
    const isTopLevel = useMemo(() => {
        if (!selectId || !selectedContainer) return false;

        const currentX = selectedContainer.x ?? 0;
        const currentY = selectedContainer.y ?? 0;
        const currentZ = selectedContainer.z ?? 0;

        // Get all container IDs from store
        const allIds = useStore.getState().ids;
        const allEntities = useStore.getState().entities;

        // Find all containers at the same X,Z position (same stack)
        for (const id of allIds) {
            if (id === selectId) continue; // Skip self
            const entity = allEntities[id];
            if (!entity) continue;

            const ex = entity.x ?? 0;
            const ez = entity.z ?? 0;
            const ey = entity.y ?? 0;

            // Check if in same stack (within 0.5 unit tolerance for floating point)
            if (Math.abs(ex - currentX) < 0.5 && Math.abs(ez - currentZ) < 0.5) {
                // Found a container in the same stack
                if (ey > currentY) {
                    // There's a container above us - we are NOT top level
                    return false;
                }
            }
        }

        // No container found above us - we ARE top level
        return true;
    }, [selectId, selectedContainer, entities]);

    const openPanel = useUIStore(state => state.openPanel);
    const activePanel = useUIStore(state => state.activePanel);

    useEffect(() => {
        // Show details only if a container is selected AND no other action panel is open
        if (selectId && !activePanel) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [selectId, activePanel]);

    // ... (existing useEffects)

    if (!selectId && !isVisible) return null;

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setSelectId(null);
            // Reset camera to main view when container panel is closed
            window.dispatchEvent(new CustomEvent('resetCameraToInitial'));
        }, 300);
    };

    const handleRestack = () => {
        if (selectId && selectedContainer) {
            // Build current position from 3D entity data
            const terminal = selectedContainer.terminal || parseBlockId(selectedContainer.blockId).terminal;
            const block = selectedContainer.block || parseBlockId(selectedContainer.blockId).block;
            const lotVal = selectedContainer.lot !== undefined ? String(selectedContainer.lot) : '';
            const rowVal = selectedContainer.row || '--';
            const levelVal = selectedContainer.level !== undefined ? String(selectedContainer.level) : '';
            const currentPos = `${terminal}-${block}-${lotVal}-${rowVal}-${levelVal}`;

            // Opening the panel will set activePanel='restack', which the useEffect watches
            // and will automatically hide this details panel
            openPanel('restack', {
                containerId: selectId,
                currentPosition: currentPos,
                containerType: containerType
            });
        }
    };

    // Combine 3D position data (selectedContainer) with fetched details
    const containerType = details?.container_type || selectedContainer?.type || '20ft';

    // Format stored time nicely
    const formatStoredTime = (isoString: string | null | undefined): string => {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoString;
        }
    };

    return (
        <div
            className={`container-details-panel ${isVisible ? 'visible' : ''}`}
            style={{
                position: 'fixed',
                top: '90px', // Below header
                right: '24px',
                width: '420px',
                maxHeight: 'calc(100vh - 114px)',
                backgroundColor: 'rgba(253, 246, 235, 0.95)', // Subtle light secondary (Cream)
                backdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: '24px',
                border: '1px solid rgba(75, 104, 108, 0.1)', // Subtle primary border
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0,0,0,0.05)',
                zIndex: 1000,
                color: '#1e293b', // Dark slate text
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                transform: isVisible ? 'translateX(0)' : 'translateX(420px)',
                opacity: isVisible ? 1 : 0,
                overflow: 'hidden'
            }}
        >
            {/* Header Section */}
            <div style={{
                padding: '20px 24px 16px',
                background: '#4B686C',
                position: 'relative',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
                zIndex: 10
            }}>
                {/* Location Breadcrumb (Moved to Header) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    opacity: 0.9
                }}>
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <MapPin size={12} color="white" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                            {selectedContainer?.terminal || parseBlockId(selectedContainer?.blockId).terminal}
                        </span>
                        <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                            {selectedContainer?.block || parseBlockId(selectedContainer?.blockId).block}
                        </span>
                        <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                            Lot {selectedContainer?.lot !== undefined ? String(selectedContainer.lot) : '--'}
                        </span>
                        <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                            Row {selectedContainer?.row || '--'}
                        </span>
                        <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                            Level {selectedContainer?.level !== undefined ? String(selectedContainer.level) : '--'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 style={{
                            fontSize: '28px',
                            fontWeight: 800,
                            margin: 0,
                            background: 'white',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textTransform: 'uppercase',
                        }}>
                            {selectId}
                        </h2>

                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            background: 'rgba(243, 239, 239, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '20px',
                            marginTop: '4px' // Align slightly with text baseline visual
                        }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e7e7e7ff', boxShadow: '0 0 6px #e7e7e7ff' }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e7e7e7ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {containerType}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            minHeight: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            zIndex: 10,
                            position: 'relative',
                            padding: '0',
                            margin: '0',
                            marginBottom: '4px',
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
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                padding: '0 24px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                gap: '24px'
            }}>
                {['details', 'lifecycle'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '16px 0',
                            color: activeTab === tab ? 'var(--primary-color)' : '#64748b',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            position: 'relative',
                            textTransform: 'capitalize',
                            transition: 'all 0.3s ease',
                            outline: 'none',
                            boxShadow: 'none'
                        }}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div style={{
                                position: 'absolute',
                                bottom: '-1px',
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: 'var(--secondary-gradient)',
                                borderRadius: '2px 2px 0 0',
                                boxShadow: '0 -2px 8px rgba(247, 207, 155, 0.4)'
                            }} />
                        )}
                    </button>

                ))}

                {/* Reefer Control Button (Only for RT containers) */}
                {details?.container_type?.includes('RT') && (
                    <div
                        style={{
                            marginLeft: 'auto',
                            marginTop: 'auto',
                            marginBottom: 'auto',
                        }}
                    >
                        <PlugIcon
                            status={details.plug_in_status as 'Plugged' | 'Unplugged'}
                            onClick={() => openPanel('plugInOut', {
                                containerId: details.container_number,
                                containerType: details.container_type,
                                status: details.plug_in_status
                            })}
                        />
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div style={{ padding: '16px 24px 24px 24px', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                {activeTab === 'details' && (
                    isLoading ? (
                        <ContainerLoader />
                    ) : !details ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', fontSize: '13px' }}>
                            Container details not available
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                            {/* Customer Information */}
                            <DetailSection title="Customer Information" icon={<FileText size={16} />}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <InfoItem label="Customer Name" value={details.customer_name || 'N/A'} fullWidth />
                                    {details.booking_id && <InfoItem label="Booking ID" value={details.booking_id} />}
                                    <InfoItem label="Shipment Name" value={details.shipment_name || 'N/A'} />
                                </div>
                            </DetailSection>

                            {/* Divider */}
                            <div style={{
                                height: '2px',
                                background: 'linear-gradient(90deg, rgba(75, 104, 108, 0.2) 0%, rgba(75, 104, 108, 0.05) 50%, transparent 100%)',
                                margin: '4px 0'
                            }} />

                            {/* Shipment Details */}
                            <DetailSection title="Shipment Details" icon={<Ship size={16} />}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <InfoItem label="Inbound Order" value={details.inbound_order_nbr || 'N/A'} />
                                    <InfoItem label="Inbound Shipment" value={details.inbound_shipment_nbr || 'N/A'} />
                                </div>
                            </DetailSection>

                            {/* Divider */}
                            <div style={{
                                height: '2px',
                                background: 'linear-gradient(90deg, rgba(75, 104, 108, 0.2) 0%, rgba(75, 104, 108, 0.05) 50%, transparent 100%)',
                                margin: '4px 0'
                            }} />

                            {/* Storage Information */}
                            <DetailSection title="Yard Information" icon={<Package size={16} />}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <InfoItem label="Stored Time" value={formatStoredTime(details.container_stored_time)} fullWidth />
                                </div>
                            </DetailSection>
                        </div>
                    )
                )}

                {activeTab === 'lifecycle' && (
                    isLoading ? (
                        <ContainerLoader />
                    ) : !details?.tracking_events?.length ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', fontSize: '13px' }}>
                            No tracking events available
                        </div>
                    ) : (
                        <div style={{ position: 'relative', padding: '12px 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {details.tracking_events.map((event, index) => {
                                    const eventDate = new Date(event.event_date);
                                    const eventsLength = details.tracking_events?.length ?? 0;
                                    const isLastEvent = index === eventsLength - 1;
                                    // Check for 'R' (API code) or 'Reserved' (display name)
                                    const isReserved = selectedContainer?.status === 'R' || selectedContainer?.status === 'Reserved';

                                    return (
                                        <LifecycleStage
                                            key={`${event.event_type}-${event.event_date}`}
                                            date={eventDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                            time={eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            title={event.event_type}
                                            status={isLastEvent && !isReserved ? 'current' : 'completed'}
                                            isLast={isLastEvent && !isReserved}
                                        />
                                    );
                                })}

                                {/* Show "Awaiting Release" only for Reserved status (R or Reserved) */}
                                {(selectedContainer?.status === 'R' || selectedContainer?.status === 'Reserved') && (
                                    <LifecycleStage
                                        date="--"
                                        time="Pending"
                                        title="Awaiting Release"
                                        status="pending"
                                        isLast
                                    />
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Actions Footer */}
            <div style={{
                padding: '20px 24px',
                borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                display: 'flex',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(247, 207, 155, 0.25) 0%, rgba(247, 207, 155, 0.15) 100%)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 1px 0 rgba(247, 207, 155, 0.3), 0 -4px 12px rgba(0, 0, 0, 0.05)'
            }}>
                <ActionButton
                    icon={<Truck size={16} />}
                    label="Restack"
                    primary={isTopLevel}
                    onClick={isTopLevel ? handleRestack : undefined}
                    disabled={!isTopLevel}
                    tooltip={!isTopLevel ? "Cannot restack: Container has other containers stacked above it" : undefined}
                />
            </div>
        </div>
    );
}

// Helper Components

const DetailSection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {icon} {title}
        </div>
        {children}
    </div>
);

const InfoItem = ({ label, value, fullWidth }: { label: string, value: string, fullWidth?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: fullWidth ? 'span 2' : 'span 1' }}>
        <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>{label}</div>
        <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: 500 }}>{value}</div>
    </div>
);

const getEventIcon = (title: string, status: string, mainColor: string) => {
    // Normalize title for matching
    const upperTitle = title.toUpperCase();

    const iconProps = {
        size: 18,
        color: status === 'completed' ? 'white' : mainColor,
        strokeWidth: 2.5
    };

    if (upperTitle.includes('VEHICLE ENTERED')) return <Truck {...iconProps} />;
    if (upperTitle.includes('INSPECTED')) return <ClipboardCheck {...iconProps} />;
    if (upperTitle.includes('GATE IN')) return <DoorOpen {...iconProps} />;
    if (upperTitle.includes('CONTAINER STORED')) return <Archive {...iconProps} />; // Changed to Archive for better distinction
    if (upperTitle.includes('CONTAINER RELEASED')) return <LogOut {...iconProps} />;
    if (upperTitle.includes('CONTAINER RESTACKED')) return <ArrowLeftRight {...iconProps} />;
    if (upperTitle.includes('DESTUFFED')) return <PackageOpen {...iconProps} />;
    if (upperTitle.includes('MATERIAL STORED')) return <Boxes {...iconProps} />;
    if (upperTitle.includes('STUFFED')) return <PackageCheck {...iconProps} />;
    if (upperTitle.includes('GATE OUT')) return <DoorClosed {...iconProps} />;
    if (upperTitle.includes('VEHICLE EXIT')) return <Truck {...iconProps} style={{ transform: 'scaleX(-1)' }} />; // Mirrored truck
    if (upperTitle.includes('PLUGGED')) return <Plug {...iconProps} />;

    // Default fallback
    if (status === 'completed') return <Check {...iconProps} strokeWidth={3} />;
    if (status === 'current') return <ChevronsRight {...iconProps} strokeWidth={3} />;
    return <div style={{ width: '8px', height: '8px', background: mainColor, borderRadius: '50%' }} />;
};

const LifecycleStage = ({ date, time, title, status, isLast }: {
    date: string,
    time: string,
    title: string,
    status: 'completed' | 'current' | 'pending',
    isLast?: boolean
}) => {
    // Colors based on status
    const colors = {
        completed: { main: '#4B686C', bg: 'white', border: '#4B686C' }, // Primary (Teal)
        current: { main: '#F7CF9B', bg: 'white', border: '#F7CF9B' },   // Secondary (Gold/Orange)
        pending: { main: '#cbd5e1', bg: 'white', border: '#e2e8f0' }    // Grey
    };

    const currentStyle = colors[status];

    // Handle multiline titles (splitting by " | ")
    const [mainTitle, subTitle] = title.includes(' | ') ? title.split(' | ') : [title, null];

    return (
        <div style={{ display: 'flex', gap: '16px', position: 'relative', minHeight: '66px' }}>
            {/* Left: Date & Time */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                minWidth: '60px',
                paddingTop: '6px',
                textAlign: 'right'
            }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>{date}</div>
                <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>{time}</div>
            </div>

            {/* Center: Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {/* Icon Circle - INCREASED SIZE */}
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: status === 'completed' ? currentStyle.main : 'white',
                    border: status === 'completed' ? 'none' : `2px solid ${currentStyle.main}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    boxShadow: status === 'current' ? `0 0 0 4px ${currentStyle.main}40` : 'none',
                    transition: 'all 0.3s ease'
                }}>
                    {getEventIcon(mainTitle, status, currentStyle.main)}
                </div>

                {/* Vertical Line */}
                {!isLast && (
                    <div style={{
                        position: 'absolute',
                        top: '32px',
                        bottom: '-16px',
                        width: '2px',
                        background: status === 'completed' ? '#4B686C' : '#e2e8f0',
                        zIndex: 1
                    }} />
                )}
            </div>

            {/* Right: Card */}
            <div style={{
                flex: 1,
                background: 'white',
                border: `1px solid ${status === 'pending' ? '#e2e8f0' : currentStyle.border}`,
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                opacity: status === 'pending' ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>
                        {mainTitle}
                    </div>
                    {subTitle && (
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                            {subTitle}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActionButton = ({ icon, label, primary, danger, onClick, disabled, tooltip }: { icon: React.ReactNode, label: string, primary?: boolean, danger?: boolean, onClick?: () => void, disabled?: boolean, tooltip?: string }) => {
    let bg = 'white';
    let color = '#1e293b';
    let border = '1px solid rgba(0, 0, 0, 0.1)';

    if (disabled) {
        bg = '#e2e8f0';
        color = '#94a3b8';
        border = '1px solid rgba(0, 0, 0, 0.05)';
    } else if (primary) {
        bg = 'var(--primary-gradient)';
        border = 'none';
        color = 'white';
    } else if (danger) {
        bg = 'rgba(239, 68, 68, 0.1)';
        color = '#ef4444';
        border = '1px solid rgba(239, 68, 68, 0.2)';
    }

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            title={tooltip}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                background: bg,
                color: color,
                border: border,
                fontSize: '13px',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: primary && !disabled ? '0 4px 12px rgba(75, 104, 108, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
                opacity: disabled ? 0.7 : 1
            }}
            onMouseEnter={e => {
                if (disabled) return;
                if (!primary && !danger) e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)';
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
                if (disabled) return;
                if (!primary && !danger) e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {icon}
            {label}
        </button>
    );
};
