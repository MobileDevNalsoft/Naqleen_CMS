import { useState } from 'react';
import PanelLayout from './PanelLayout';
import { Truck, User, Box, FileText } from 'lucide-react';

interface GateInPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GateInPanel({ isOpen, onClose }: GateInPanelProps) {
    const [truckNumber, setTruckNumber] = useState('');
    const [driverName, setDriverName] = useState('');
    const [containerNumber, setContainerNumber] = useState('');
    const [remarks, setRemarks] = useState('');

    const handleGateIn = () => {
        console.log('Gate In:', { truckNumber, driverName, containerNumber, remarks });
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
            title="Gate In Entry"
            category="GATE OPERATION"
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
                        onClick={handleGateIn}
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
                        Confirm Gate In
                    </button>
                </>
            }
        >
            <div>
                <label style={labelStyle}>Truck Information</label>
                <div style={{ position: 'relative' }}>
                    <Truck size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#4B686C' }} />
                    <input
                        type="text"
                        placeholder="Enter Truck Number"
                        value={truckNumber}
                        onChange={(e) => setTruckNumber(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '44px' }}
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Driver Details</label>
                <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#4B686C' }} />
                    <input
                        type="text"
                        placeholder="Driver Name"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '44px' }}
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Container</label>
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
                <label style={labelStyle}>Remarks</label>
                <div style={{ position: 'relative' }}>
                    <FileText size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#4B686C' }} />
                    <textarea
                        placeholder="Any additional notes..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '44px', minHeight: '80px', resize: 'vertical' }}
                    />
                </div>
            </div>
        </PanelLayout>
    );
}
