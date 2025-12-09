import { useState } from 'react';
import PanelLayout from './PanelLayout';
import { Truck, Box, FileText } from 'lucide-react';

interface GateOutPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GateOutPanel({ isOpen, onClose }: GateOutPanelProps) {
    const [truckNumber, setTruckNumber] = useState('');
    const [containerNumber, setContainerNumber] = useState('');
    const [remarks, setRemarks] = useState('');

    const handleGateOut = () => {
        console.log('Gate Out:', { truckNumber, containerNumber, remarks });
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
            title="Gate Out Entry"
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
                        onClick={handleGateOut}
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
                        Confirm Gate Out
                    </button>
                </>
            }
        >
            <div>
                <label style={labelStyle}>Truck Information</label>
                <div style={{ position: 'relative' }}>
                    <Truck size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                    <input
                        type="text"
                        placeholder="Enter Truck Number"
                        value={truckNumber}
                        onChange={(e) => setTruckNumber(e.target.value)}
                        className="modern-input"
                        style={{ paddingLeft: '48px' }} />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Container</label>
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
