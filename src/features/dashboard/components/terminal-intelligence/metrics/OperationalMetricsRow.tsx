import { useState, useEffect } from 'react';
import { Truck, LogOut, Package, Grid } from 'lucide-react';
import OperationalMetricChip from './OperationalMetricChip';
import { getOperationalMetrics } from '../../../apis/dashboardApi';
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
    }
] as const;

export default function OperationalMetricsRow() {
    const [metrics, setMetrics] = useState<OperationalMetricsResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        setLoading(true);
        setError(false);
        getOperationalMetrics()
            .then(response => {
                if (response) {
                    setMetrics(response);
                } else {
                    setError(true);
                }
            })
            .catch((err) => {
                console.error(err);
                setError(true);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Determine the state to pass to chips
    const chipState = loading ? 'loading' : error ? 'error' : 'default';

    return (
        <div className={styles.container}>
            {METRIC_CONFIG.map((config) => (
                <OperationalMetricChip
                    key={config.id}
                    title={config.title}
                    count={metrics ? metrics[config.id as keyof typeof metrics] : 0}
                    icon={config.icon}
                    iconBgColor={config.iconBgColor}
                    iconColor={config.iconColor}
                    state={chipState}
                />
            ))}
        </div>
    );
}
