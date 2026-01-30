
import { Truck, type LucideIcon } from 'lucide-react';


interface MetricCardProps {
    title: string;
    icon?: LucideIcon;
    children?: React.ReactNode;
    action?: React.ReactNode;
    width?: string;
    contentPadding?: string;
}

export default function MetricCard({ title, icon: Icon = Truck, children, action, width = '460px', contentPadding = '32px 50px' }: MetricCardProps) {
    return (
        <div style={{
            width: width,
            borderRadius: '32px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            fontFamily: 'Inter, sans-serif',
            background: 'linear-gradient(135deg, #4B686C 0%, #3A5255 100%)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header Section */}
            <div style={{
                padding: '24px 32px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Icon on Left */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <Icon size={20} color="white" />
                    </div>

                    {/* Title */}
                    <span style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        letterSpacing: '0.01em',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {title}
                    </span>
                </div>

                {/* Header Action (Default to 'more', or custom) */}
                {action === undefined ? (
                    <button
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            padding: '6px 14px',
                            borderRadius: '50px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = '#FFFFFF';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        more {'>'}
                    </button>
                ) : (
                    action
                )}
            </div>

            {/* Body Section with Curved Top */}
            <div style={{
                background: '#FFFFFF',
                flex: 1,
                minHeight: '200px',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                padding: contentPadding,
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1
            }}>
                {children}
            </div>
        </div>
    );
}
