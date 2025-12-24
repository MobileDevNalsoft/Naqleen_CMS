import { useState, useEffect } from 'react';
import { History, Save, Power, Space, Check, ChevronsRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PanelLayout from '../PanelLayout';
import { useUIStore } from '../../../store/uiStore';
import { yardApi } from '../../../api/handlers/yardApi';
import { showToast } from '../../ui/Toast';
import TemperatureScale from '../../ui/TemperatureScale';
import Dropdown from '../../ui/Dropdown';
import type { PlugInOutHistoryItem } from '../../../api/types/yardTypes';

const REMARKS_OPTIONS = [
    { value: 'Controller display faulty', label: 'Controller display faulty' },
    { value: 'Set point not as required', label: 'Set point not as required' },
    { value: 'Actual temp out of range', label: 'Actual temp out of range' },
    { value: 'Supply sensor failure', label: 'Supply sensor failure' },
    { value: 'Return sensor failure', label: 'Return sensor failure' },
    { value: 'Data logger missing/incomplete', label: 'Data logger missing/incomplete' },
    { value: 'Active alarm 01', label: 'Active alarm 01' },
    { value: 'Active alarm 02', label: 'Active alarm 02' },
    { value: 'Active alarm 03', label: 'Active alarm 03' },
    { value: 'Active alarm 04', label: 'Active alarm 04' },
    { value: 'Defrost system fault', label: 'Defrost system fault' },
    { value: 'Compressor malfunction', label: 'Compressor malfunction' },
    { value: 'Fan motor/blade damage', label: 'Fan motor/blade damage' },
    { value: 'Power supply issue', label: 'Power supply issue' },
    { value: 'USB port/data failure', label: 'USB port/data failure' },
    { value: 'Door seal damaged', label: 'Door seal damaged' },
    { value: 'Drain system blocked', label: 'Drain system blocked' },
    { value: 'Interior unclean/frosty', label: 'Interior unclean/frosty' },
    { value: 'PTI invalid', label: 'PTI invalid' }
];

interface PlugInOutPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PlugInOutPanel({ isOpen, onClose }: PlugInOutPanelProps) {
    const panelData = useUIStore(state => state.panelData); // Expecting container data here
    const [activeTab, setActiveTab] = useState<'control' | 'history'>('control');
    const queryClient = useQueryClient();

    const containerId = panelData?.containerId || '';
    const containerType = panelData?.containerType;

    // Form State
    const [status, setStatus] = useState<'Plugged' | 'Unplugged'>('Unplugged');
    const [setPoint, setSetPoint] = useState('');
    const [currentTemp, setCurrentTemp] = useState('');
    const [remarks, setRemarks] = useState('');

    // Fetch Details & History
    const { data: detailsData, isLoading, refetch } = useQuery({
        queryKey: ['reeferDetails', containerId],
        queryFn: () => yardApi.getPlugInOutContainerDetails({ containerNbr: containerId }),
        enabled: !!containerId && isOpen,
    });

    // Refresh data when panel opens
    useEffect(() => {
        if (isOpen && containerId) {
            refetch();
        }
    }, [isOpen, containerId, refetch]);

    // Track initial values for change detection
    const [initialValues, setInitialValues] = useState({
        setPoint: '',
        currentTemp: '',
        remarks: ''
    });

    // Check for changes
    const hasChanges =
        setPoint !== initialValues.setPoint ||
        currentTemp !== initialValues.currentTemp ||
        remarks !== initialValues.remarks;

    // Sync state with fetched data
    useEffect(() => {
        if (detailsData?.data?.history && detailsData.data.history.length > 0) {
            // Sort history to find the actual latest record, as API order is not guaranteed
            const sortedHistory = detailsData.data.history.slice().sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            const latest = sortedHistory[0];
            const newStatus = latest.type as 'Plugged' | 'Unplugged';
            const newSetPoint = latest.setPointTemp || '';
            const newCurrentTemp = latest.currentTemp || '';

            setStatus(newStatus);
            setSetPoint(newSetPoint);
            setCurrentTemp(newCurrentTemp);
            // Remarks should be empty by default for new actions as per user request
            setRemarks('');

            setInitialValues({
                setPoint: newSetPoint,
                currentTemp: newCurrentTemp,
                remarks: ''
            });

        } else if (panelData?.status) {
            setStatus(panelData.status as 'Plugged' | 'Unplugged');
        }
    }, [detailsData, panelData]);

    const { mutate: saveReeferStatus, isPending } = useMutation({
        mutationFn: yardApi.postPlugInOutContainer,
        onSuccess: (data, variables) => {
            showToast('success', 'Reefer status updated successfully');
            queryClient.invalidateQueries({ queryKey: ['reeferDetails', containerId] });

            // Update cache directly for immediate UI feedback in ContainerDetailsPanel
            queryClient.setQueryData(['container-details', containerId], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    plug_in_status: variables.type
                };
            });

            // Also invalidate to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['container-details', containerId] });
        },
        onError: (error) => {
            showToast('error', `Failed to update status: ${error}`);
        }
    });

    const handleAction = (action: 'Plug In' | 'Plug Out' | 'Update') => {
        let newStatus = status;
        if (action === 'Plug In') newStatus = 'Plugged';
        if (action === 'Plug Out') newStatus = 'Unplugged';
        // 'Update' keeps current status

        saveReeferStatus({
            containerNbr: containerId,
            type: newStatus,
            setPointTemp: setPoint || '0',
            currentTemp: currentTemp || '0',
            remarks: remarks,
            timestamp: new Date().toISOString()
        });
    };

    const renderFooter = () => {
        if (activeTab === 'history') return null;

        if (status === 'Unplugged') {
            return (
                <button
                    onClick={() => handleAction('Plug In')}
                    disabled={isPending}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: 'var(--secondary-gradient)', // Using standard secondary gradient
                        color: 'var(--primary-color)',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        opacity: isPending ? 0.7 : 1,
                        boxShadow: '0 4px 12px rgba(247, 207, 155, 0.4)' // Soft orange shadow
                    }}
                >
                    <Power size={20} />
                    Plug In Container
                </button>
            );
        }

        // Status is Plugged
        return (
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button
                    onClick={() => handleAction('Plug Out')}
                    disabled={isPending}
                    style={{
                        flex: 1,
                        padding: '14px',
                        background: 'white',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        opacity: isPending ? 0.7 : 1
                    }}
                >
                    <Power size={20} />
                    Plug Out
                </button>

                {hasChanges && (
                    <button
                        onClick={() => handleAction('Update')}
                        disabled={isPending}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: isPending ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            opacity: isPending ? 0.7 : 1,
                            boxShadow: '0 4px 12px rgba(75, 104, 108, 0.4)'
                        }}
                    >
                        <Save size={20} />
                        Update
                    </button>
                )}
            </div>
        );
    };

    // Type badge to match Restack/Container Details
    const renderTypeBadge = () => (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(243, 239, 239, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            marginTop: '4px'
        }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e7e7e7ff', boxShadow: '0 0 6px #e7e7e7ff' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e7e7e7ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {containerType}
            </span>
        </div>
    );

    // Render tabs for tabsContent prop
    const renderTabs = () => (
        <div style={{
            display: 'flex',
            gap: '24px'
        }}>
            {[
                { key: 'control', label: 'Control Center' },
                { key: 'history', label: 'History' }
            ].map(tab => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as 'control' | 'history')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '12px 0',
                        color: activeTab === tab.key ? 'var(--primary-color)' : '#64748b',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        boxShadow: 'none'
                    }}
                >
                    {tab.label}
                    {activeTab === tab.key && (
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
        </div>
    );

    return (
        <PanelLayout
            title={containerId || 'CONTAINER'}
            category="REEFER CONTROL"
            titleBadge={containerId && containerType ? renderTypeBadge() : undefined}
            isOpen={isOpen}
            onClose={onClose}
            footerActions={renderFooter()}
            tabsContent={renderTabs()}
        >
            {/* Content Area */}
            <div style={{ flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'control' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>

                        {/* Temperature Controls (Scrolling Scales) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <TemperatureScale
                                label="SET POINT"
                                value={Number(setPoint) || 0}
                                onChange={(val) => setSetPoint(val.toString())}
                                min={-30}
                                max={130}
                            />

                            <TemperatureScale
                                label="CURRENT TEMP"
                                value={Number(currentTemp) || 0}
                                onChange={(val) => setCurrentTemp(val.toString())}
                                min={-30}
                                max={130}
                            />
                        </div>

                        {/* Remarks */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Dropdown
                                label="REMARKS"
                                value={remarks}
                                onChange={setRemarks}
                                options={REMARKS_OPTIONS}
                                placeholder="Select remarks"
                            />
                        </div>
                        {/* Bottom Spacer */}
                        <div style={{ height: '20px' }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '400px', paddingRight: '4px' }}>
                        {isLoading ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading history...</div>
                        ) : detailsData?.data?.history?.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <History size={32} />
                                <span style={{ fontSize: '14px' }}>No history records found</span>
                            </div>
                        ) : (
                            detailsData?.data?.history
                                ?.slice() // Create a copy before sorting
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .map((item: PlugInOutHistoryItem, index: number) => {
                                    // Parse timestamp normally - server sends UTC (Z), browser converts to local
                                    const localDate = new Date(item.timestamp);

                                    return (
                                        <LifecycleStage
                                            key={index}
                                            date={localDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                            time={localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            title={item.type || 'Status Update'}
                                            status={index === 0 ? 'current' : 'completed'}
                                            isLast={index === (detailsData.data?.history?.length || 0) - 1}
                                            isFirst={index === 0}
                                            setPointTemp={item.setPointTemp}
                                            details={
                                                <span>
                                                    {item.currentTemp && (
                                                        <span>Actual: <b>{item.currentTemp}°C</b></span>
                                                    )}
                                                    {item.remarks && (
                                                        <div style={{ marginTop: '4px', fontStyle: 'italic', opacity: 0.8 }}>
                                                            "{item.remarks}"
                                                        </div>
                                                    )}
                                                </span>
                                            }
                                        />
                                    );
                                })
                        )}
                    </div>
                )}
            </div>

        </PanelLayout>
    );
}

