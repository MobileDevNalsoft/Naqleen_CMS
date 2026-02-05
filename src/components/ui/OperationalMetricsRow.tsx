import { useState, useEffect } from 'react';
import { Truck, LogOut, Package, Grid } from 'lucide-react';
import OperationalMetricChip from './OperationalMetricChip';
import { getOperationalMetrics } from '../../api/handlers/dashboardApi';
import type { OperationalMetricsResponse } from '../../api/types/dashboardTypes';

import styles from './OperationalMetricsRow.module.css';

export default function OperationalMetricsRow() {
    const [metrics, setMetrics] = useState<OperationalMetricsResponse['data'] | null>(null);

    useEffect(() => {
        getOperationalMetrics().then(setMetrics).catch(console.error);
    }, []);

    // Placeholder data while loading or if error
    const data = metrics || {
        trucks_in_yard: 0,
        gate_in_no_gate_out: 0,
        containers_in_terminal: 0,
        empty_slots: 0
    };

    return (
        <div className={styles.container}>
            <OperationalMetricChip
                title="Trucks in Yard"
                count={data.trucks_in_yard}
                icon={Truck}
                iconBgColor="#E0F2FE" // Light Blue
                iconColor="#0EA5E9"   // Sky 500
            />
            <OperationalMetricChip
                title="Awaiting Gate Out"
                count={data.gate_in_no_gate_out}
                icon={LogOut}
                iconBgColor="#FEE2E2" // Light Red
                iconColor="#EF4444"   // Red 500
            />
            <OperationalMetricChip
                title="Containers in Terminal"
                count={data.containers_in_terminal}
                icon={Package}
                iconBgColor="#DCFCE7" // Light Green
                iconColor="#22C55E"   // Green 500
            />
            <OperationalMetricChip
                title="Empty Slots"
                count={data.empty_slots}
                icon={Grid}
                iconBgColor="#F3E8FF" // Light Purple
                iconColor="#A855F7"   // Purple 500
            />
        </div>
    );
}
