import { useState, useEffect } from 'react';

interface LoadingScreenProps {
    isLoading: boolean;
    onComplete: () => void;
}

export default function LoadingScreen({ isLoading, onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        let timer: any;

        if (isLoading) {
            timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return 90;
                    const increment = Math.floor(Math.random() * 3) + 1;
                    return Math.min(prev + increment, 90);
                });
            }, 100);
        } else {
            timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(timer);
                        setIsExiting(true);
                        setTimeout(onComplete, 600);
                        return 100;
                    }
                    return Math.min(prev + 5, 100);
                });
            }, 20);
        }

        return () => clearInterval(timer);
    }, [isLoading, onComplete]);

    const fillHeight = progress;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#3A5255',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            overflow: 'hidden',
            opacity: isExiting ? 0 : 1,
            transition: 'opacity 0.5s ease-out',
        }}>
            {/* Rising Fill Container */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: `${fillHeight}%`,
                background: 'linear-gradient(to top, #4B686C 0%, #5A7A7E 60%, #6A8A8E 100%)',
                transition: 'height 0.2s ease-out',
                overflow: 'visible',
            }}>
                {/* SVG Wave at Top - Layer 1 (Back) */}
                {progress > 0 && progress < 100 && (
                    <svg
                        style={{
                            position: 'absolute',
                            top: '-25px',
                            left: 0,
                            width: '200%',
                            height: '30px',
                            animation: 'waveFlow1 4s linear infinite',
                        }}
                        viewBox="0 0 1200 30"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M0,15 C150,30 350,0 600,15 C850,30 1050,0 1200,15 L1200,30 L0,30 Z"
                            fill="rgba(90, 122, 126, 0.6)"
                        />
                    </svg>
                )}

                {/* SVG Wave at Top - Layer 2 (Middle) */}
                {progress > 0 && progress < 100 && (
                    <svg
                        style={{
                            position: 'absolute',
                            top: '-18px',
                            left: 0,
                            width: '200%',
                            height: '25px',
                            animation: 'waveFlow2 3s linear infinite',
                        }}
                        viewBox="0 0 1200 25"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M0,12 C100,22 300,2 500,12 C700,22 900,2 1100,12 L1200,12 L1200,25 L0,25 Z"
                            fill="rgba(106, 138, 142, 0.8)"
                        />
                    </svg>
                )}

                {/* SVG Wave at Top - Layer 3 (Front) */}
                {progress > 0 && progress < 100 && (
                    <svg
                        style={{
                            position: 'absolute',
                            top: '-12px',
                            left: 0,
                            width: '200%',
                            height: '20px',
                            animation: 'waveFlow3 2.5s linear infinite',
                        }}
                        viewBox="0 0 1200 20"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M0,10 C200,18 400,2 600,10 C800,18 1000,2 1200,10 L1200,20 L0,20 Z"
                            fill="#6A8A8E"
                        />
                    </svg>
                )}
            </div>

            {/* Subtle Warm Glow Accents */}
            <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute',
                    top: '20%',
                    right: '10%',
                    width: '180px',
                    height: '180px',
                    background: 'radial-gradient(circle, rgba(247, 207, 155, 0.12) 0%, transparent 60%)',
                    filter: 'blur(40px)',
                    animation: 'pulse 4s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '25%',
                    left: '5%',
                    width: '150px',
                    height: '150px',
                    background: 'radial-gradient(circle, rgba(247, 207, 155, 0.08) 0%, transparent 60%)',
                    filter: 'blur(50px)',
                    animation: 'pulse 5s ease-in-out infinite reverse',
                }} />
            </div>

            {/* Main Content */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: 'fadeIn 0.5s ease-out',
            }}>
                {/* Logo Ring */}
                <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px' }}>
                    <svg style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        animation: 'spin 2s linear infinite',
                    }} viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F7CF9B" />
                                <stop offset="100%" stopColor="#E5B070" stopOpacity="0.3" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ringGrad)" strokeWidth="2" strokeDasharray="70 220" strokeLinecap="round" />
                    </svg>

                    <div style={{
                        position: 'absolute',
                        inset: '10px',
                        borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#F7CF9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="#F7CF9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                            <path d="M2 12L12 17L22 12" stroke="#F7CF9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                        </svg>
                    </div>
                </div>

                {/* Brand */}
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'white',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    fontFamily: "'Inter', sans-serif",
                }}>Naqleen</h1>
                <p style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.2em',
                    color: '#F7CF9B',
                    textTransform: 'uppercase',
                    marginBottom: '32px',
                    opacity: 0.9,
                }}>Container Management</p>

                {/* Progress */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '36px', fontWeight: 300, color: 'white', fontFamily: 'monospace' }}>
                        {progress}<span style={{ fontSize: '18px', opacity: 0.6 }}>%</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {progress < 100 ? 'Building 3D Layout' : 'Complete'}
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes waveFlow1 {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes waveFlow2 {
                    0% { transform: translateX(-25%); }
                    100% { transform: translateX(-75%); }
                }
                @keyframes waveFlow3 {
                    0% { transform: translateX(-10%); }
                    100% { transform: translateX(-60%); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
