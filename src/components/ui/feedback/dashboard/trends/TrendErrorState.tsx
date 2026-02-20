
import { AlertTriangle } from 'lucide-react';

export default function TrendErrorState() {
    return (
        <div style={{
            width: '100%',
            height: '100px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#FEE2E2', // Red-100
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <AlertTriangle size={24} color="#EF4444" strokeWidth={2} />
            </div>

            {/* Glitch line effect */}
            <div style={{
                width: '60px',
                height: '2px',
                background: 'repeating-linear-gradient(90deg, #FEE2E2 0, #FEE2E2 4px, transparent 4px, transparent 8px)'
            }} />
        </div>
    );
}
