import type { LucideIcon } from 'lucide-react';

interface OperationalMetricChipProps {
    title: string;
    count: number;
    icon: LucideIcon;
    iconBgColor: string;
    iconColor: string;
}

export default function OperationalMetricChip({ title, count, icon: Icon, iconBgColor, iconColor }: OperationalMetricChipProps) {
    return (
        <div style={{
            background: `linear-gradient(135deg, #FFFFFF 0%, ${iconBgColor} 100%)`, // Premium white-to-tint gradient
            borderRadius: '20px', // Slightly softer corners
            padding: '20px',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.15), 0 4px 6px -4px rgba(75, 104, 108, 0.1)', // Smoother, lighter shadow
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            minWidth: '260px',
            flex: 1,
            border: '1px solid rgba(255, 255, 255, 0.6)', // Glassy border
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
        }}>
            {/* Background Illustration */}
            <Icon
                size={80}
                color={iconColor}
                style={{
                    position: 'absolute',
                    right: -10,
                    bottom: -15,
                    opacity: 0.1,
                    transform: 'rotate(-10deg)',
                    pointerEvents: 'none'
                }}
            />
            {/* Icon Circle */}
            <div style={{
                background: '#FFFFFF', // White background for contrast
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={24} color={iconColor} strokeWidth={2.5} />
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#0F172A', // Slate-900
                    lineHeight: 1
                }}>
                    {count.toLocaleString()}
                </span>
                <span style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#64748B', // Slate-500
                    whiteSpace: 'nowrap'
                }}>
                    {title}
                </span>
            </div>
        </div>
    );
}
