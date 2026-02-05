import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Users, Activity, TrendingUp } from 'lucide-react';
import MetricCard from './MetricCard';
import TruckUtilizationContent from './TruckUtilizationContent';
import DriverUtilizationContent from './DriverUtilizationContent';
import FleetEfficiencyContent from './FleetEfficiencyContent';
import TrucksTrendContent from './TrucksTrendContent';
import DriversTrendContent from './DriversTrendContent';
import DateFilterDropdown, { type DateFilterValue, getPresetDates } from './DateFilterDropdown';
import TrendsFilter from './TrendsFilter';
import OperationalMetricsRow from './OperationalMetricsRow';
import type { TrendViewMode, MetadataResponse } from '../../api/types/dashboardTypes';
import { getMetadata } from '../../api/handlers/dashboardApi';
import styles from './Dashboard.module.css';


// Default filter value
const getDefaultFilter = (): DateFilterValue => ({ type: 'preset', preset: 'yesterday' });

// Helper to extract dates from filter value
function getDatesFromFilter(filter: DateFilterValue): { date?: string; startDate?: string; endDate?: string } {
    if (filter.type === 'preset' && filter.preset) {
        const { startDate, endDate } = getPresetDates(filter.preset);
        // For single-day presets, use 'date'; for ranges, use 'startDate'/'endDate'
        if (startDate === endDate) {
            return { date: startDate };
        }
        return { startDate, endDate };
    }
    if (filter.type === 'custom' && filter.startDate && filter.endDate) {
        if (filter.startDate === filter.endDate) {
            return { date: filter.startDate };
        }
        return { startDate: filter.startDate, endDate: filter.endDate };
    }
    // Fallback to today
    const today = new Date().toISOString().split('T')[0];
    return { date: today };
}

// Entrance variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring" as const,
            stiffness: 80,
            damping: 15
        }
    }
};

export default function Dashboard() {
    // Date filter states using new component
    const [trucksFilter, setTrucksFilter] = useState<DateFilterValue>(getDefaultFilter());
    const [driversFilter, setDriversFilter] = useState<DateFilterValue>(getDefaultFilter());
    const [efficiencyFilter, setEfficiencyFilter] = useState<DateFilterValue>(getDefaultFilter());

    // Trend view modes
    const [trucksTrendView, setTrucksTrendView] = useState<TrendViewMode>('DAILY');
    const [driversTrendView, setDriversTrendView] = useState<TrendViewMode>('DAILY');

    // Metadata for min dates
    const [metadata, setMetadata] = useState<MetadataResponse | null>(null);

    // Fetch metadata on mount
    useEffect(() => {
        getMetadata().then(setMetadata).catch(console.error);
    }, []);

    // Get dates for each card
    const trucksDates = getDatesFromFilter(trucksFilter);
    const driversDates = getDatesFromFilter(driversFilter);
    const efficiencyDates = getDatesFromFilter(efficiencyFilter);

    // Use the earlier of the two min dates for efficiency (which uses both)
    const efficiencyMinDate = metadata?.vehicleMinDate && metadata?.driverMinDate
        ? (metadata.vehicleMinDate < metadata.driverMinDate ? metadata.vehicleMinDate : metadata.driverMinDate)
        : metadata?.vehicleMinDate || metadata?.driverMinDate || undefined;

    return (
        <motion.div
            className={styles.container}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Terminal Intelligence Header */}
            <motion.div className={styles.sectionHeader} variants={itemVariants}>
                <div className={styles.separator} />
                <h2 className={styles.title}>Terminal Intelligence</h2>
                <div className={styles.separator} />
            </motion.div>

            {/* Terminal Intelligence Content */}
            <motion.div variants={itemVariants}>
                <OperationalMetricsRow />
            </motion.div>

            {/* Fleet Intelligence Header */}
            <motion.div className={styles.sectionHeader} variants={itemVariants}>
                <div className={styles.separator} />
                <h2 className={styles.title}>Fleet Intelligence</h2>
                <div className={styles.separator} />
            </motion.div>

            {/* Top Row: Summary Cards */}
            <div className={styles.summaryGrid}>
                {/* Truck Summary Card */}
                <motion.div variants={itemVariants}>
                    <MetricCard
                        title="Truck Summary"
                        icon={Truck}
                        width="100%"
                        action={
                            <DateFilterDropdown
                                title="Truck Summary"
                                value={trucksFilter}
                                onChange={setTrucksFilter}
                                minDate={metadata?.vehicleMinDate || undefined}
                            />
                        }
                    >
                        <TruckUtilizationContent
                            date={trucksDates.date}
                            startDate={trucksDates.startDate}
                            endDate={trucksDates.endDate}
                        />
                    </MetricCard>
                </motion.div>

                {/* Driver Summary Card */}
                <motion.div variants={itemVariants}>
                    <MetricCard
                        title="Drivers Summary"
                        icon={Users}
                        width="100%"
                        action={
                            <DateFilterDropdown
                                title="Drivers Summary"
                                value={driversFilter}
                                onChange={setDriversFilter}
                                minDate={metadata?.driverMinDate || undefined}
                            />
                        }
                    >
                        <DriverUtilizationContent
                            date={driversDates.date}
                            startDate={driversDates.startDate}
                            endDate={driversDates.endDate}
                        />
                    </MetricCard>
                </motion.div>

                {/* Fleet Efficiency Card */}
                <motion.div variants={itemVariants}>
                    <MetricCard
                        title="Fleet Efficiency"
                        icon={Activity}
                        width="100%"
                        action={
                            <DateFilterDropdown
                                title="Fleet Efficiency"
                                value={efficiencyFilter}
                                onChange={setEfficiencyFilter}
                                minDate={efficiencyMinDate}
                            />
                        }
                    >
                        <FleetEfficiencyContent
                            date={efficiencyDates.date}
                            startDate={efficiencyDates.startDate}
                            endDate={efficiencyDates.endDate}
                        />
                    </MetricCard>
                </motion.div>
            </div>

            {/* Bottom Row: Trend Charts - Full width, 2 columns */}
            <div className={styles.trendGrid}>
                {/* Trucks Trend */}
                <motion.div variants={itemVariants}>
                    <MetricCard
                        title="Trucks Trend"
                        icon={TrendingUp}
                        width="100%"
                        contentPadding="32px 20px"
                        action={
                            <TrendsFilter
                                viewMode={trucksTrendView}
                                onViewModeChange={setTrucksTrendView}
                            />
                        }
                    >
                        <TrucksTrendContent viewMode={trucksTrendView} />
                    </MetricCard>
                </motion.div>

                {/* Drivers Trend */}
                <motion.div variants={itemVariants}>
                    <MetricCard
                        title="Drivers Trend"
                        icon={TrendingUp}
                        width="100%"
                        contentPadding="32px 20px"
                        action={
                            <TrendsFilter
                                viewMode={driversTrendView}
                                onViewModeChange={setDriversTrendView}
                            />
                        }
                    >
                        <DriversTrendContent viewMode={driversTrendView} />
                    </MetricCard>
                </motion.div>
            </div>
        </motion.div>
    );
}
