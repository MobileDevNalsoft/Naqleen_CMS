import { AlertCircle, RefreshCw } from 'lucide-react';

interface PlugErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export default function PlugErrorState({
    title = "Unable to Load Data",
    message = "There was a problem connecting to the reefer system. Please check your connection and try again.",
    onRetry
}: PlugErrorStateProps) {
    return (
        <div style={{
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%)',
            borderRadius: '16px',
            margin: '8px 0',
            width: '100%',
            boxSizing: 'border-box',
            border: '1px solid rgba(239, 68, 68, 0.1)'
        }}>
            {/* Error Illustration */}
            <div style={{
                position: 'relative',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '50%',
                    filter: 'blur(10px)'
                }} />
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(254, 226, 226, 0.5) 0%, rgba(254, 202, 202, 0.5) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <AlertCircle size={32} color="#ef4444" strokeWidth={2.5} />
                </div>
            </div>

            {/* Text Content */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center'
            }}>
                <span style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#991b1b'
                }}>
                    {title}
                </span>
                <span style={{
                    fontSize: '13px',
                    color: '#b91c1c',
                    maxWidth: '240px',
                    lineHeight: 1.5,
                    opacity: 0.9
                }}>
                    {message}
                </span>
            </div>

            {/* Retry Action */}
            {onRetry && (
                <button
                    onClick={onRetry}
                    style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: 'white',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '10px',
                        color: '#dc2626',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.05)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.05)';
                    }}
                >
                    <RefreshCw size={14} />
                    Try Again
                </button>
            )}
        </div>
    );
}
