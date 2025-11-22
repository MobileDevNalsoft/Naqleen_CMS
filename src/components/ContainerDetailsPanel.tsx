import React, { useEffect, useState } from 'react';
import { Truck, MapPin, Box, Activity, Clock, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../store/store';

export default function ContainerDetailsPanel() {
    const selectId = useStore(state => state.selectId);
    const entities = useStore(state => state.entities);
    const setSelectId = useStore(state => state.setSelectId);

    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    const selectedContainer = selectId ? entities[selectId] : null;

    useEffect(() => {
        if (selectId) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [selectId]);

    if (!selectId && !isVisible) return null;

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setSelectId(null);
            // Dispatch event to reset camera
            window.dispatchEvent(new CustomEvent('resetCameraToInitial'));
        }, 300);
    };

    // Mock data for demonstration
    const containerData = {
        id: selectId,
        type: selectedContainer?.type || '40ft Standard',
        status: 'In Yard',
        arrival: '2023-10-24 08:30 AM',
        origin: 'Singapore',
        destination: 'Riyadh',
        weight: '24,500 kg',
        contents: 'Electronics',
        shippingLine: 'Maersk',
        vessel: 'MV OCEAN GIANT'
    };

    return (
        <div
            className={`container-details-panel ${isVisible ? 'visible' : ''}`}
            style={{
                position: 'fixed',
                top: '80px', // Below header
                right: '20px',
                width: '380px',
                maxHeight: 'calc(100vh - 100px)',
                backgroundColor: 'rgba(15, 23, 42, 0.85)', // Dark glass
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                transform: isVisible ? 'translateX(0)' : 'translateX(400px)',
                opacity: isVisible ? 1 : 0,
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)'
            }}>
                <div>
                    <div style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600,
                        marginBottom: '4px'
                    }}>
                        Container Details
                    </div>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        margin: 0,
                        background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {selectId}
                    </h2>
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
                        margin: '0'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
                        <path d="M2 2L14 14M14 2L2 14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {/* Status Bar */}
            <div style={{
                padding: '12px 20px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <CheckCircle size={16} color="#10b981" />
                <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
                    Status: {containerData.status}
                </span>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0 10px'
            }}>
                {['details', 'history', 'cargo'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '12px 16px',
                            color: activeTab === tab ? '#60a5fa' : '#94a3b8',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            borderBottom: activeTab === tab ? '2px solid #60a5fa' : '2px solid transparent',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                {activeTab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <InfoRow icon={<Box size={16} />} label="Type" value={containerData.type} />
                        <InfoRow icon={<MapPin size={16} />} label="Location" value={`Block A, Row 3, Tier 2`} />
                        <InfoRow icon={<Truck size={16} />} label="Shipping Line" value={containerData.shippingLine} />
                        <InfoRow icon={<Activity size={16} />} label="Weight" value={containerData.weight} />
                        <InfoRow icon={<Clock size={16} />} label="Arrival" value={containerData.arrival} />
                    </div>
                )}

                {activeTab === 'history' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <HistoryItem
                            action="Gate In"
                            time="2 hours ago"
                            details="Truck 4582 via Gate 1"
                        />
                        <HistoryItem
                            action="Inspection"
                            time="1 hour ago"
                            details="Passed visual check"
                        />
                        <HistoryItem
                            action="Placed in Yard"
                            time="30 mins ago"
                            details="Moved to Block A by RTG-04"
                        />
                    </div>
                )}

                {activeTab === 'cargo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <InfoRow icon={<Box size={16} />} label="Contents" value={containerData.contents} />
                        <InfoRow icon={<FileText size={16} />} label="Bill of Lading" value="BOL-8829301" />
                        <div style={{
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#94a3b8',
                            lineHeight: '1.5'
                        }}>
                            Fragile electronics. Handle with care. Temperature control required (20°C).
                        </div>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div style={{
                padding: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.2)'
            }}>
                <ActionButton icon={<Truck size={16} />} label="Move" primary />
                <ActionButton icon={<FileText size={16} />} label="Inspect" />
                <ActionButton icon={<AlertCircle size={16} />} label="Hold" danger />
                <ActionButton icon={<Activity size={16} />} label="History" />
            </div>
        </div>
    );
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
            {icon}
            <span style={{ fontSize: '13px' }}>{label}</span>
        </div>
        <span style={{ color: 'white', fontWeight: 500, fontSize: '13px' }}>{value}</span>
    </div>
);

const HistoryItem = ({ action, time, details }: { action: string, time: string, details: string }) => (
    <div style={{
        paddingLeft: '12px',
        borderLeft: '2px solid #3b82f6',
        position: 'relative'
    }}>
        <div style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>{action}</div>
        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{details}</div>
        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{time}</div>
    </div>
);

const ActionButton = ({ icon, label, primary, danger }: { icon: React.ReactNode, label: string, primary?: boolean, danger?: boolean }) => {
    let bg = 'rgba(255, 255, 255, 0.05)';
    let color = 'white';
    let border = '1px solid rgba(255, 255, 255, 0.1)';

    if (primary) {
        bg = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        border = 'none';
    } else if (danger) {
        bg = 'rgba(239, 68, 68, 0.1)';
        color = '#ef4444';
        border = '1px solid rgba(239, 68, 68, 0.2)';
    }

    return (
        <button style={{
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
            cursor: 'pointer',
            transition: 'all 0.2s'
        }}
            onMouseEnter={e => {
                if (!primary && !danger) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
                if (!primary && !danger) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {icon}
            {label}
        </button>
    );
};
