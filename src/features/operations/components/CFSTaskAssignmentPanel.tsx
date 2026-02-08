import { useState, useEffect, useRef } from 'react';
import PanelLayout from '../../shared/components/PanelLayout';
import { Box, User, Search, Loader2, ChevronLeft, CheckCircle2, Layout, UserCircle, Calendar, ArrowLeft } from 'lucide-react';
import PremiumStateView from '../../../components/ui/feedback/PremiumStateView';
import CFSTaskLoader from '../../../components/ui/feedback/cfs/CFSTaskLoader';
import { yardApi } from '../../yard-planning/apis/yardApi';
import type { TaskAssignmentShipment, TaskAssignmentDetail } from '../types/taskAssignmentTypes';
import { useToast } from '../../../components/ui/feedback/common/Toast';

interface CFSTaskAssignmentPanelProps {
    isOpen: boolean;
    onClose: () => void;
}


export default function CFSTaskAssignmentPanel({ isOpen, onClose }: CFSTaskAssignmentPanelProps) {
    const [activeTab, setActiveTab] = useState<'new' | 'assigned'>('new');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const [newTasks, setNewTasks] = useState<TaskAssignmentShipment[]>([]);
    const [assignedTasks, setAssignedTasks] = useState<TaskAssignmentShipment[]>([]);

    const [newPage, setNewPage] = useState(1);
    const [assignedPage, setAssignedPage] = useState(1);
    const [hasMoreNew, setHasMoreNew] = useState(true);
    const [hasMoreAssigned, setHasMoreAssigned] = useState(true);

    const [operators, setOperators] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState<TaskAssignmentShipment | null>(null);
    const [taskDetail, setTaskDetail] = useState<TaskAssignmentDetail | null>(null);
    const [selectedOperator, setSelectedOperator] = useState<string>('');
    const [initialOperator, setInitialOperator] = useState<string>('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { showToast } = useToast();

    const listRef = useRef<HTMLDivElement>(null);

    // Theme Colors based on screenshot
    const theme = {
        primary: '#4B686C', // Dark Teal
        secondary: '#f4b873', // Orange/Gold
        background: '#fdf6eb', // Light Cream/Beige
        textDark: '#1e293b',
        textMuted: '#64748b',
        white: '#ffffff',
        shadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        border: 'rgba(75, 104, 108, 0.08)',
        cardBg: '#f8fafc'
    };

    useEffect(() => {
        if (isOpen) {
            initialFetch();
            fetchOperators();
        } else {
            resetState();
        }
    }, [isOpen]);

    const resetState = () => {
        setSearchQuery('');
        setSelectedTask(null);
        setTaskDetail(null);
        setSelectedOperator('');
        setActiveTab('new');
        setNewTasks([]);
        setAssignedTasks([]);
        setNewPage(1);
        setAssignedPage(1);
        setHasMoreNew(true);
        setHasMoreAssigned(true);
    };

    const initialFetch = async (query: string = '') => {
        setLoading(true);
        setError(null);
        setNewPage(1);
        setAssignedPage(1);
        setHasMoreNew(true);
        setHasMoreAssigned(true);

        try {
            const [newRes, assignedRes] = await Promise.all([
                yardApi.getNewTaskAssignmentShipments({ searchText: query, pageNum: 1 }),
                yardApi.getAssignedTaskAssignmentShipments({ searchText: query, pageNum: 1 })
            ]);

            if (newRes.shipments && Array.isArray(newRes.shipments)) {
                setNewTasks(newRes.shipments);
                if (newRes.shipments.length < 10) setHasMoreNew(false);
            } else {
                setNewTasks([]);
                setHasMoreNew(false);
            }

            if (assignedRes.shipments && Array.isArray(assignedRes.shipments)) {
                setAssignedTasks(assignedRes.shipments);
                if (assignedRes.shipments.length < 10) setHasMoreAssigned(false);
            } else {
                setAssignedTasks([]);
                setHasMoreAssigned(false);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setError('Failed to load tasks. Please try again.');
            showToast('Failed to fetch tasks', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchMoreTasks = async () => {
        if (loadingMore) return;

        const isNew = activeTab === 'new';
        if (isNew && !hasMoreNew) return;
        if (!isNew && !hasMoreAssigned) return;

        setLoadingMore(true);
        const nextPage = isNew ? newPage + 1 : assignedPage + 1;

        try {
            const res = isNew
                ? await yardApi.getNewTaskAssignmentShipments({ searchText: searchQuery, pageNum: nextPage })
                : await yardApi.getAssignedTaskAssignmentShipments({ searchText: searchQuery, pageNum: nextPage });

            if (res.shipments && Array.isArray(res.shipments) && res.shipments.length > 0) {
                if (isNew) {
                    setNewTasks(prev => [...prev, ...res.shipments]);
                    setNewPage(nextPage);
                    if (res.shipments.length < 10) setHasMoreNew(false);
                } else {
                    setAssignedTasks(prev => [...prev, ...res.shipments]);
                    setAssignedPage(nextPage);
                    if (res.shipments.length < 10) setHasMoreAssigned(false);
                }
            } else {
                if (isNew) setHasMoreNew(false);
                else setHasMoreAssigned(false);
            }
        } catch (error) {
            console.error('Error loading more tasks:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const fetchOperators = async (query: string = '') => {
        try {
            const res = await yardApi.getTaskAssignmentOperators(query);
            if (res.data) setOperators(res.data);
        } catch (error) {
            console.error('Error fetching operators:', error);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) initialFetch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleScroll = () => {
        if (!listRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            fetchMoreTasks();
        }
    };

    const handleSelectTask = async (task: TaskAssignmentShipment) => {
        setSelectedTask(task);
        setLoading(true);
        try {
            const res = await yardApi.getTaskAssignmentShipmentDetails(task.shipmentNumber);
            if (res.data) {
                setTaskDetail(res.data);
                const op = res.data.operator || '';
                setSelectedOperator(op);
                setInitialOperator(op);
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
            showToast('Failed to fetch task details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedTask || !selectedOperator) return;

        setAssigning(true);
        try {
            const res = await yardApi.assignTaskToOperator({
                shipment_nbr: selectedTask.shipmentNumber,
                operator: selectedOperator
            });

            if (res.responseCode === 200) {
                showToast(res.responseMessage || 'Task assigned successfully', 'success');
                setSelectedTask(null);
                setTaskDetail(null);
                setSelectedOperator('');
                initialFetch(searchQuery);
            } else {
                showToast(res.responseMessage || 'Failed to assign task', 'error');
            }
        } catch (error) {
            console.error('Error assigning task:', error);
            showToast('An unexpected error occurred', 'error');
        } finally {
            setAssigning(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateString;
        }
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#94a3b8',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    };


    const renderTaskList = (tasks: TaskAssignmentShipment[]) => {
        if (loading && tasks.length === 0) {
            return <CFSTaskLoader />;
        }

        if (error) {
            return (
                <PremiumStateView
                    type="error"
                    title="Unable to Load Tasks"
                    description={error}
                    height={300}
                    action={{
                        label: "Retry",
                        onClick: () => initialFetch(searchQuery)
                    }}
                />
            );
        }

        if (tasks.length === 0) {
            return (
                <PremiumStateView
                    type="empty"
                    title="No Tasks Found"
                    description={searchQuery ? `No tasks found matching "${searchQuery}"` : "There are no tasks available at this time."}
                    icon={Search}
                    height={300}
                    action={searchQuery ? {
                        label: "Clear Search",
                        onClick: () => setSearchQuery('')
                    } : undefined}
                />
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '20px' }}>
                {tasks.map((task, idx) => (
                    <div
                        key={`${task.shipmentNumber || 'no-sn'}-${idx}`}
                        onClick={() => handleSelectTask(task)}
                        style={{
                            background: theme.white,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '18px',
                            padding: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: theme.shadow
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = theme.secondary;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = theme.border;
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{
                            width: '4px',
                            height: '38px',
                            background: activeTab === 'new' ? '#3b82f6' : '#10b981',
                            borderRadius: '3px'
                        }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 800, color: theme.textDark, fontSize: '14px' }}>
                                    {task.shipmentNumber}
                                </span>
                                <span style={{
                                    fontSize: '9px',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: activeTab === 'new' ? 'rgba(59, 130, 246, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                                    color: activeTab === 'new' ? '#2563eb' : '#059669',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                }}>
                                    {task.status}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: theme.textMuted, display: 'flex', flexDirection: 'column', gap: '1px', fontWeight: 500 }}>
                                <span>{task.shipmentName}</span>
                                {task.containerNumber && (
                                    <span style={{ color: theme.primary, fontWeight: 700 }}>
                                        {task.containerNumber}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderDetails = () => {
        if (loading && !taskDetail) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 className="animate-spin" size={32} color={theme.primary} />
                </div>
            );
        }

        const allItems = [
            { label: 'Container', val: taskDetail?.contNo || selectedTask?.containerNumber || '-', icon: Box },
            { label: 'Customer', val: taskDetail?.customer || selectedTask?.customer || '-', icon: UserCircle },
            { label: 'Status', val: taskDetail?.status || selectedTask?.status || '-', icon: CheckCircle2 },
            ...(taskDetail?.assignedDate
                ? [{ label: 'Assigned Date', val: formatDate(taskDetail.assignedDate), icon: Calendar }]
                : (selectedTask?.date ? [{ label: 'Date', val: selectedTask.date, icon: Calendar }] : []))
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <div style={{
                    background: theme.white,
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: `1px solid ${theme.border}` }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: theme.secondary + '15',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.secondary
                        }}>
                            <Layout size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: theme.textDark }}>
                                {selectedTask?.shipmentNumber}
                            </h3>
                            <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>
                                {selectedTask?.shipmentName}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {allItems.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.textMuted }}>
                                    <item.icon size={15} style={{ opacity: 0.7 }} />
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</span>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textDark }}>{item.val.toUpperCase()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '4px' }}>
                    <label style={labelStyle}>Assign To Operator</label>
                    <div style={{ position: 'relative' }}>
                        <div
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '0 14px',
                                background: theme.white,
                                border: `1px solid ${dropdownOpen ? theme.primary : theme.border}`,
                                height: '44px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            <User size={16} color={theme.primary} />
                            <span style={{
                                flex: 1,
                                fontSize: '14px',
                                fontWeight: 700,
                                color: selectedOperator ? theme.textDark : '#94a3b8'
                            }}>
                                {selectedOperator || 'Select Operator'}
                            </span>
                            <div style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'flex' }}>
                                <ChevronLeft size={14} color={theme.textMuted} style={{ transform: 'rotate(-90deg)' }} />
                            </div>
                        </div>

                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 6px)',
                                left: 0,
                                right: 0,
                                background: theme.white,
                                borderRadius: '14px',
                                boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
                                border: `1px solid ${theme.border}`,
                                zIndex: 100,
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }} className="custom-scrollbar">
                                {['Select Operator', ...operators].map((op, idx) => {
                                    const isDefault = op === 'Select Operator';
                                    const isSelected = op === selectedOperator;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                if (!isDefault) {
                                                    setSelectedOperator(op);
                                                } else {
                                                    setSelectedOperator('');
                                                }
                                                setDropdownOpen(false);
                                            }}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                background: isSelected ? theme.primary + '08' : 'transparent',
                                                color: isSelected ? theme.primary : (isDefault ? theme.textMuted : theme.textDark),
                                                fontSize: '13px',
                                                fontWeight: isSelected ? 800 : 700,
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                            onMouseEnter={e => {
                                                if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {!isDefault && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? theme.primary : theme.border }} />}
                                                {op}
                                            </div>
                                            {isSelected && <CheckCircle2 size={13} color={theme.primary} />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Overlay to close dropdown when clicking outside within the panel context */}
                        {dropdownOpen && (
                            <div
                                onClick={() => setDropdownOpen(false)}
                                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <PanelLayout
            title="Task Assignment"
            category="CFS OPERATION"
            isOpen={isOpen}
            onClose={onClose}
            headerActions={
                selectedTask ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(null);
                            setTaskDetail(null);
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
                        title={'Back to List'}
                    >
                        <ArrowLeft size={18} />
                    </button>
                ) : null
            }
            footerActions={
                selectedTask && selectedOperator !== initialOperator ? (
                    <button
                        onClick={handleAssign}
                        disabled={assigning}
                        style={{
                            width: '100%',
                            height: '56px',
                            borderRadius: '20px',
                            background: theme.white,
                            border: `1px solid ${theme.border}`,
                            color: theme.primary,
                            fontWeight: 700,
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {assigning ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <CheckCircle2 size={20} />
                                {activeTab === 'new' ? 'Assign Task' : 'Update Assignment'}
                            </>
                        )}
                    </button>
                ) : null
            }
        >
            {!selectedTask ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={22} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} />
                        <input
                            type="text"
                            placeholder="Search by shipment number..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="modern-input"
                            style={{
                                paddingLeft: '56px',
                                background: theme.white,
                                border: `1px solid ${theme.border}`,
                                height: '60px',
                                borderRadius: '18px',
                                fontSize: '15px'
                            }}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        background: 'rgba(255, 255, 255, 0.4)',
                        borderRadius: '18px',
                        padding: '5px',
                        border: `1px solid ${theme.border}`,
                        gap: '6px'
                    }}>
                        {[
                            { id: 'new', label: 'New', count: newTasks.length },
                            { id: 'assigned', label: 'Assigned', count: assignedTasks.length }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    background: activeTab === tab.id ? theme.secondary : 'transparent',
                                    color: activeTab === tab.id ? theme.primary : theme.textMuted,
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab.label}
                                <span style={{
                                    fontSize: '10px',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: activeTab === tab.id ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.04)',
                                    fontWeight: 700
                                }}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div
                        ref={listRef}
                        onScroll={handleScroll}
                        style={{
                            overflowY: 'auto',
                            maxHeight: 'calc(100vh - 360px)',
                            paddingRight: '6px'
                        }}
                        className="custom-scrollbar"
                    >
                        {activeTab === 'new' ? renderTaskList(newTasks) : renderTaskList(assignedTasks)}
                    </div>
                </div>
            ) : (
                renderDetails()
            )}
        </PanelLayout>
    );
}
