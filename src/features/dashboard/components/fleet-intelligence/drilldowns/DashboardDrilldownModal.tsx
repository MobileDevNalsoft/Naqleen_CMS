import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Calendar,
    Truck,
    User,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Clock,
    LayoutList
} from 'lucide-react';
import type { DrillDownRow } from '../../../types/dashboardTypes';
import { useUIStore } from '../../../../../store/uiStore';
import { getDashboardDrilldown } from '../../../apis/dashboardApi';
import { getDriverStatusColor, getTruckStatusColor, getStatusIndex } from '../../../../../utils/statusColors';
import DrilldownLoader from '../../../../../components/ui/feedback/dashboard/drilldowns/DrilldownLoader';
import DrilldownEmpty from '../../../../../components/ui/feedback/dashboard/drilldowns/DrilldownEmpty';
import DrilldownError from '../../../../../components/ui/feedback/dashboard/drilldowns/DrilldownError';

import { useDebounce } from '../../../../../hooks/useDebounce';

type SortField = keyof DrillDownRow;
type SortDirection = 'asc' | 'desc' | null;

export const DashboardDrilldownModal: React.FC = () => {
    const { drillDown, closeDrillDown } = useUIStore();
    const { isOpen, type, status: initialStatus, title, date, startDate, endDate } = drillDown;

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DrillDownRow[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Debounce search query to avoid API spam (500ms delay)
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    // Sort state
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    // Derived state for date display
    const dateRangeDisplay = date
        ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : startDate && endDate
            ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'Today';

    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen) return;

            console.log('[DrillDownModal] Fetching data for:', { type, initialStatus, date, page, searchText: debouncedSearchQuery });
            setLoading(true);
            setError(null);
            try {
                const response = await getDashboardDrilldown({
                    type,
                    status: initialStatus,
                    date,
                    startDate,
                    endDate,
                    page,
                    pageSize: 12,
                    searchText: debouncedSearchQuery // Pass server-side search
                });

                if (response.response_code === 200) {
                    setData(response.data.rows);
                    setTotalPages(response.data.pagination.totalPages);
                    setTotalRows(response.data.pagination.totalRows);
                } else {
                    setError(response.response_message || 'Failed to fetch details');
                }
            } catch (err) {
                setError('An unexpected error occurred');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, type, initialStatus, date, startDate, endDate, page, debouncedSearchQuery]);

    // Reset page when search changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchQuery]);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
            setSearchQuery('');
            setSortField(null);
            setSortDirection(null);
        }
    }, [isOpen, type, initialStatus]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
            if (sortDirection === 'desc') setSortField(null);
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Client-side filtering removed as search is now server-side
    // Sorting remains client-side for the current page
    const sortedData = useMemo(() => {
        if (!sortField || !sortDirection) return data;
        const sorted = [...data].sort((a, b) => {
            const aVal = String(a[sortField] || '');
            const bVal = String(b[sortField] || '');
            const comparison = aVal.localeCompare(bVal);
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }, [data, sortField, sortDirection]);

    // Helper to determine status color configuration dynamically
    const getStatusConfig = (statusName: string, entityType: 'TRUCKS' | 'DRIVERS') => {
        if (!statusName || statusName === 'ALL') {
            return {
                color: '#64748B',
                bgColor: 'rgba(241, 245, 249, 0.5)',
                borderColor: '#E2E8F0',
                dotColor: '#94A3B8'
            };
        }

        // Use shared logic for index determination to match charts
        const index = getStatusIndex(statusName);

        const config = entityType === 'TRUCKS'
            ? getTruckStatusColor(index)
            : getDriverStatusColor(index);

        return {
            color: config.color, // Text/Dot color
            bgColor: config.bgColor, // Badge background (light)
            borderColor: config.bgColor.replace('0.2)', '0.3)'), // Subtle border
            dotColor: config.color
        };
    };

    const headerStatusConfig = getStatusConfig(initialStatus || 'ALL', type || 'TRUCKS');


    // Use Portal to escape any parent transform/z-index context
    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        overflow: 'hidden',
                        fontFamily: 'Inter, system-ui, sans-serif'
                    }}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeDrillDown}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 0
                        }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '1200px',
                            background: '#FFFFFF',
                            borderRadius: '32px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '90vh',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            zIndex: 10
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Premium Consolidated Header */}
                        <div style={{
                            padding: '20px 32px',
                            background: 'var(--primary-gradient)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            gap: '24px'
                        }}>
                            {/* Left Section: Icon + Title + Meta */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#FFFFFF',
                                    boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.2)'
                                }}>
                                    {type === 'TRUCKS' ? <Truck size={22} /> : <User size={22} />}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                                        {title}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        }}>
                                            <Calendar size={12} />
                                            <span>{dateRangeDisplay}</span>
                                        </div>

                                        <div style={{
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            background: initialStatus ? headerStatusConfig.bgColor : 'rgba(226, 232, 240, 0.2)',
                                            border: `1px solid ${initialStatus ? headerStatusConfig.color : '#E2E8F0'}`,
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            color: initialStatus ? headerStatusConfig.color : '#E2E8F0',
                                            opacity: initialStatus ? 1 : 0.8
                                        }}>
                                            {initialStatus}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            marginLeft: '4px',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            fontSize: '11px',
                                            color: 'rgba(255, 255, 255, 0.6)'
                                        }}>
                                            <Clock size={11} />
                                            <span>Real-time</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Section: Search + Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '150px' }}>
                                {/* Glass Search Input */}
                                <div style={{ position: 'relative', width: '320px' }}>
                                    <Search
                                        size={18}
                                        style={{
                                            position: 'absolute',
                                            left: '14px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'rgba(255, 255, 255, 0.7)'
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        style={{
                                            width: '100%',
                                            padding: '12px 38px 12px 42px',
                                            background: 'rgba(0, 0, 0, 0.15)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            color: '#FFFFFF',
                                            outline: 'none',
                                            transition: 'all 0.2s ease',
                                            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.background = 'rgba(0, 0, 0, 0.25)';
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.background = 'rgba(0, 0, 0, 0.15)';
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSearchQuery('');
                                            }}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: 'none',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                transition: 'all 0.2s ease',
                                                zIndex: 10
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                                                e.currentTarget.style.color = '#FFFFFF';
                                                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                                                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    <style>{`
                                        input::placeholder {
                                            color: rgba(255, 255, 255, 0.5);
                                        }
                                    `}</style>
                                </div>

                                <button
                                    onClick={closeDrillDown}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        padding: 0,
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        color: '#FFFFFF',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Table Container */}
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            padding: '0',
                            background: '#F8FAFC'
                        }}>
                            <div style={{
                                background: '#FFFFFF',
                                borderRadius: '0',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                                overflow: 'hidden'
                            }}>
                                {loading && data.length === 0 ? (
                                    <DrilldownLoader />
                                ) : error ? (
                                    <DrilldownError message={error} onRetry={() => setPage(page)} />
                                ) : sortedData.length === 0 ? (
                                    <DrilldownEmpty onClear={() => setSearchQuery('')} />
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                            <tr>
                                                {[
                                                    { label: 'Event Date', field: 'eventDate' },
                                                    { label: type === 'TRUCKS' ? 'Truck ID' : 'Driver ID', field: type === 'TRUCKS' ? 'truckId' : 'driverId' },
                                                    { label: 'Status', field: 'status' },
                                                    { label: type === 'TRUCKS' ? 'Driver' : 'Truck', field: type === 'TRUCKS' ? 'driverId' : 'truckId' },
                                                    { label: 'Equipment', field: 'equipment' }
                                                ].map((col) => (
                                                    <th
                                                        key={col.label}
                                                        onClick={() => col.field && handleSort(col.field as SortField)}
                                                        style={{
                                                            padding: '16px 24px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            color: '#64748B',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {col.label}
                                                            {sortField === col.field ? (
                                                                sortDirection === 'asc' ? <ChevronUp size={14} color="#2563EB" /> : <ChevronDown size={14} color="#2563EB" />
                                                            ) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedData.map((row, idx) => {
                                                const rowStatusConfig = getStatusConfig(row.status, type);
                                                return (
                                                    <tr key={`${row.truckId}-${row.driverId}-${idx}`} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                                                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#475569' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Clock size={14} style={{ opacity: 0.4 }} />
                                                                {row.eventDate}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px 24px' }}>
                                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', background: '#F1F5F9', padding: '4px 8px', borderRadius: '8px' }}>
                                                                {type === 'TRUCKS' ? row.truckId : row.driverId}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '16px 24px' }}>
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                padding: '4px 12px',
                                                                borderRadius: '100px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                background: rowStatusConfig.bgColor,
                                                                color: rowStatusConfig.color,
                                                                border: `1px solid ${rowStatusConfig.bgColor.replace('0.2', '0.4')}` // Fallback border logic
                                                            }}>
                                                                <div style={{
                                                                    width: '6px',
                                                                    height: '6px',
                                                                    borderRadius: '50%',
                                                                    background: rowStatusConfig.dotColor
                                                                }} />
                                                                {row.status}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#475569' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                                                    {type === 'TRUCKS' ? <User size={14} /> : <Truck size={14} />}
                                                                </div>
                                                                <span style={{ fontWeight: 500 }}>{type === 'TRUCKS' ? (row.driverId || 'Unassigned') : (row.truckId || 'None')}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px 24px' }}>
                                                            <div style={{ padding: '4px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace' }}>
                                                                <LayoutList size={12} />
                                                                {row.equipment || 'Standard'}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Pagination Footer - Compact & Premium */}
                        {totalRows > 0 && (
                            <div style={{
                                padding: '12px 24px',
                                borderTop: '1px solid #E2E8F0',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#64748B'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>Showing</span>
                                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{((page - 1) * 12) + 1}-{Math.min(page * 12, totalRows)}</span>
                                    <span>of</span>
                                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{totalRows}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1 || loading}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            border: '1px solid #E2E8F0',
                                            background: page === 1 ? '#F8FAFC' : '#FFFFFF',
                                            cursor: page === 1 ? 'not-allowed' : 'pointer',
                                            color: page === 1 ? '#94A3B8' : '#334155',
                                            transition: 'all 0.2s',
                                            padding: 0
                                        }}
                                        onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.borderColor = '#CBD5E1')}
                                        onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.borderColor = '#E2E8F0')}
                                    >
                                        <ChevronLeft size={14} />
                                    </button>

                                    <div style={{
                                        padding: '0 8px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#F1F5F9',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#475569',
                                        border: '1px solid #E2E8F0'
                                    }}>
                                        Page {page} of {totalPages}
                                    </div>

                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages || loading}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            border: '1px solid #E2E8F0',
                                            background: page === totalPages ? '#F8FAFC' : '#FFFFFF',
                                            cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                            color: page === totalPages ? '#94A3B8' : '#334155',
                                            transition: 'all 0.2s',
                                            padding: 0
                                        }}
                                        onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.borderColor = '#CBD5E1')}
                                        onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.borderColor = '#E2E8F0')}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div >
            )}
        </AnimatePresence >
    );

    return createPortal(modalContent, document.body);
};
