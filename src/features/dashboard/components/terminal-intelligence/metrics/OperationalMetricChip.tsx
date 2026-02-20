import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from '../css/OperationalMetricChip.module.css';
import { theme } from '../../../../../themes/theme';

interface OperationalMetricChipProps {
    title: string;
    count: number;
    icon: LucideIcon;
    iconBgColor: string;
    iconColor: string;
    state?: 'default' | 'loading' | 'error';
}

// Interpolated counter component
function AnimatedCounter({ value }: { value: number }) {
    const springValue = useSpring(value, {
        stiffness: 75,
        damping: 15,
        mass: 1
    });

    const displayValue = useTransform(springValue, (current) => Math.round(current).toLocaleString());

    useEffect(() => {
        springValue.set(value);
    }, [value, springValue]);

    return <motion.span>{displayValue}</motion.span>;
}

export default function OperationalMetricChip({
    title,
    count,
    icon: Icon,
    iconBgColor,
    iconColor,
    state = 'default'
}: OperationalMetricChipProps) {
    return (
        <motion.div
            className={styles.container}
            style={{
                background: `linear-gradient(135deg, ${theme.colors.background.secondary} 0%, ${iconBgColor} 100%)`,
                position: 'relative',
                overflow: 'hidden' // Ensure shimmer doesn't overflow
            }}
            whileHover={state === 'default' ? { scale: 1.02 } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            {/* Background Illustration */}
            <Icon
                size={80}
                color={iconColor}
                className={styles.bgIcon}
                style={{ opacity: state === 'loading' ? 0.1 : undefined }}
            />

            {/* Icon Circle */}
            <motion.div
                className={styles.iconCircle}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {state === 'loading' ? (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.05)' }} />
                ) : (
                    <Icon size={24} color={iconColor} strokeWidth={2.5} />
                )}
            </motion.div>

            {/* Content */}
            <div className={styles.content}>
                <span className={styles.count}>
                    {state === 'loading' ? (
                        <div style={{
                            width: '60px',
                            height: '32px',
                            background: 'rgba(0,0,0,0.05)',
                            borderRadius: '6px',
                            marginBottom: '4px'
                        }} className="animate-pulse" />
                    ) : state === 'error' ? (
                        <span style={{ color: theme.colors.error, fontSize: '24px' }}>--</span>
                    ) : (
                        <AnimatedCounter value={count} />
                    )}
                </span>
                <span className={styles.title}>
                    {title}
                </span>
            </div>

            {/* Loading Shimmer Overlay */}
            {state === 'loading' && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    transform: 'translateX(-100%)',
                    animation: 'shimmer 1.5s infinite',
                    pointerEvents: 'none'
                }} />
            )}

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </motion.div>
    );
}
