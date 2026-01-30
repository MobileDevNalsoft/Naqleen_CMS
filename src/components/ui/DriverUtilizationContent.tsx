import React, { useState, useEffect, useCallback } from 'react';
import { getDriversSummary } from '../../api/handlers/dashboardApi';
import type { DriversResponse } from '../../api/types/dashboardTypes';
import MetricLoader from './MetricLoader';

interface DriverUtilizationContentProps {
    date?: string;
    startDate?: string;
    endDate?: string;
}

// Map frontend labels to API status values
const STATUS_MAP: Record<string, 'ACTIVE' | 'IDLE' | 'INACTIVE'> = {
    'OnDuty': 'ACTIVE',
    'Idle': 'IDLE'
};

import { useUIStore } from '../../store/uiStore';

export default function DriverUtilizationContent({
    date,
    startDate,
    endDate
}: DriverUtilizationContentProps) {
    const { openDrillDown } = useUIStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DriversResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [animationKey, setAnimationKey] = useState(0);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDriversSummary(date, startDate, endDate);
            setStats(data);
            setAnimationKey(prev => prev + 1);
        } catch (err) {
            console.error("Failed to fetch driver stats", err);
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

    const isRange = Boolean(startDate && endDate && startDate !== endDate);
    const labelSuffix = isRange ? ' (Avg)' : '';

    const data = [
        { label: `OnDuty${labelSuffix}`, value: stats.active, color: '#5A7FD6', bgColor: '#DEE8F9' },
        { label: `Idle${labelSuffix}`, value: stats.idle, color: '#E5AE56', bgColor: '#FAF0DA' },
    ];

    const total = stats.total;
    const size = 180;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;
    let currentOffset = 0;

    const handleDrillDown = (status: any) => {
        console.error('[DriverUtilization] handleDrillDown triggered for status:', status);
        openDrillDown({
            type: 'DRIVERS',
            status: status || 'ALL',
            title: status === 'ALL' || !status ? 'All Drivers' : `${status.charAt(0) + status.slice(1).toLowerCase()} Drivers`,
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
                    gap: '48px',
                    animation: 'fadeIn 0.5s ease-out'
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
                                        animation: `drawStroke 1s ease-out backwards ${index * 0.2}s`,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => handleDrillDown(STATUS_MAP[item.label.replace(/ \(Avg\)$/, '')])}
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
                        background: '#FFFFFF',
                        boxShadow: '0 0 16px rgba(0,0,0,0.05) inset',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'scaleIn 0.5s ease-out 0.3s backwards',
                        cursor: 'pointer'
                    }}
                        onClick={() => handleDrillDown('ALL')}
                    >
                        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total</span>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', lineHeight: '1.1', marginTop: '2px' }}>{total}</span>
                    </div>
                </div>

                {/* Legend */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto',
                    columnGap: '16px',
                    rowGap: '16px',
                    alignItems: 'center',
                    animation: 'slideInRight 0.5s ease-out 0.2s backwards'
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
                                    onClick={() => handleDrillDown(STATUS_MAP[item.label.replace(/ \(Avg\)$/, '')])}
                                    className="hover:text-blue-600 transition-colors"
                                >
                                    {item.label}
                                </span>
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B', textAlign: 'right' }}>
                                {item.value}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                <style>
                    {`
                    @keyframes drawStroke {
                        from { stroke-dasharray: 0 ${circumference}; }
                    }
                    @keyframes scaleIn {
                        from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    }
                    @keyframes slideInRight {
                        from { transform: translateX(10px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}
                </style>
            </div>
        </>
    );
}
