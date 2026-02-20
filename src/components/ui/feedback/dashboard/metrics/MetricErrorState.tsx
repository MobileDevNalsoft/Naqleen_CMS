
import { AlertTriangle } from 'lucide-react';

export default function MetricErrorState() {
    return (
        <div style={{
            width: '120px',
            height: '120px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Error Chart Ring */}
            <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '8px solid #FEE2E2', // Red-100
                borderTopColor: '#FECACA', // Red-200
                borderRightColor: 'transparent', // Broken part
                boxSizing: 'border-box',
                transform: 'rotate(-45deg)'
            }} />

            {/* Warning Icon Center */}
            <div style={{
                position: 'absolute',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#FEF2F2', // Red-50
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
            }}>
                <AlertTriangle size={24} color="#EF4444" strokeWidth={2} />
            </div>
        </div>
    );
}
