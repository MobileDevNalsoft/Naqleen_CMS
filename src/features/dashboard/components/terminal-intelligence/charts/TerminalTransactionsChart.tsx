import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DailyTransaction, MonthlyTransaction } from '../../../types/dashboardTypes';

export type TransactionViewMode = 'DAILY_TRANSACTIONS' | 'MONTHLY_TRANSACTIONS';

interface TerminalTransactionsChartProps {
    data: DailyTransaction[] | MonthlyTransaction[];
    viewMode: TransactionViewMode;
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
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#1E293B', fontWeight: 700 }}>
                    {label}
                </p>
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

export default function TerminalTransactionsChart({ data, viewMode }: TerminalTransactionsChartProps) {
    // Map the raw data to generic 'name' property for Recharts XAxis
    const chartData = data.map((item: any) => ({
        ...item,
        name: viewMode === 'DAILY_TRANSACTIONS' ? item.date : item.month
    }));

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', minWidth: 0, animation: 'fadeUp 0.5s ease-out', display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={100}>
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                    barGap={6}
                    barCategoryGap={viewMode === 'MONTHLY_TRANSACTIONS' ? "45%" : "30%"}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                        dataKey="name"
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
                    <Tooltip content={<CustomTooltip viewMode={viewMode} />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span style={{ color: '#475569', fontSize: '11px', fontWeight: 500 }}>{value}</span>}
                    />

                    <Bar
                        dataKey="stored_count"
                        name="Stored"
                        fill="#3B82F6" // Default blue
                        radius={[6, 6, 0, 0]}
                        animationDuration={800}
                        maxBarSize={16}
                    />
                    <Bar
                        dataKey="released_count"
                        name="Released"
                        fill="#F59E0B" // Amber matching others
                        radius={[6, 6, 0, 0]}
                        animationDuration={800}
                        animationBegin={150}
                        maxBarSize={16}
                    />
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
