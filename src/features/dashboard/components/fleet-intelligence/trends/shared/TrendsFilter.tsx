import type { TrendViewMode } from '../../../../types/dashboardTypes';

interface TrendsFilterProps {
    viewMode: TrendViewMode;
    onViewModeChange: (mode: TrendViewMode) => void;
}

const VIEW_MODE_LABELS: Record<TrendViewMode, string> = {
    'DAILY': 'Daily',
    'WEEKLY': 'Weekly',
    'MONTHLY': 'Monthly'
};

export default function TrendsFilter({ viewMode, onViewModeChange }: TrendsFilterProps) {
    return (
        <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '20px',
            padding: '3px',
            gap: '2px'
        }}>
            {(['DAILY', 'WEEKLY', 'MONTHLY'] as TrendViewMode[]).map((mode) => (
                <button
                    key={mode}
                    onClick={() => onViewModeChange(mode)}
                    style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: viewMode === mode
                            ? 'rgba(255,255,255,0.95)'
                            : 'transparent',
                        color: viewMode === mode
                            ? '#1E293B'
                            : 'rgba(255,255,255,0.75)',
                        boxShadow: viewMode === mode
                            ? '0 2px 8px rgba(0,0,0,0.15)'
                            : 'none'
                    }}
                    onMouseEnter={e => {
                        if (viewMode !== mode) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                        }
                    }}
                    onMouseLeave={e => {
                        if (viewMode !== mode) {
                            e.currentTarget.style.background = 'transparent';
                        }
                    }}
                >
                    {VIEW_MODE_LABELS[mode]}
                </button>
            ))}
        </div>
    );
}
