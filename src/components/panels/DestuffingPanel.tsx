import { useState } from 'react';
import PanelLayout from './PanelLayout';
import { Box, Lock, User, PackageOpen } from 'lucide-react';

interface DestuffingPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DestuffingPanel({ isOpen, onClose }: DestuffingPanelProps) {
    const [containerNumber, setContainerNumber] = useState('');
    const [sealNumber, setSealNumber] = useState('');
    const [customer, setCustomer] = useState('');

    // For destuffing, typically we might load items from the container manifest, 
    // but for this UI we'll just show a placeholder or basic inputs similar to stuffing
    // but focused on "what was taken out".

    const handleDestuffing = () => {
        console.log('Destuffing Assigned:', { containerNumber, sealNumber, customer });
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
            title="Assign Destuffing"
            category="YARD OPERATION"
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
                        onClick={handleDestuffing}
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
                        Assign Destuffing
                    </button>
                </>
            }
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                    <label style={labelStyle}>Container No</label>
                    <div style={{ position: 'relative' }}>
                        <Box size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                        <input
                            type="text"
                            placeholder="ABCD1234567"
                            value={containerNumber}
                            onChange={(e) => setContainerNumber(e.target.value)}
                            className="modern-input"
                            style={{ paddingLeft: '48px' }} />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Seal No</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                        <input
                            type="text"
                            placeholder="Seal Number"
                            value={sealNumber}
                            onChange={(e) => setSealNumber(e.target.value)}
                            className="modern-input"
                            style={{ paddingLeft: '48px' }} />
                    </div>
                </div>
            </div>

            <div>
                <label style={labelStyle}>Customer / Liner</label>
                <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                    <input
                        type="text"
                        placeholder="Select Customer"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        className="modern-input"
                        style={{ paddingLeft: '48px' }} />
                </div>
            </div>

            <div style={{
                padding: '20px',
                background: 'rgba(75, 104, 108, 0.05)',
                borderRadius: '16px',
                border: '1px dashed rgba(75, 104, 108, 0.2)',
                textAlign: 'center'
            }}>
                <PackageOpen size={32} color="#4B686C" style={{ marginBottom: '8px', opacity: 0.6 }} />
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Items will be verified against the manifest during destuffing.
                </div>
            </div>
        </PanelLayout>
    );
}
