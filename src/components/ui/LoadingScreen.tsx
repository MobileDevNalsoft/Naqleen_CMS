import { useState, useEffect } from 'react';

interface LoadingScreenProps {
    isLoading: boolean;
    onComplete: () => void;
}

export default function LoadingScreen({ isLoading, onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let timer: any;

        if (isLoading) {
            // Normal loading phase - slow increment up to 90%
            timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return 90; // Stall at 90% while waiting for data
                    // Random increment between 1 and 3
                    const increment = Math.floor(Math.random() * 3) + 1;
                    return Math.min(prev + increment, 90);
                });
            }, 100);
        } else {
            // Completion phase - fast increment to 100%
            timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(timer);
                        setTimeout(onComplete, 500); // Small delay before unmounting
                        return 100;
                    }
                    return Math.min(prev + 5, 100); // Fast finish
                });
            }, 20);
        }

        return () => clearInterval(timer);
    }, [isLoading, onComplete]);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#4B686C', // Solid primary color
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid rgba(255, 255, 255, 0.1)',
                borderTop: '4px solid var(--secondary-color)', // Blue
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '20px'
            }} />
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px' }}>NAQLEEN ICD</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '10px' }}>Building 3D Layout... {progress}%</p>

            {/* Progress Bar */}
            <div style={{
                width: '200px',
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                marginTop: '15px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: 'var(--secondary-color)',
                    transition: 'width 0.1s ease-out'
                }} />
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
