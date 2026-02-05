// Premium pastel color palettes for dynamic status assignment
// Distinct palettes for trucks and drivers to prevent reputation

export interface StatusColorConfig {
    color: string;
    bgColor: string;
}

// ============================================================================
// DISTINCT PASTEL PALETTES
// ============================================================================

// Truck Palette (Thematic: Physical/Operational Status)
// Semantics:
// Index 0 (Committed): Pastel Mint (Productive/Moving/Good)
// Index 1 (Available): Pastel Amber (Idle/Warning/Waiting)
// Index 2 (OOS): Pastel Red (Stopped/Error/Bad)
const TRUCK_COLORS: StatusColorConfig[] = [
    { color: '#2DD4BF', bgColor: '#CCFBF1' },  // Mint/Teal (Index 0 - Committed)
    { color: '#FBBF24', bgColor: '#FEF3C7' },  // Amber (Index 1 - Available)
    { color: '#F87171', bgColor: '#FEE2E2' },  // Red (Index 2 - OOS)
    { color: '#34D399', bgColor: '#D1FAE5' },  // Emerald
    { color: '#FB923C', bgColor: '#FFEDD5' },  // Orange
    { color: '#A3E635', bgColor: '#ECFCCB' },  // Lime
    { color: '#22D3EE', bgColor: '#CFFAFE' },  // Cyan
    { color: '#818CF8', bgColor: '#E0E7FF' },  // Indigo
];

// Driver Palette (Thematic: Human/HR Status)
// Semantics:
// Index 0 (Committed): Pastel Indigo (Professional/On Duty)
// Index 1 (Available): Pastel Sky (Ready/Standby)
// Index 2 (OOS): Pastel Slate (Off Duty/Unavailable/Neutral)
const DRIVER_COLORS: StatusColorConfig[] = [
    { color: '#818CF8', bgColor: '#E0E7FF' },  // Indigo (Index 0 - Committed/In Transit)
    { color: '#38BDF8', bgColor: '#E0F2FE' },  // Sky (Index 1 - Available)
    { color: '#94A3B8', bgColor: '#F1F5F9' },  // Slate (Index 2 - OOS)
    { color: '#C084FC', bgColor: '#F3E8FF' },  // Purple
    { color: '#F472B6', bgColor: '#FCE7F3' },  // Pink
    { color: '#2DD4BF', bgColor: '#CCFBF1' },  // Teal
    { color: '#FBBF24', bgColor: '#FEF3C7' },  // Amber
    { color: '#A78BFA', bgColor: '#EDE9FE' },  // Violet
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get color for truck status (Index-based cycling)
 */
export function getTruckStatusColor(index: number = 0): StatusColorConfig {
    // Ignore status string for color assignment to ensure consistent pastel palette order
    // (Mint -> Amber -> Red) regardless of the specific status wording
    return TRUCK_COLORS[index % TRUCK_COLORS.length];
}

/**
 * Get color for driver status (Index-based cycling)
 */
export function getDriverStatusColor(index: number = 0): StatusColorConfig {
    // Ignore status string for color assignment to ensure consistent pastel palette order
    // (Indigo -> Sky -> Slate)
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

/**
 * Get logical index for status string to ensure consistent coloring
 * Maps semantic status names to fixed indices
 */
export function getStatusIndex(statusName: string = ''): number {
    if (!statusName) return 0;

    const lowerStatus = statusName.toLowerCase();

    // Index 3: In Transit / Moving -> "Active Motion" (Purple)
    if (lowerStatus.includes('transit') || lowerStatus.includes('moving') || lowerStatus.includes('driving')) {
        return 3;
    }

    // Index 0: Active / Committed / Working -> "Good"
    if (lowerStatus.includes('committed') || lowerStatus.includes('active') || lowerStatus.includes('assigned') || lowerStatus.includes('duty')) {
        return 0;
    }

    // Index 1: Available / Idle / Empty -> "Waiting"
    if (lowerStatus.includes('available') || lowerStatus.includes('idle') || lowerStatus.includes('empty')) {
        return 1;
    }

    // Index 2: Inactive / Out of Service / Maintenance -> "Bad/Off"
    if (lowerStatus.includes('out') || lowerStatus.includes('inactive') || lowerStatus.includes('maintenance')) {
        return 2;
    }

    // Fallback: Consistent hash based on string
    return Math.abs(statusName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
}
