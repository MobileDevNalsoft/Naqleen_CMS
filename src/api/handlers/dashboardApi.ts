import { webApiClient, mobileApiClient } from '../apiClient';
import { API_CONFIG } from '../apiConfig';
import type {
    DashboardMetricsPayload,
    DashboardMetricsResponse,
    TrucksResponse,
    DriversResponse,
    EfficiencyResponse,
    TrucksTrendResponse,
    DriversTrendResponse,
    MetadataResponse,
    OperationalMetricsResponse,
    DrillDownRequest,
    DrillDownResponse
} from '../types/dashboardTypes';

/**
 * Fetch dashboard metrics from API
 */
export async function getDashboardMetrics(
    payload: DashboardMetricsPayload
): Promise<DashboardMetricsResponse> {
    const response = await webApiClient.post<DashboardMetricsResponse>(
        API_CONFIG.ENDPOINTS.GET_DASHBOARD_METRICS,
        payload
    );
    return response.data;
}

/**
 * Fetch only trucks summary
 */
export async function getTrucksSummary(
    date?: string,
    startDate?: string,
    endDate?: string
): Promise<TrucksResponse | null> {
    const payload: DashboardMetricsPayload = {
        trucks: {
            include: true,
            ...(date ? { date } : { startDate, endDate })
        }
    };

    const response = await getDashboardMetrics(payload);

    if (response.response_code === 200 && response.data?.trucks) {
        return response.data.trucks;
    }
    return null;
}

/**
 * Fetch only drivers summary
 */
export async function getDriversSummary(
    date?: string,
    startDate?: string,
    endDate?: string
): Promise<DriversResponse | null> {
    const payload: DashboardMetricsPayload = {
        drivers: {
            include: true,
            ...(date ? { date } : { startDate, endDate })
        }
    };

    const response = await getDashboardMetrics(payload);

    if (response.response_code === 200 && response.data?.drivers) {
        return response.data.drivers;
    }
    return null;
}

/**
 * Fetch only efficiency
 */
export async function getEfficiency(
    date?: string,
    startDate?: string,
    endDate?: string
): Promise<EfficiencyResponse | null> {
    const payload: DashboardMetricsPayload = {
        efficiency: {
            include: true,
            ...(date ? { date } : { startDate, endDate })
        }
    };

    const response = await getDashboardMetrics(payload);

    if (response.response_code === 200 && response.data?.efficiency) {
        return response.data.efficiency;
    }
    return null;
}

/**
 * Fetch only trucks trends
 */
export async function getTrucksTrend(
    viewMode: string = 'DAILY'
): Promise<TrucksTrendResponse | null> {
    const payload: DashboardMetricsPayload = {
        trucksTrend: {
            include: true,
            viewMode: viewMode as any
        }
    };

    const response = await getDashboardMetrics(payload);

    if (response.response_code === 200 && response.data?.trucksTrend) {
        return response.data.trucksTrend;
    }
    return null;
}

/**
 * Fetch only drivers trends
 */
export async function getDriversTrend(
    viewMode: string = 'DAILY'
): Promise<DriversTrendResponse | null> {
    const payload: DashboardMetricsPayload = {
        driversTrend: {
            include: true,
            viewMode: viewMode as any
        }
    };

    const response = await getDashboardMetrics(payload);

    if (response.response_code === 200 && response.data?.driversTrend) {
        return response.data.driversTrend;
    }
    return null;
}

/**
 * Fetch metadata (min dates) - uses a minimal API call to get metadata
 */
export async function getMetadata(): Promise<MetadataResponse | null> {
    // Make a minimal request - the metadata is always included in the response
    const payload: DashboardMetricsPayload = {
        trucks: { include: true, date: new Date().toISOString().split('T')[0] }
    };

    const response = await getDashboardMetrics(payload);

    if (response.response_code === 200 && response.data?.metadata) {
        return response.data.metadata;
    }
    return null;
}

/**
 * Fetch operational metrics (Trucks in Yard, Awaiting Gate Out, etc.)
 * Uses mobile API endpoint
 */
export async function getOperationalMetrics(): Promise<OperationalMetricsResponse['data'] | null> {
    try {
        const response = await mobileApiClient.get<OperationalMetricsResponse>(
            API_CONFIG.ENDPOINTS.GET_OPERATIONAL_METRICS
        );

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching operational metrics:', error);
        return null;
    }
}


/**
 * Fetch drill-down data
 */
export async function getDashboardDrilldown(
    payload: DrillDownRequest
): Promise<DrillDownResponse> {
    const response = await webApiClient.post<DrillDownResponse>(
        API_CONFIG.ENDPOINTS.GET_DASHBOARD_DRILLDOWN,
        payload
    );
    return response.data;
}
