import { Truck, LogOut, Package, Grid, PackageX, Warehouse } from 'lucide-react';
import OperationalMetricChip from './OperationalMetricChip';
import type { OperationalMetricsResponse } from '../../../types/dashboardTypes';
import { theme } from '../../../../../themes/theme';

import styles from '../css/OperationalMetricsRow.module.css';

// Configuration for the metric cards
const METRIC_CONFIG = [
    {
        id: 'trucks_in_yard',
        title: "Trucks in Yard",
        icon: Truck,
        iconBgColor: `${theme.colors.info}1a`,
        iconColor: theme.colors.info
    },
    {
        id: 'gate_in_no_gate_out',
        title: "Awaiting Gate Out",
        icon: LogOut,
        iconBgColor: `${theme.colors.error}1a`,
        iconColor: theme.colors.error
    },
    {
        id: 'containers_in_terminal',
        title: "Containers in Terminal",
        icon: Package,
        iconBgColor: `${theme.colors.success}1a`,
        iconColor: theme.colors.success
    },
    {
        id: 'empty_slots',
        title: "Empty Slots",
        icon: Grid,
        iconBgColor: `${theme.colors.purple}1a`,
        iconColor: theme.colors.purple
    },
    {
        id: 'invalid_containers',
        title: "Invalid Containers",
        icon: PackageX,
        iconBgColor: `rgba(196, 133, 26, 0.1)`, // Manually convert #c4851a to rgba so transparency works
        iconColor: theme.colors.warning
    },
    {
        id: 'cfs_containers',
        title: "CFS Containers",
        icon: Warehouse,
        iconBgColor: '#6366f11a',
        iconColor: '#6366F1'
    }
] as const;

interface OperationalMetricsRowProps {
    metrics: OperationalMetricsResponse['data'] | null;
    state: 'loading' | 'error' | 'default';
}

export default function OperationalMetricsRow({ metrics, state }: OperationalMetricsRowProps) {
    return (
        <div className={styles.container}>
            {METRIC_CONFIG.map((config) => (
                <OperationalMetricChip
                    key={config.id}
                    title={config.title}
                    count={metrics ? (metrics[config.id as keyof typeof metrics] as number) : 0}
                    icon={config.icon}
                    iconBgColor={config.iconBgColor}
                    iconColor={config.iconColor}
                    state={state}
                />
            ))}
        </div>
    );
}
