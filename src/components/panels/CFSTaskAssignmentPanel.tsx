import { useState } from 'react';
import PanelLayout from './PanelLayout';
import { ClipboardList, Box, User } from 'lucide-react';

interface CFSTaskAssignmentPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CFSTaskAssignmentPanel({ isOpen, onClose }: CFSTaskAssignmentPanelProps) {
    const [taskType, setTaskType] = useState('inspection');
    const [containerNumber, setContainerNumber] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [priority, setPriority] = useState('medium');

    const handleAssignTask = () => {
        console.log('Task Assigned:', { taskType, containerNumber, assignedTo, priority });
        onClose();
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        background: 'white',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        color: '#1e293b',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s',
        boxSizing: 'border-box' as const
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    };

    return (
        <PanelLayout
            title="CFS Task Assignment"
            category="CFS OPERATION"
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
                        onClick={handleAssignTask}
                        style={{
                            padding: '10px 24px',
                            background: 'var(--secondary-gradient)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'var(--primary-color)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(247, 207, 155, 0.3)',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(247, 207, 155, 0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(247, 207, 155, 0.3)';
                        }}
                    >
                        Assign Task
                    </button>
                </>
            }
        >
            <div>
                <label style={labelStyle}>Task Type</label>
                <div style={{ position: 'relative' }}>
                    <ClipboardList size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#4B686C' }} />
                    <select
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '44px', appearance: 'none', cursor: 'pointer' }}
                    >
                        <option value="inspection" style={{ color: 'black' }}>Inspection</option>
                        <option value="cleaning" style={{ color: 'black' }}>Cleaning</option>
                        <option value="repair" style={{ color: 'black' }}>Repair</option>
                        <option value="fumigation" style={{ color: 'black' }}>Fumigation</option>
                    </select>
                </div>
            </div>

            <div>
                <label style={labelStyle}>Container No</label>
                <div style={{ position: 'relative' }}>
                    <Box size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#4B686C' }} />
                    <input
                        type="text"
                        placeholder="Container Number"
                        value={containerNumber}
                        onChange={(e) => setContainerNumber(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '44px' }}
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Assign To</label>
                <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#4B686C' }} />
                    <input
                        type="text"
                        placeholder="Worker Name / ID"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '44px' }}
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Priority</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['low', 'medium', 'high'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPriority(p)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: priority === p ? 'rgba(75, 104, 108, 0.1)' : 'white',
                                border: priority === p ? '1px solid #4B686C' : '1px solid rgba(0, 0, 0, 0.1)',
                                borderRadius: '8px',
                                color: priority === p ? '#4B686C' : '#64748b',
                                fontSize: '13px',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        </PanelLayout>
    );
}
