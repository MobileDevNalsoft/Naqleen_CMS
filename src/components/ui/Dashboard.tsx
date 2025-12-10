import { BarChart3, PieChart, Activity, Users, Box, TrendingUp } from 'lucide-react';

export default function Dashboard() {
    return (
        <div style={{
            width: '100%',
            minHeight: '100vh',
            background: '#F5F7F7',
            padding: '100px 40px 40px', // Top padding for header space
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
        }}>
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Operational Insights</h1>
                <p style={{ color: '#64748b', marginTop: '8px' }}>Real-time yard performance metrics and analytics</p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                <KpiCard title="Total Inventory" value="2,453" change="+12%" icon={<Box size={24} color="#3b82f6" />} />
                <KpiCard title="Gate Moves (Today)" value="342" change="-5%" icon={<Activity size={24} color="#10b981" />} />
                <KpiCard title="Pending Inspections" value="18" change="+2" icon={<Users size={24} color="#f59e0b" />} />
                <KpiCard title="Avg Turnaround Time" value="42m" change="-8%" icon={<TrendingUp size={24} color="#6366f1" />} />
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', flex: 1 }}>
                <ChartCard title="Container Throughput (Last 7 Days)">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', background: '#f8fafc', borderRadius: '12px' }}>
                        <BarChart3 size={48} color="#94a3b8" />
                        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Throughput Chart Visualization Placeholder</span>
                    </div>
                </ChartCard>
                <ChartCard title="Equipment Utilization">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', background: '#f8fafc', borderRadius: '12px' }}>
                        <PieChart size={48} color="#94a3b8" />
                        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Utilization Chart Visualization Placeholder</span>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}

function KpiCard({ title, value, change, icon }: { title: string, value: string, change: string, icon: any }) {
    const isPositive = change.startsWith('+');
    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '12px' }}>
                    {icon}
                </div>
                <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: isPositive ? '#10b981' : '#ef4444',
                    background: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '20px'
                }}>
                    {change}
                </span>
            </div>
            <div>
                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{title}</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{value}</div>
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string, children: any }) {
    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: 0 }}>{title}</h3>
            {children}
        </div>
    );
}
