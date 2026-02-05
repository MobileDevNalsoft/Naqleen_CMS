import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './OperationalMetricChip.module.css';

interface OperationalMetricChipProps {
    title: string;
    count: number;
    icon: LucideIcon;
    iconBgColor: string;
    iconColor: string;
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

export default function OperationalMetricChip({ title, count, icon: Icon, iconBgColor, iconColor }: OperationalMetricChipProps) {
    return (
        <motion.div
            className={styles.container}
            style={{
                background: `linear-gradient(135deg, #FFFFFF 0%, ${iconBgColor} 100%)`
            }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            {/* Background Illustration */}
            <Icon
                size={80}
                color={iconColor}
                className={styles.bgIcon}
            />
            {/* Icon Circle */}
            <motion.div
                className={styles.iconCircle}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <Icon size={24} color={iconColor} strokeWidth={2.5} />
            </motion.div>

            {/* Content */}
            <div className={styles.content}>
                <span className={styles.count}>
                    <AnimatedCounter value={count} />
                </span>
                <span className={styles.title}>
                    {title}
                </span>
            </div>
        </motion.div>
    );
}
