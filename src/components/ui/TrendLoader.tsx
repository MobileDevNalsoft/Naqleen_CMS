

export default function TrendLoader() {
    return (
        <div style={{
            width: '100%',
            height: '350px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '20px 0',
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            {/* Y-axis lines skeleton */}
            {[...Array(4)].map((_, i) => (
                <div key={`line-${i}`} style={{
                    position: 'absolute',
                    top: `${i * 25}%`,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: '#f1f5f9',
                    zIndex: 0
                }} />
            ))}

            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: '85%',
                padding: '0 20px',
                zIndex: 1
            }}>
                {/* Simulated Bars */}
                {[...Array(7)].map((_, i) => (
                    <div key={i} style={{
                        width: '8%',
                        height: `${Math.random() * 40 + 40}%`,
                        background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
                        borderRadius: '8px 8px 0 0',
                        animation: `pulse 1.5s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`
                    }} />
                ))}
            </div>

            {/* X-axis labels skeleton */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 20px 0',
                marginTop: '10px'
            }}>
                {[...Array(7)].map((_, i) => (
                    <div key={`label-${i}`} style={{
                        width: '40px',
                        height: '10px',
                        background: '#f1f5f9',
                        borderRadius: '4px',
                        animation: `pulse 1.5s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`
                    }} />
                ))}
            </div>

            <style>
                {`
                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }
                `}
            </style>
        </div>
    );
}
