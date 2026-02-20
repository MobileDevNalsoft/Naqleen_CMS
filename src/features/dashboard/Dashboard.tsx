import { useState, useEffect } from 'react';
import { Truck, Users, Activity, TrendingUp } from 'lucide-react';
import { getPresetDates, type DateFilterValue } from './components/fleet-intelligence/metrics/shared/DateFilterDropdown';
import { getMetadata } from './apis/dashboardApi';
import type { TrendViewMode, MetadataResponse } from './types/dashboardTypes';
import { theme } from '../../themes/theme';
import MetricCard from './components/fleet-intelligence/MetricCard';
import DriverUtilizationContent from './components/fleet-intelligence/metrics/content/DriverUtilizationContent';
import FleetEfficiencyContent from './components/fleet-intelligence/metrics/content/FleetEfficiencyContent';
import OperationalMetricsRow from './components/terminal-intelligence/metrics/OperationalMetricsRow';
import DriversTrendContent from './components/fleet-intelligence/trends/content/DriversTrendContent';
import TrendsFilter from './components/fleet-intelligence/trends/shared/TrendsFilter';
import TrucksTrendContent from './components/fleet-intelligence/trends/content/TrucksTrendContent';
import TruckUtilizationContent from './components/fleet-intelligence/metrics/content/TruckUtilizationContent';
import DateFilterDropdown from './components/fleet-intelligence/metrics/shared/DateFilterDropdown';
import { getLocalDateString } from '../settings/utils/dateUtils';


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
    const today = getLocalDateString();
    return { date: today };
}

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
        <div style={{
            width: '100%',
            minHeight: '100vh',
            background: theme.colors.background.primary,
            padding: '100px 40px 40px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px'
        }}>
            {/* Terminal Intelligence Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%' }}>
                <div style={{ flex: 1, height: '2px', borderBottom: `2px dotted ${theme.colors.primary}`, opacity: 0.3 }} />
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: theme.colors.primary }}>Terminal Intelligence</h2>
                <div style={{ flex: 1, height: '2px', borderBottom: `2px dotted ${theme.colors.primary}`, opacity: 0.3 }} />
            </div>

            {/* Terminal Intelligence Content */}
            <OperationalMetricsRow />

            {/* Fleet Intelligence Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%' }}>
                <div style={{ flex: 1, height: '2px', borderBottom: `2px dotted ${theme.colors.primary}`, opacity: 0.3 }} />
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: theme.colors.primary }}>Fleet Intelligence</h2>
                <div style={{ flex: 1, height: '2px', borderBottom: `2px dotted ${theme.colors.primary}`, opacity: 0.3 }} />
            </div>

            {/* Top Row: Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '24px',
                width: '100%'
            }}>
                {/* Truck Summary Card */}
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

                {/* Driver Summary Card */}
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

                {/* Fleet Efficiency Card */}
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
            </div>

            {/* Bottom Row: Trend Charts - Full width, 2 columns */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px',
                width: '100%'
            }}>
                {/* Trucks Trend */}
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

                {/* Drivers Trend */}
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
            </div>
        </div>
    );
}