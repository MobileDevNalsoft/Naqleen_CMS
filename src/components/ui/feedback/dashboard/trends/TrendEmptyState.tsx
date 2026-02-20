

export default function TrendEmptyState() {
    return (
        <div style={{
            width: '100%',
            height: '100px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: '8px',
            opacity: 0.6
        }}>
            {/* Fake empty bars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'flex-end', height: '60%' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{
                        width: '12px',
                        height: `${20 + (i % 3) * 10}%`,
                        background: '#F1F5F9', // Slate-100
                        borderRadius: '2px'
                    }} />
                ))}
            </div>
            {/* Base line */}
            <div style={{ width: '100%', height: '2px', background: '#E2E8F0' }} />
        </div>
    );
}
