// Premium pastel color palettes for dynamic status assignment
// Distinct palettes for trucks and drivers to prevent reputation

export interface StatusColorConfig {
    color: string;
    bgColor: string;
}

// ============================================================================
// DISTINCT PASTEL PALETTES
// ============================================================================

// Truck Palette (Teals, Greens, Corals, Oranges)
// Based on original design: Active(Teal), Idle(Green), Inactive(Coral)
const TRUCK_COLORS: StatusColorConfig[] = [
    { color: '#2DB3AA', bgColor: '#D4F1EE' },  // Teal (Index 0 - e.g. Committed)
    { color: '#6BBF8A', bgColor: '#DFF2E6' },  // Green (Index 1 - e.g. Available)
    { color: '#E8846E', bgColor: '#FCE4DF' },  // Coral (Index 2 - e.g. OOS)
    { color: '#F59E0B', bgColor: '#FEF3C7' },  // Amber
    { color: '#14B8A6', bgColor: '#CCFBF1' },  // Cyan
    { color: '#F97316', bgColor: '#FFEDD5' },  // Orange
    { color: '#059669', bgColor: '#D1FAE5' },  // Emerald
    { color: '#DC2626', bgColor: '#FECACA' },  // Red
];

// Driver Palette (Blues, Golds, Purples, Indigos)
// Based on original design: OnDuty(Blue), Idle(Gold)
const DRIVER_COLORS: StatusColorConfig[] = [
    { color: '#5A7FD6', bgColor: '#DEE8F9' },  // Blue (Index 0 - e.g. Committed)
    { color: '#E5AE56', bgColor: '#FAF0DA' },  // Gold (Index 1 - e.g. Available)
    { color: '#8B5CF6', bgColor: '#EDE9FE' },  // Purple
    { color: '#6366F1', bgColor: '#E0E7FF' },  // Indigo
    { color: '#EC4899', bgColor: '#FCE7F3' },  // Pink
    { color: '#0EA5E9', bgColor: '#E0F2FE' },  // Sky
    { color: '#A855F7', bgColor: '#F3E8FF' },  // Violet
    { color: '#64748B', bgColor: '#F1F5F9' },  // Slate
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get color for truck status (Index-based cycling)
 */
export function getTruckStatusColor(index: number = 0): StatusColorConfig {
    // Ignore status string for color assignment to ensure consistent pastel palette order
    // (Teal -> Green -> Coral) regardless of the specific status wording
    return TRUCK_COLORS[index % TRUCK_COLORS.length];
}

/**
 * Get color for driver status (Index-based cycling)
 */
export function getDriverStatusColor(index: number = 0): StatusColorConfig {
    // Ignore status string for color assignment to ensure consistent pastel palette order
    // (Blue -> Gold -> Purple)
    return DRIVER_COLORS[index % DRIVER_COLORS.length];
}

/**
 * Get just the main color for truck status (for charts)
 */
export function getTruckChartColor(index: number = 0): string {
    return getTruckStatusColor(index).color;
}

/**
 * Get just the main color for driver status (for charts)
 */
export function getDriverChartColor(index: number = 0): string {
    return getDriverStatusColor(index).color;
}
