import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import DateRangeModal from './DateRangeModal';
import { getLocalDateString } from '../../../../../settings/utils/dateUtils';

// Types
export type PresetType = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth';

export interface DateFilterValue {
    type: 'preset' | 'custom';
    preset?: PresetType;
    startDate?: string;
    endDate?: string;
}

interface DateFilterDropdownProps {
    value: DateFilterValue;
    onChange: (value: DateFilterValue) => void;
    title?: string;
    minDate?: string;  // Earliest selectable date (YYYY-MM-DD)
    allowedPresets?: PresetType[]; // Optional subset of presets to display
    maxDays?: number; // Optional restriction for maximum custom date range span
}

// Preset configurations
const PRESETS: { key: PresetType; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'thisMonth', label: 'This Month' }
];

// Helper to get dates for a preset
export function getPresetDates(preset: PresetType): { startDate: string; endDate: string } {
    const today = new Date();
    const formatDate = (d: Date) => getLocalDateString(d);

    switch (preset) {
        case 'today':
            return { startDate: formatDate(today), endDate: formatDate(today) };
        case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return { startDate: formatDate(yesterday), endDate: formatDate(yesterday) };
        }
        case 'last7': {
            const start = new Date(today);
            start.setDate(start.getDate() - 6);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }
        case 'last30': {
            const start = new Date(today);
            start.setDate(start.getDate() - 29);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }
        case 'thisMonth': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            return { startDate: formatDate(start), endDate: formatDate(today) };
        }
    }
}

// Get display label for current value
function getDisplayLabel(value: DateFilterValue): string {
    if (value.type === 'preset' && value.preset) {
        return PRESETS.find(p => p.key === value.preset)?.label || 'Today';
    }
    if (value.type === 'custom' && value.startDate && value.endDate) {
        const formatShort = (d: string) => {
            const date = new Date(d);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        };
        if (value.startDate === value.endDate) {
            return formatShort(value.startDate);
        }
        return `${formatShort(value.startDate)} - ${formatShort(value.endDate)}`;
    }
    return 'Today';
}

export default function DateFilterDropdown({ value, onChange, title, minDate, allowedPresets, maxDays }: DateFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const activePresets = allowedPresets
        ? PRESETS.filter(p => allowedPresets.includes(p.key))
        : PRESETS;

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetClick = (preset: PresetType) => {
        onChange({ type: 'preset', preset });
        setIsOpen(false);
    };

    const handleCustomClick = () => {
        setIsOpen(false);
        setShowModal(true);
    };

    const handleModalApply = (startDate: string, endDate: string) => {
        onChange({ type: 'custom', startDate, endDate });
        setShowModal(false);
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '24px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.35)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
            >
                <Calendar size={14} />
                <span>{getDisplayLabel(value)}</span>
                <ChevronDown
                    size={14}
                    style={{
                        opacity: 0.6,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                    }}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '200px',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                    padding: '6px',
                    zIndex: 1000,
                    animation: 'fadeIn 0.15s ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}>
                    {/* Preset Options */}
                    {activePresets.map(({ key, label }) => {
                        const isSelected = value.type === 'preset' && value.preset === key;
                        return (
                            <button
                                key={key}
                                onClick={() => handlePresetClick(key)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    background: isSelected ? 'rgba(75, 104, 108, 0.1)' : 'transparent',
                                    border: isSelected ? '1px solid rgba(75, 104, 108, 0.2)' : '1px solid transparent',
                                    borderRadius: '8px',
                                    color: isSelected ? 'var(--primary-color, #4B686C)' : 'var(--text-color, #1E293B)',
                                    fontSize: '13px',
                                    fontWeight: isSelected ? 600 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = '#F1F5F9';
                                        e.currentTarget.style.borderColor = '#E2E8F0';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = 'transparent';
                                    }
                                }}
                            >
                                <span>{label}</span>
                                {isSelected && <Check size={16} />}
                            </button>
                        );
                    })}

                    {/* Divider */}
                    <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 6px' }} />

                    {/* Custom Range Option */}
                    <button
                        onClick={handleCustomClick}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            background: value.type === 'custom' ? 'rgba(75, 104, 108, 0.1)' : 'transparent',
                            border: value.type === 'custom' ? '1px solid rgba(75, 104, 108, 0.2)' : '1px solid transparent',
                            borderRadius: '8px',
                            color: value.type === 'custom' ? 'var(--primary-color, #4B686C)' : '#64748B',
                            fontSize: '13px',
                            fontWeight: value.type === 'custom' ? 600 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                            if (value.type !== 'custom') {
                                e.currentTarget.style.background = '#F1F5F9';
                                e.currentTarget.style.borderColor = '#E2E8F0';
                            }
                        }}
                        onMouseLeave={e => {
                            if (value.type !== 'custom') {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'transparent';
                            }
                        }}
                    >
                        <Calendar size={14} />
                        <span>Custom Range...</span>
                    </button>
                </div>
            )}

            {/* Custom Date Range Modal */}
            {showModal && (
                <DateRangeModal
                    title={title}
                    initialStart={value.startDate || getLocalDateString()}
                    initialEnd={value.endDate || getLocalDateString()}
                    onApply={handleModalApply}
                    onCancel={() => setShowModal(false)}
                    minDate={minDate}
                    maxDays={maxDays}
                />
            )}

            {/* Fade-in animation */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
