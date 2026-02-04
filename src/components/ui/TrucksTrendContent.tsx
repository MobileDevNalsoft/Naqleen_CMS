import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getTrucksTrend } from '../../api/handlers/dashboardApi';
import type { TrucksTrendResponse, TrendViewMode } from '../../api/types/dashboardTypes';
import TrendLoader from './TrendLoader';
import { getTruckChartColor } from '../../utils/statusColors';

interface TrucksTrendContentProps {
    viewMode: TrendViewMode;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            }}>
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#1E293B', fontWeight: 700 }}>{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: entry.fill }} />
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                            {entry.name}: <span style={{ fontWeight: 700, color: '#1E293B' }}>{entry.value}</span>
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function TrucksTrendContent({ viewMode }: TrucksTrendContentProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TrucksTrendResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [animationKey, setAnimationKey] = useState(0);

    const fetchTrend = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getTrucksTrend(viewMode);
            setData(result);
            setAnimationKey(prev => prev + 1);
        } catch (err) {
            console.error("Failed to fetch trucks trend", err);
            setError("Failed to load trend data");
        } finally {
            setLoading(false);
        }
    }, [viewMode]);

    useEffect(() => {
        fetchTrend();
    }, [fetchTrend]);

    // Extract unique statuses and transform data for Recharts
    const { uniqueStatuses, chartData } = useMemo(() => {
        if (!data?.data) return { uniqueStatuses: [], chartData: [] };

        // Get all unique status names across all data points
        const statusSet = new Set<string>();
        data.data.forEach(point => {
            point.statuses.forEach(s => statusSet.add(s.status));
        });
        const uniqueStatuses = Array.from(statusSet);

        // Transform to flat structure for Recharts
        const chartData = data.data.map(point => {
            const obj: Record<string, any> = { label: point.label };
            point.statuses.forEach(s => {
                obj[s.status] = s.count;
            });
            return obj;
        });

        return { uniqueStatuses, chartData };
    }, [data]);

    if (error) {
        return <div style={{ color: '#EF4444', fontSize: '14px', padding: '20px', textAlign: 'center' }}>Error loading trend data</div>;
    }

    if (loading || !data) {
        return <TrendLoader />;
    }

    return (
        <div
            key={animationKey}
            style={{
                width: '100%',
                height: '350px',
                animation: 'fadeUp 0.5s ease-out'
            }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                    barGap={2}
                    barCategoryGap="20%"
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                        dy={8}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 10 }}
                        width={45}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span style={{ color: '#475569', fontSize: '11px', fontWeight: 500 }}>{value}</span>}
                    />

                    {/* Dynamically render bars based on unique statuses */}
                    {uniqueStatuses.map((status, index) => (
                        <Bar
                            key={status}
                            dataKey={status}
                            name={status}
                            fill={getTruckChartColor(index)}
                            radius={[8, 8, 0, 0]}
                            animationDuration={800}
                            animationBegin={index * 150}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>

            <style>
                {`
                    @keyframes fadeUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
}
