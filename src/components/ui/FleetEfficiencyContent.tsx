import { useState, useEffect, useCallback } from 'react';
import { getEfficiency } from '../../api/handlers/dashboardApi';
import type { EfficiencyResponse } from '../../api/types/dashboardTypes';
import MetricLoader from './MetricLoader';

interface FleetEfficiencyContentProps {
    date?: string;
    startDate?: string;
    endDate?: string;
}

export default function FleetEfficiencyContent({
    date,
    startDate,
    endDate
}: FleetEfficiencyContentProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<EfficiencyResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [animationKey, setAnimationKey] = useState(0);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getEfficiency(date, startDate, endDate);
            setStats(data);
            setAnimationKey(prev => prev + 1);
        } catch (err) {
            console.error("Failed to fetch efficiency stats", err);
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [date, startDate, endDate]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (error) {
        return <div style={{ color: '#EF4444', fontSize: '14px', padding: '20px' }}>Error loading data</div>;
    }

    if (loading || !stats) {
        return <MetricLoader />;
    }

    const truckPct = stats.truckUtilization / 100;
    const driverPct = stats.driverUtilization / 100;
    const overallScore = Math.round(stats.overall);

    const isRange = Boolean(startDate && endDate && startDate !== endDate);
    const labelSuffix = isRange ? ' (Avg)' : '';

    const trucksData = { label: `Trucks Active${labelSuffix}`, color: '#2DB3AA', bgColor: '#D4F1EE' };
    const driversData = { label: `Drivers OnDuty${labelSuffix}`, color: '#5A7FD6', bgColor: '#DEE8F9' };

    const size = 180;
    const center = size / 2;
    const strokeWidth = 14;
    const radiusOuter = 76;
    const circumOuter = 2 * Math.PI * radiusOuter;
    const offsetOuter = circumOuter - (truckPct * circumOuter);
    const radiusInner = 54;
    const circumInner = 2 * Math.PI * radiusInner;
    const offsetInner = circumInner - (driverPct * circumInner);

    return (
        <div
            key={animationKey}
            style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                gap: '48px',
                animation: 'effFadeIn 0.5s ease-out'
            }}
        >
            {/* Concentric Chart */}
            <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                    {/* Outer Track */}
                    <circle cx={center} cy={center} r={radiusOuter} fill="transparent" stroke={trucksData.bgColor} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.4" />
                    <circle
                        cx={center} cy={center} r={radiusOuter}
                        fill="transparent"
                        stroke={trucksData.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumOuter} ${circumOuter}`}
                        strokeDashoffset={offsetOuter}
                        strokeLinecap="round"
                        style={{
                            transition: 'stroke-dashoffset 1s ease-out',
                            animation: 'effDrawOuter 1s ease-out'
                        }}
                    />

                    {/* Inner Track */}
                    <circle cx={center} cy={center} r={radiusInner} fill="transparent" stroke={driversData.bgColor} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.4" />
                    <circle
                        cx={center} cy={center} r={radiusInner}
                        fill="transparent"
                        stroke={driversData.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumInner} ${circumInner}`}
                        strokeDashoffset={offsetInner}
                        strokeLinecap="round"
                        style={{
                            transition: 'stroke-dashoffset 1s ease-out',
                            animation: 'effDrawInner 1s ease-out 0.2s backwards'
                        }}
                    />
                </svg>

                {/* Center */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '45%',
                    height: '45%',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    boxShadow: '0 0 16px rgba(0,0,0,0.05) inset',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'effScaleIn 0.5s ease-out 0.3s backwards'
                }}>
                    <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Score</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', lineHeight: '1.1' }}>{overallScore}</span>
                </div>
            </div>

            {/* Legend */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                flex: 1,
                animation: 'effSlideIn 0.5s ease-out 0.2s backwards'
            }}>
                {/* Truck Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>{trucksData.label}</span>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{
                            width: '40%',
                            height: '6px',
                            borderRadius: '4px',
                            background: trucksData.bgColor,
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${truckPct * 100}%`,
                                height: '100%',
                                background: trucksData.color,
                                borderRadius: '4px',
                                transition: 'width 1s ease-out'
                            }} />
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', lineHeight: '1' }}>
                            {Math.round(truckPct * 100)}%
                        </span>
                    </div>
                </div>

                {/* Driver Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>{driversData.label}</span>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{
                            width: '40%',
                            height: '6px',
                            borderRadius: '4px',
                            background: driversData.bgColor,
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${driverPct * 100}%`,
                                height: '100%',
                                background: driversData.color,
                                borderRadius: '4px',
                                transition: 'width 1s ease-out'
                            }} />
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', lineHeight: '1' }}>
                            {Math.round(driverPct * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            <style>
                {`
                    @keyframes effFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes effDrawOuter {
                        from { stroke-dashoffset: ${circumOuter}; }
                    }
                    @keyframes effDrawInner {
                        from { stroke-dashoffset: ${circumInner}; }
                    }
                    @keyframes effScaleIn {
                        from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    }
                    @keyframes effSlideIn {
                        from { transform: translateX(10px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
}