const LifecycleStage = ({ date, time, title, details, setPointTemp, status }: {
    date: string,
    time: string,
    title: string,
    details: React.ReactNode,
    status: 'completed' | 'current' | 'pending',
    isLast?: boolean,
    isFirst?: boolean,
    setPointTemp?: string
}) => {
    const currentStyle = { main: '#4B686C', bg: 'white', border: '#4B686C' };

    // Determine flag styles based on title "Plugged" or "Unplugged"
    const isPlugged = title === 'Plugged';
    const isUnplugged = title === 'Unplugged';
    const isFlagged = isPlugged || isUnplugged;

    const flagColor = isPlugged ? '#166534' : '#991b1b';
    const flagBorder = isPlugged ? '#22c55e' : '#ef4444';
    const flagBg = isPlugged ? '#dcfce7' : '#fee2e2';

    return (
        <div style={{ display: 'flex', gap: '20px', position: 'relative', marginBottom: '10px' }}>
            {/* Left: Date & Time */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center', // Center vertically
                alignItems: 'flex-end',
                minWidth: '40px',
                paddingTop: '0', // Removed padding to center perfectly
                textAlign: 'right'
            }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>{date}</div>
                <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>{time}</div>
            </div>

            {/* Center: Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {/* Icon */}
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#4B686C',
                    border: '4px solid #FDF6EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    boxShadow: 'none',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700
                }}>
                    <div>
                        {setPointTemp !== undefined ? `${setPointTemp}°` : '-'}
                    </div>
                </div>

                {/* Horizontal Line to Card */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '40px', // 18px (half icon) + 22px (gap + overlap)
                    height: '2px',
                    background: '#4B686C', // Subtle connector color
                    transform: 'translateY(-50%)',
                    zIndex: 0 // Behind icon
                }} />
            </div>

            {/* Right: Card */}
            <div style={{
                flex: 1,
                background: 'white',
                border: `1px solid ${isFlagged ? flagBorder : (status === 'pending' ? '#e2e8f0' : currentStyle.border)}`,
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '2px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                position: 'relative',
                overflow: 'hidden' // Ensure flag doesn't spill out
            }}>
                {isFlagged ? (
                    <div style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        padding: '4px 12px',
                        background: flagBg,
                        borderBottomLeftRadius: '12px',
                        color: flagColor,
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {title}
                    </div>
                ) : (
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>{title}</div>
                )}

                {/* Spacing compensation for flag if it exists, or just ensure details don't overlap? 
                    If details are long, they naturally flow. The absolute flag sits on top.
                    But if no title in flow, details might be too high.
                    Let's add a wrapper or margin if flagged?
                    If flagged, title is removed from flow.
                    So 'details' becomes the first child in flow.
                */}
                <div style={{
                    color: '#64748b',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    marginTop: isFlagged ? '4px' : '0' // Add bit of space if title is gone
                }}>
                    {details}
                </div>
            </div>
        </div>
    );
};
