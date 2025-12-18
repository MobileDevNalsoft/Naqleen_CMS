import { useState } from 'react';
import PanelLayout from '../PanelLayout';
import { Box, Thermometer, FileText, Power } from 'lucide-react';

interface PlugInOutPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PlugInOutPanel({ isOpen, onClose }: PlugInOutPanelProps) {
    const [containerNumber, setContainerNumber] = useState('');
    const [temperature, setTemperature] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isPlugged, setIsPlugged] = useState(false);

    const handleUpdateStatus = () => {
        console.log('Plug Status Updated:', { containerNumber, temperature, remarks, isPlugged });
        onClose();
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
            title="Plug In / Out"
            category="YARD OPERATION"
            isOpen={isOpen}
            onClose={onClose}
            footerActions={
                <button
                    onClick={handleUpdateStatus}
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
                    Update Status
                </button>
            }
        >
            <div>
                <label style={labelStyle}>Container No</label>
                <div style={{ position: 'relative' }}>
                    <Box size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                    <input
                        type="text"
                        placeholder="Container Number"
                        value={containerNumber}
                        onChange={(e) => setContainerNumber(e.target.value)}
                        className="modern-input"
                        style={{ paddingLeft: '48px' }} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Temperature (°C)</label>
                    <div style={{ position: 'relative' }}>
                        <Thermometer size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                        <input
                            type="number"
                            placeholder="-18.0"
                            value={temperature}
                            onChange={(e) => setTemperature(e.target.value)}
                            className="modern-input"
                            style={{ paddingLeft: '48px' }} />
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Status</label>
                    <button
                        onClick={() => setIsPlugged(!isPlugged)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: isPlugged
                                ? 'rgba(34, 197, 94, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                            border: isPlugged
                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                : '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            color: isPlugged ? '#15803d' : '#b91c1c',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Power size={18} />
                        {isPlugged ? 'PLUGGED' : 'UNPLUGGED'}
                    </button>
                </div>
            </div>

            <div>
                <label style={labelStyle}>Remarks</label>
                <div style={{ position: 'relative' }}>
                    <FileText size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#4B686C' }} />
                    <textarea
                        placeholder="Any additional notes..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="modern-input"
                        style={{ paddingLeft: '48px', minHeight: '80px', resize: 'vertical' }}
                    />
                </div>
            </div>
        </PanelLayout>
    );
}
