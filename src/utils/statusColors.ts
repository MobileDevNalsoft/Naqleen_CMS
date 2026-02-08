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
// Index 0 (Committed): Professional Indigo (Moving/Productive)
// Index 1 (Available): Emerald Green (Ready/Positive)
// Index 2 (OOS): Deep Crimson (Stopped/Requires Attention)
const TRUCK_COLORS: StatusColorConfig[] = [
    { color: '#5A7FD6', bgColor: '#DEE8F9' },  // Soft Blue (Index 0 - Committed)
    { color: '#2DB3AA', bgColor: '#D4F1EE' },  // Soft Teal (Index 1 - Available)
    { color: '#F06292', bgColor: '#FCE4EC' },  // Soft Rose (Index 2 - OOS)
    { color: '#7E57C2', bgColor: '#F3E5F5' },  // Distinct Purple (Index 3 - In Transit/Moving)
    { color: '#FFB74D', bgColor: '#FFF3E0' },  // Soft Orange
    { color: '#4FC3F7', bgColor: '#E1F5FE' },  // Soft Sky
    { color: '#4DD0E1', bgColor: '#E0F7FA' },  // Soft Cyan
    { color: '#94A3B8', bgColor: '#F1F5F9' },  // Soft Slate
];

// Driver Palette (Thematic: Human/HR Status)
// Semantics:
// Index 0 (Committed): High-Contrast Indigo (Active Duty)
// Index 1 (Available): Rich Emerald (Ready/Standby)
// Index 2 (OOS): Cool Slate (Off Duty/Unavailable)
const DRIVER_COLORS: StatusColorConfig[] = [
    { color: '#5A7FD6', bgColor: '#DEE8F9' },  // Soft Blue (Index 0 - Committed)
    { color: '#66BB6A', bgColor: '#E8F5E9' },  // Soft Sage Green (Index 1 - Available)
    { color: '#94A3B8', bgColor: '#F1F5F9' },  // Soft Slate (Index 2 - OOS)
    { color: '#BA68C8', bgColor: '#F3E5F5' },  // Soft Purple
    { color: '#F06292', bgColor: '#FCE4EC' },  // Soft Pink
    { color: '#4DD0E1', bgColor: '#E0F7FA' },  // Soft Cyan
    { color: '#FFB74D', bgColor: '#FFF3E0' },  // Soft Orange
    { color: '#1A237E', bgColor: '#E8EAF6' },  // Deep Indigo
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
