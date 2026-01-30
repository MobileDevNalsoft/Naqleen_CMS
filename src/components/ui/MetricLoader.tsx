


export default function MetricLoader() {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '40px',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            {/* Chart Skeleton */}
            <div style={{
                position: 'relative',
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.08) 100%)',
                animation: 'spin 1.5s linear infinite',
                flexShrink: 0
            }}>
                {/* Inner cutout */}
                <div style={{
                    position: 'absolute',
                    top: '24px', // approx stroke width
                    left: '24px',
                    right: '24px',
                    bottom: '24px',
                    borderRadius: '50%',
                    background: '#FFFFFF'
                }} />
            </div>

            {/* Legend Skeleton */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                width: '120px'
            }}>
                {[1, 2, 3].map((i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: '#F1F5F9', // Slate-100
                            animation: 'pulse 2s infinite ease-in-out'
                        }} />
                        <div style={{
                            height: '14px', width: '60%',
                            background: '#F1F5F9',
                            borderRadius: '4px',
                            animation: `pulse 2s infinite ease-in-out ${i * 0.2}s`
                        }} />
                        <div style={{
                            height: '14px', width: '20%',
                            background: '#F1F5F9',
                            borderRadius: '4px',
                            marginLeft: 'auto',
                            animation: `pulse 2s infinite ease-in-out ${i * 0.2}s`
                        }} />
                    </div>
                ))}
            </div>

            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0% { opacity: 0.5; }
                        50% { opacity: 1; }
                        100% { opacity: 0.5; }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
}
