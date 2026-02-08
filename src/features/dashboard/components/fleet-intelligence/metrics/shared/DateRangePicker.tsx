
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRangePickerProps {
    mode: 'single' | 'range';
    date: string;
    startDate: string;
    endDate: string;
    onModeChange: (mode: 'single' | 'range') => void;
    onDateChange: (date: string) => void;
    onRangeChange: (start: string, end: string) => void;
}

export default function DateRangePicker({
    mode,
    date,
    startDate,
    endDate,
    onModeChange,
    onDateChange,
    onRangeChange
}: DateRangePickerProps) {

    // Helper to format date for display (e.g., "29 Jan 2024")
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Glassy Segmented Toggle */}
            <div style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '30px',
                padding: '4px',
                position: 'relative',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {['single', 'range'].map((m) => {
                    const isActive = mode === m;
                    return (
                        <button
                            key={m}
                            onClick={() => onModeChange(m as 'single' | 'range')}
                            style={{
                                position: 'relative',
                                padding: '6px 16px',
                                borderRadius: '24px',
                                border: 'none',
                                background: isActive ? '#FFFFFF' : 'transparent',
                                color: isActive ? '#0F172A' : 'rgba(255, 255, 255, 0.6)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
                                zIndex: 1,
                                textTransform: 'capitalize'
                            }}
                        >
                            {m === 'single' ? 'Daily' : 'Range'}
                        </button>
                    );
                })}
            </div>

            {/* Premium Date Input Trigger */}
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                gap: '10px',
                minWidth: mode === 'single' ? '140px' : '240px',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer'
            }}>
                <Calendar size={16} color="rgba(255, 255, 255, 0.8)" />

                {mode === 'single' ? (
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#FFFFFF',
                            letterSpacing: '0.01em'
                        }}>
                            {formatDate(date)}
                        </span>
                        <ChevronDown size={14} color="rgba(255, 255, 255, 0.4)" style={{ marginLeft: '8px' }} />

                        {/* Invisible Input Overlay */}
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => onDateChange(e.target.value)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        />
                    </div>
                ) : (
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Start Date */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF' }}>{formatDate(startDate)}</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => onRangeChange(e.target.value, endDate)}
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0, width: '100%', height: '100%',
                                    opacity: 0, cursor: 'pointer', zIndex: 10
                                }}
                            />
                        </div>

                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>→</span>

                        {/* End Date */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF' }}>{formatDate(endDate)}</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => onRangeChange(startDate, e.target.value)}
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0, width: '100%', height: '100%',
                                    opacity: 0, cursor: 'pointer', zIndex: 10
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
