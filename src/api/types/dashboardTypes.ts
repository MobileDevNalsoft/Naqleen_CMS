// Dashboard API Types

// ==================== Request Types ====================

/** Date selection for summary cards (single date or range) */
export interface DateSelection {
    date?: string;       // Single date: "2026-01-29"
    startDate?: string;  // Range start
    endDate?: string;    // Range end
}

/** View mode for trends - determines data grouping and fixed range */
export type TrendViewMode = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/** Trucks section request */
export interface TrucksRequest extends DateSelection {
    include: boolean;
}

/** Drivers section request */
export interface DriversRequest extends DateSelection {
    include: boolean;
}

/** Efficiency section request */
export interface EfficiencyRequest extends DateSelection {
    include: boolean;
}

/** Trucks Trend section request */
export interface TrucksTrendRequest {
    include: boolean;
    viewMode?: TrendViewMode;
}

/** Drivers Trend section request */
export interface DriversTrendRequest {
    include: boolean;
    viewMode?: TrendViewMode;
}

/** Full Dashboard Metrics Request Payload */
export interface DashboardMetricsPayload {
    trucks?: TrucksRequest;
    drivers?: DriversRequest;
    efficiency?: EfficiencyRequest;
    trucksTrend?: TrucksTrendRequest;
    driversTrend?: DriversTrendRequest;
}

// ==================== Response Types ====================

/** Date range in response */
export interface DateRange {
    start: string;
    end: string;
}

/** Status item in dynamic response */
export interface StatusItem {
    status: string;  // e.g., "Committed", "Available", "Oos"
    count: number;
}

/** Trucks summary response - now with dynamic statuses */
export interface TrucksResponse {
    total: number;
    statuses: StatusItem[];
    dateRange: DateRange;
}

/** Drivers summary response - now with dynamic statuses */
export interface DriversResponse {
    total: number;
    statuses: StatusItem[];
    dateRange: DateRange;
}

/** Efficiency response */
export interface EfficiencyResponse {
    truckUtilization: number;
    driverUtilization: number;
    overall: number;
    dateRange: DateRange;
}

/** Trend status item */
export interface TrendStatusItem {
    status: string;
    count: number;
}

/** Trend data point - now with dynamic statuses */
export interface TrendDataPoint {
    label: string;       // Display label (e.g., "Jan 29", "Week 4", "Jan")
    statuses: TrendStatusItem[];
}

/** Trucks Trend response */
export interface TrucksTrendResponse {
    viewMode: string;
    data: TrendDataPoint[];
}

/** Drivers Trend response */
export interface DriversTrendResponse {
    viewMode: string;
    data: TrendDataPoint[];
}

/** Drivers Trend response */
export interface DriversTrendResponse {
    period: string;
    viewMode: string;
    dateRange: DateRange;
    data: TrendDataPoint[];
}

/** Metadata response - min dates for date picker restrictions */
export interface MetadataResponse {
    vehicleMinDate: string | null;
    driverMinDate: string | null;
}

/** Operational Metrics Response (from mobile API) */
export interface OperationalMetricsResponse {
    response_code: number;
    response_message: string;
    data: {
        trucks_in_yard: number;
        gate_in_no_gate_out: number; // "Awaiting Gate Out"
        containers_in_terminal: number;
        empty_slots: number;
    };
}

/** Drill Down API Types */

export type DrillDownType = 'TRUCKS' | 'DRIVERS';
export type DrillDownStatus = 'ALL' | 'ACTIVE' | 'IDLE' | 'INACTIVE';

export interface DrillDownRequest {
    type: DrillDownType;
    status: DrillDownStatus;
    date?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    pageSize: number;
}

export interface DrillDownRow {
    eventDate: string;
    truckId: string; // Using truckId for consistency with backend map, even if null for drivers (handled by type)
    status: string;
    driverId: string;
    equipment: string;
}

export interface DrillDownResponse {
    response_code: number;
    response_message: string;
    data: {
        type: DrillDownType;
        status: DrillDownStatus;
        dateRange: {
            start: string;
            end: string;
        };
        pagination: {
            page: number;
            pageSize: number;
            totalRows: number;
            totalPages: number;
        };
        rows: DrillDownRow[];
    };
}

/** Dashboard Metrics API Response */
export interface DashboardMetricsResponse {
    response_code: number;
    response_message: string;
    data: {
        trucks?: TrucksResponse;
        drivers?: DriversResponse;
        efficiency?: EfficiencyResponse;
        trucksTrend?: TrucksTrendResponse;
        driversTrend?: DriversTrendResponse;
        metadata?: MetadataResponse;
    };
}

