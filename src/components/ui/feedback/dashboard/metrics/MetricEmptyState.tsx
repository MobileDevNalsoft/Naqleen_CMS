

export default function MetricEmptyState() {
    return (
        <div style={{
            width: '120px',
            height: '120px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Empty Chart Ring */}
            <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '12px solid #F1F5F9', // Slate-100
                boxSizing: 'border-box',
                opacity: 0.8
            }} />

            {/* Inner dashed ring */}
            <div style={{
                position: 'absolute',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                border: '2px dashed #CBD5E1', // Slate-300
                opacity: 0.5
            }} />
        </div>
    );
}
