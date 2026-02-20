import React, { useState, useEffect, useCallback } from 'react';
import { getTrucksSummary } from '../../../../apis/dashboardApi';
import type { TrucksResponse } from '../../../../types/dashboardTypes';
import PremiumStateView from '../../../../../../components/ui/feedback/PremiumStateView';
import MetricLoader from '../../../../../../components/ui/feedback/dashboard/metrics/MetricLoader';
import MetricEmptyState from '../../../../../../components/ui/feedback/dashboard/metrics/MetricEmptyState';
import MetricErrorState from '../../../../../../components/ui/feedback/dashboard/metrics/MetricErrorState';
import { getTruckStatusColor, getStatusIndex } from '../../../../../../utils/statusColors';
import { useUIStore } from '../../../../../../store/uiStore';
import { theme } from '../../../../../../themes/theme';

interface TruckUtilizationContentProps {
    date?: string;
    startDate?: string;
    endDate?: string;
}

export default function TruckUtilizationContent({
    date,
    startDate,
    endDate
}: TruckUtilizationContentProps) {
    const { openDrillDown } = useUIStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<TrucksResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [animationKey, setAnimationKey] = useState(0);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTrucksSummary(date, startDate, endDate);
            setStats(data);
            setAnimationKey(prev => prev + 1);
        } catch (err) {
            console.error("Failed to fetch truck stats", err);
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [date, startDate, endDate]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (error) {
        return (
            <div style={{ height: '240px', width: '100%' }}>
                <PremiumStateView
                    type="error"
                    graphic={<MetricErrorState />}
                    title="Unable to Load Truck Data"
                    description="We encountered an issue fetching the latest truck summary stats."
                    action={{ label: "Retry Connection", onClick: fetchStats }}
                    height="100%"
                />
            </div>
        );
    }

    if (loading || !stats) {
        return (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <MetricLoader />
            </div>
        );
    }

    if ((!stats.statuses || stats.statuses.length === 0) && stats.total === 0) {
        return (
            <div style={{ height: '240px', width: '100%' }}>
                <PremiumStateView
                    type="empty"
                    graphic={<MetricEmptyState />}
                    title="No Trucks Data"
                    description="There is no trucks data available for the selected period."
                    height="100%"
                />
            </div>
        );
    }

    // Build chart data dynamically from API response
    const isRange = Boolean(startDate && endDate && startDate !== endDate);
    const labelSuffix = isRange ? ' (Avg)' : '';

    const data = (stats.statuses || []).map((item) => ({
        label: `${item.status}${labelSuffix}`,
        value: item.count,
        status: item.status,
        ...getTruckStatusColor(getStatusIndex(item.status))
    }));

    const total = stats.total;
    const size = 180;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;
    let currentOffset = 0;

    const handleDrillDown = (status: string) => {
        console.error('[TruckUtilization] handleDrillDown triggered for status:', status);
        openDrillDown({
            type: 'TRUCKS',
            status: status || 'ALL',
            title: status === 'ALL' || !status ? 'All Trucks' : `${status} Trucks`,
            date,
            startDate,
            endDate
        });
    };

    return (
        <>
            <div
                key={animationKey}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    height: '240px',
                    gap: '48px',
                    animation: 'truckFadeIn 0.5s ease-out'
                }}
            >
                {/* Donut Chart */}
                <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                        {data.map((item, index) => {
                            const percentage = total > 0 ? item.value / total : 0;
                            const dashArray = percentage * circumference;
                            const dashOffset = currentOffset;
                            currentOffset -= dashArray;
                            const gap = 28;
                            const adjustedDashArray = Math.max(0, dashArray - gap);

                            return (
                                <circle
                                    key={item.label}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="transparent"
                                    stroke={item.color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${adjustedDashArray} ${circumference - adjustedDashArray}`}
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="round"
                                    style={{
                                        transition: 'stroke-dasharray 1s ease-out',
                                        animation: `truckDrawStroke 1s ease-out backwards ${index * 0.2}s`
                                    }}
                                />
                            );
                        })}
                    </svg>

                    {/* Center */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '60%',
                        height: '60%',
                        borderRadius: '50%',
                        background: theme.colors.background.secondary,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08), inset 0 0 10px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'truckScaleIn 0.5s ease-out 0.3s backwards',
                        cursor: 'pointer'
                    }}
                        onClick={() => handleDrillDown('ALL')}
                    >
                        <span style={{ fontSize: '10px', color: theme.colors.text.secondary, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total</span>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: theme.colors.text.primary, lineHeight: '1.1', marginTop: '2px' }}>{total}</span>
                    </div>
                </div>

                {/* Legend */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto',
                    columnGap: '16px',
                    rowGap: '16px',
                    alignItems: 'center',
                    animation: 'truckSlideInRight 0.5s ease-out 0.2s backwards'
                }}>
                    {data.map((item) => (
                        <React.Fragment key={item.label}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    backgroundColor: item.color,
                                    boxShadow: `0 0 0 3px ${item.bgColor}`,
                                    flexShrink: 0
                                }} />
                                <span
                                    style={{ fontSize: '14px', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer' }}
                                    onClick={() => handleDrillDown(item.status)}
                                    className="hover:text-blue-600 transition-colors"
                                >
                                    {item.label}
                                </span>
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.text.primary, textAlign: 'right' }}>
                                {item.value}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                <style>
                    {`
                    @keyframes truckDrawStroke {
                        from { stroke-dasharray: 0 ${circumference}; }
                    }
                    @keyframes truckScaleIn {
                        from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    }
                    @keyframes truckSlideInRight {
                        from { transform: translateX(10px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes truckFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}
                </style>
            </div>
        </>
    );
}
