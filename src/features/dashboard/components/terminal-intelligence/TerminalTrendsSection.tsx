import { useState, useCallback, useEffect, useRef } from 'react';
import { Activity, ChevronDown } from 'lucide-react';
import { theme } from '../../../../themes/theme';
import { getOperationalMetrics } from '../../apis/dashboardApi';
import type { OperationalMetricsResponse } from '../../types/dashboardTypes';
import TerminalTransactionsChart, { type TransactionViewMode } from './charts/TerminalTransactionsChart';
import DateFilterDropdown, { getPresetDates, type DateFilterValue } from '../fleet-intelligence/metrics/shared/DateFilterDropdown';
import { getLocalDateString } from '../../../settings/utils/dateUtils';
import TrendLoader from '../../../../components/ui/feedback/dashboard/trends/TrendLoader';
import PremiumStateView from '../../../../components/ui/feedback/PremiumStateView';
import TrendErrorState from '../../../../components/ui/feedback/dashboard/trends/TrendErrorState';
import MetricCard from '../fleet-intelligence/MetricCard';

const getDefaultFilter = (): DateFilterValue => ({ type: 'preset', preset: 'last7' });

function getDatesFromFilter(filter: DateFilterValue): { startDate?: string; endDate?: string } {
    if (filter.type === 'preset' && filter.preset) {
        const { startDate, endDate } = getPresetDates(filter.preset);
        return { startDate, endDate };
    }
    if (filter.type === 'custom' && filter.startDate && filter.endDate) {
        return { startDate: filter.startDate, endDate: filter.endDate };
    }
    const today = getLocalDateString();
    return { startDate: today, endDate: today };
}

export default function TerminalTrendsSection() {
    const [viewMode, setViewMode] = useState<TransactionViewMode>('DAILY_TRANSACTIONS');
    const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultFilter());
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [data, setData] = useState<OperationalMetricsResponse['data'] | null>(null);

    const fetchTrends = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const { startDate, endDate } = getDatesFromFilter(dateFilter);
            const params: any = { fetch_mode: viewMode };

            if (viewMode === 'DAILY_TRANSACTIONS') {
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
            } else {
                params.year = year;
            }

            const response = await getOperationalMetrics(params);
            if (response) {
                setData(response);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error('Failed to fetch terminal trends', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [viewMode, dateFilter, year]);

    useEffect(() => {
        fetchTrends();
    }, [fetchTrends]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsYearDropdownOpen(false);
            }
        };
        if (isYearDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isYearDropdownOpen]);

    const activeData = viewMode === 'DAILY_TRANSACTIONS' ? data?.daily_transactions : data?.monthly_transactions;

    // Generate years from current year down to project start year (2026)
    const currentYearNum = new Date().getFullYear();
    const availableYears = Array.from(
        { length: Math.max(1, currentYearNum - 2026 + 1) },
        (_, i) => (currentYearNum - i).toString()
    );

    // Action controls to pass to MetricCard Header
    const cardAction = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            {/* View Mode Toggle */}
            <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '3px',
                gap: '2px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
                {(['DAILY_TRANSACTIONS', 'MONTHLY_TRANSACTIONS'] as TransactionViewMode[]).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        style={{
                            padding: '6px 14px',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: viewMode === mode ? '#FFFFFF' : 'transparent',
                            color: viewMode === mode ? theme.colors.primary : 'rgba(255, 255, 255, 0.7)',
                            boxShadow: viewMode === mode ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {mode === 'DAILY_TRANSACTIONS' ? 'Daily' : 'Monthly'}
                    </button>
                ))}
            </div>

            {/* Filter (Date vs Year) */}
            {viewMode === 'DAILY_TRANSACTIONS' ? (
                <div>
                    <DateFilterDropdown
                        value={dateFilter}
                        onChange={setDateFilter}
                        title="Select Date Range"
                        allowedPresets={['last7']}
                        maxDays={10}
                    />
                </div>
            ) : (
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                        style={{
                            padding: '4px 12px',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '16px',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        {year}
                        <ChevronDown
                            size={14}
                            style={{
                                transform: isYearDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                            }}
                        />
                    </button>

                    {isYearDropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '8px',
                            background: '#FFFFFF',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            border: '1px solid #E2E8F0',
                            overflow: 'hidden',
                            zIndex: 50,
                            minWidth: '100px',
                            animation: 'fadeDown 0.2s ease-out'
                        }}>
                            {availableYears.map((y) => (
                                <button
                                    key={y}
                                    onClick={() => {
                                        setYear(y);
                                        setIsYearDropdownOpen(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        border: 'none',
                                        background: year === y ? `${theme.colors.primary}10` : 'transparent',
                                        color: year === y ? theme.colors.primary : theme.colors.text.primary,
                                        fontSize: '12px',
                                        fontWeight: year === y ? 600 : 500,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (year !== y) e.currentTarget.style.background = '#F8FAFC';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (year !== y) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <>
            <MetricCard
                title="Transaction Trends"
                icon={Activity}
                width="60%"
                contentPadding="32px 20px"
                action={cardAction}
            >
                {/* Content Area */}
                <div style={{ height: '315px', width: '100%', position: 'relative' }}>
                    {error ? (
                        <PremiumStateView
                            type="error"
                            graphic={<TrendErrorState />}
                            title="Unable to Load Trends"
                            description="We encountered an issue fetching the transaction trends."
                            action={{ label: "Retry", onClick: fetchTrends }}
                            height="100%"
                        />
                    ) : loading ? (
                        <TrendLoader />
                    ) : (!activeData || activeData.length === 0) ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                            No transactions found for the selected period.
                        </div>
                    ) : (

                        <TerminalTransactionsChart data={activeData} viewMode={viewMode} />
                    )}
                </div>
            </MetricCard>
            <style>
                {`
                    @keyframes fadeDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </>
    );
}
