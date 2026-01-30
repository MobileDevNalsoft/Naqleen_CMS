import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangeModalProps {
    initialStart: string;
    initialEnd: string;
    onApply: (startDate: string, endDate: string) => void;
    onCancel: () => void;
    title?: string;
    minDate?: string;  // Earliest selectable date (YYYY-MM-DD)
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function DateRangeModal({ initialStart, initialEnd, onApply, onCancel, title, minDate }: DateRangeModalProps) {
    const [startDate, setStartDate] = useState(initialStart);
    const [endDate, setEndDate] = useState(initialEnd);
    const [viewDate, setViewDate] = useState(new Date(initialStart || new Date()));
    const [selectingStart, setSelectingStart] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // Get calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    // Helpers to work with LOCAL dates manually to avoid timezone issues
    const toLocalString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const formatDisplay = (d: string) => {
        if (!d) return 'Select...';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleDayClick = (day: number) => {
        // Construct date manually from viewDate year/month and clicked day
        const clickedDate = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Prevent future dates
        if (clickedDate > today) return;

        // Prevent dates before minDate
        if (minDate) {
            const minDateObj = new Date(minDate);
            minDateObj.setHours(0, 0, 0, 0);
            if (clickedDate < minDateObj) return;
        }

        const dateStr = toLocalString(clickedDate);

        if (selectingStart) {
            setStartDate(dateStr);
            setEndDate('');
            setSelectingStart(false);
        } else {
            if (dateStr < startDate) {
                setStartDate(dateStr);
                setEndDate(startDate);
            } else {
                setEndDate(dateStr);
            }
            setSelectingStart(true);
        }
    };

    const isInRange = (day: number) => {
        if (!startDate || !endDate) return false;
        const current = toLocalString(new Date(year, month, day));
        return current >= startDate && current <= endDate;
    };

    const isStart = (day: number) => toLocalString(new Date(year, month, day)) === startDate;
    const isEnd = (day: number) => toLocalString(new Date(year, month, day)) === endDate;
    const isToday = (day: number) => toLocalString(new Date(year, month, day)) === toLocalString(new Date());

    const isFuture = (day: number) => {
        const current = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return current > today;
    };

    const isBeforeMin = (day: number) => {
        if (!minDate) return false;
        const current = new Date(year, month, day);
        const minDateObj = new Date(minDate);
        minDateObj.setHours(0, 0, 0, 0);
        return current < minDateObj;
    };

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    if (!mounted) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '360px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                animation: 'slideUp 0.25s ease-out',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column', // Stack title and close button row if needed, but here centered layout
                    padding: '24px',
                    background: 'var(--primary-gradient, linear-gradient(135deg, #4B686C 0%, #3A5255 100%))',
                    color: 'white',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'white' }}>
                            Select Date Range
                        </h3>
                        <button
                            onClick={onCancel}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '6px',
                                color: 'white',
                                borderRadius: '50%',
                                display: 'flex',
                                boxShadow: 'none'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {title && (
                        <div style={{
                            marginTop: '8px',
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: 500
                        }}>
                            for {title}
                        </div>
                    )}
                </div>

                {/* Month Navigation */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px 10px'
                }}>
                    <button onClick={prevMonth} style={{
                        background: '#F1F5F9',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1E293B',
                        transition: 'all 0.2s ease',
                        boxShadow: 'none'
                    }}>
                        <ChevronLeft size={20} style={{ stroke: '#1E293B', minWidth: '20px', minHeight: '20px' }} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-color, #1E293B)' }}>
                        {MONTHS[month]} {year}
                    </span>
                    <button onClick={nextMonth} style={{
                        background: '#F1F5F9',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1E293B',
                        transition: 'all 0.2s ease',
                        boxShadow: 'none'
                    }}>
                        <ChevronRight size={20} style={{ stroke: '#1E293B', minWidth: '20px', minHeight: '20px' }} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div style={{ padding: '0 24px 20px' }}>
                    {/* Day Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '12px' }}>
                        {DAYS.map(day => (
                            <div key={day} style={{
                                textAlign: 'center',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#94A3B8',
                                padding: '4px'
                            }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {days.map((day, idx) => {
                            const disabled = day ? (isFuture(day) || isBeforeMin(day)) : false;
                            return (
                                <div key={idx} style={{ aspectRatio: '1' }}>
                                    {day && (
                                        <button
                                            onClick={() => !disabled && handleDayClick(day)}
                                            disabled={disabled}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                padding: 0,
                                                border: 'none',
                                                borderRadius: isStart(day) || isEnd(day) ? '50%' : isInRange(day) ? '0' : '50%',
                                                background: isStart(day) || isEnd(day)
                                                    ? 'var(--primary-color, #4B686C)'
                                                    : isInRange(day)
                                                        ? 'rgba(75, 104, 108, 0.15)'
                                                        : isToday(day)
                                                            ? '#F1F5F9'
                                                            : 'transparent',
                                                color: disabled
                                                    ? '#CBD5E1'
                                                    : (isStart(day) || isEnd(day) ? '#FFFFFF' : '#1E293B'),
                                                fontSize: '14px',
                                                fontWeight: isToday(day) || isStart(day) || isEnd(day) ? 600 : 400,
                                                cursor: disabled ? 'not-allowed' : 'pointer',
                                                opacity: disabled ? 0.5 : 1,
                                                transition: 'all 0.15s ease',
                                                boxShadow: 'none'
                                            }}
                                        >
                                            {day}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Range Display */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '20px 24px',
                    background: '#F8FAFC',
                    borderTop: '1px solid #E2E8F0'
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>Start Date</div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: startDate ? '#1E293B' : '#94A3B8',
                            padding: '10px 14px',
                            background: selectingStart ? 'rgba(75, 104, 108, 0.1)' : '#FFFFFF',
                            border: selectingStart ? '2px solid var(--primary-color, #4B686C)' : '1px solid #E2E8F0',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                            onClick={() => setSelectingStart(true)}
                        >
                            {formatDisplay(startDate)}
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>End Date</div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: endDate ? '#1E293B' : '#94A3B8',
                            padding: '10px 14px',
                            background: !selectingStart ? 'rgba(75, 104, 108, 0.1)' : '#FFFFFF',
                            border: !selectingStart ? '2px solid var(--primary-color, #4B686C)' : '1px solid #E2E8F0',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                            onClick={() => setSelectingStart(false)}
                        >
                            {formatDisplay(endDate)}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '20px 24px',
                    borderTop: '1px solid #E2E8F0'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: '#F1F5F9',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer',
                            boxShadow: 'none'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
                        onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => startDate && onApply(startDate, endDate || startDate)}
                        disabled={!startDate}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: startDate ? 'var(--primary-color, #4B686C)' : '#E2E8F0',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: startDate ? '#FFFFFF' : '#94A3B8',
                            cursor: startDate ? 'pointer' : 'not-allowed',
                            boxShadow: startDate ? '0 4px 12px rgba(75, 104, 108, 0.25)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                            if (startDate) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(75, 104, 108, 0.35)';
                            }
                        }}
                        onMouseLeave={e => {
                            if (startDate) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 104, 108, 0.25)';
                            }
                        }}
                    >
                        Apply
                    </button>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
}
