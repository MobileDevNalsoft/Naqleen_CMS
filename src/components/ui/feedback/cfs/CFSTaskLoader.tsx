import { motion } from 'framer-motion';

const CFSTaskLoader = () => {
    // Generate 5 skeleton cards
    const skeletonCards = Array(5).fill(0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', paddingBottom: '20px' }}>
            {skeletonCards.map((_, index) => (
                <div
                    key={index}
                    style={{
                        background: '#ffffff',
                        border: '1px solid rgba(75, 104, 108, 0.08)',
                        borderRadius: '18px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Shimmer Overlay */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                            zIndex: 1
                        }}
                        animate={{
                            translateX: ['-100%', '100%']
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            ease: 'linear'
                        }}
                    />

                    {/* Left Border Strip Skeleton - Matches 4px width, 38px height */}
                    <div style={{
                        width: '4px',
                        height: '38px',
                        background: '#f1f5f9',
                        borderRadius: '3px',
                        flexShrink: 0
                    }} />

                    {/* Content Skeleton */}
                    <div style={{ flex: 1 }}>
                        {/* Top Row: Shipment # and Status - Matches marginBottom: '4px' */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            {/* Shipment Number - Matches fontSize: '14px' */}
                            <div style={{
                                width: '100px',
                                height: '14px',
                                background: '#f1f5f9',
                                borderRadius: '4px'
                            }} />

                            {/* Status Badge - Matches fontSize: '9px', padding: '2px 8px' -> approx 16px total height */}
                            <div style={{
                                width: '50px',
                                height: '16px',
                                background: '#f1f5f9',
                                borderRadius: '6px'
                            }} />
                        </div>

                        {/* Bottom Section: Details - Matches flexDirection: 'column', gap: '1px' */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {/* Shipment Name - Matches fontSize: '12px' */}
                            <div style={{
                                width: '140px',
                                height: '10px',
                                background: '#f1f5f9',
                                borderRadius: '3px'
                            }} />

                            {/* Container Number - Matches fontSize: '12px' */}
                            <div style={{
                                width: '90px',
                                height: '10px',
                                background: '#f1f5f9',
                                borderRadius: '3px'
                            }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CFSTaskLoader;
