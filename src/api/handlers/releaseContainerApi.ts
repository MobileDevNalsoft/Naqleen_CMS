import { useQuery, useMutation } from '@tanstack/react-query';
import { mobileApiClient } from '../apiClient';
import { API_CONFIG } from '../apiConfig';
import type { ApiResponse } from '../types/commonTypes';
import type {
    ReleaseContainerTruckDetails,
    ReleaseContainerRequest,
    ReleaseContainerResponse
} from '../types/releaseContainerTypes';

/**
 * Fetch truck suggestions for autocomplete
 */
export async function getTruckSuggestions(searchText: string): Promise<string[]> {
    try {
        const response = await mobileApiClient.get<ApiResponse<string[]>>(
            API_CONFIG.ENDPOINTS.RELEASE_CONTAINER_TRUCKS,
            { params: { searchText } }
        );

        if (response.data.response_code === 200 && Array.isArray(response.data.data)) {
            return response.data.data;
        }

        return [];
    } catch (error) {
        console.error('Error fetching truck suggestions:', error);
        return [];
    }
}

/**
 * Transform snake_case API response to camelCase TypeScript types
 */
function transformTruckDetails(data: any): ReleaseContainerTruckDetails {
    console.log('[Transform] Raw data received:', data);
    console.log('[Transform] truck_nbr:', data?.truck_nbr);
    console.log('[Transform] driver_name:', data?.driver_name);

    // Transform container_types to containerTypes
    let containerTypes: Record<string, { containers: { containerNbr: string; position: string }[]; shipments: string[] }> | undefined;

    if (data.container_types) {
        containerTypes = {};
        for (const [type, typeData] of Object.entries(data.container_types as Record<string, any>)) {
            containerTypes[type] = {
                containers: (typeData.containers || []).map((c: any) => ({
                    containerNbr: c.container_nbr,
                    position: c.position
                })),
                shipments: typeData.shipments || []
            };
        }
    }

    return {
        truckNbr: data.truck_nbr,
        driverName: data.driver_name,
        driverIqamaNbr: data.driver_iqama_nbr,
        customerName: data.customer_name,
        customerNbr: data.customer_nbr,
        bookingNbr: data.booking_nbr,
        orderType: data.order_type,
        orderMovementXid: data.order_movement_xid,
        containerTypes,
        // For RELEASE_CFS
        containerNbr: data.container_nbr,
        containerType: data.container_type,
        shipmentNbr: data.shipment_nbr,
        position: data.position
    };
}

/**
 * Fetch truck details for release container
 */
export async function getReleaseContainerTruckDetails(
    truckNbr: string
): Promise<ReleaseContainerTruckDetails | null> {
    try {
        const response = await mobileApiClient.get<ApiResponse<any>>(
            API_CONFIG.ENDPOINTS.RELEASE_CONTAINER_TRUCK_DETAILS,
            { params: { truckNbr } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            return transformTruckDetails(response.data.data);
        }

        console.warn('Truck details not found:', truckNbr);
        return null;
    } catch (error) {
        console.error('Error fetching truck details:', error);
        return null;
    }
}

/**
 * Submit release container request
 */
export async function submitReleaseContainer(
    request: ReleaseContainerRequest
): Promise<ReleaseContainerResponse> {
    try {
        // Transform camelCase to snake_case for API
        const payload = {
            truck_nbr: request.truckNbr,
            booking_nbr: request.bookingNbr,
            order_type: request.orderType,
            customer_nbr: request.customerNbr,
            customer_name: request.customerName,
            order_nbr: request.orderNbr,
            containers: request.containers.map(c => ({
                container_nbr: c.containerNbr,
                container_type: c.containerType,
                shipment_nbr: c.shipmentNbr,
                position: c.position
            }))
        };

        console.log('[ReleaseContainer] Sending payload:', payload);

        const response = await mobileApiClient.post<ApiResponse<ReleaseContainerResponse>>(
            API_CONFIG.ENDPOINTS.SUBMIT_RELEASE_CONTAINER,
            payload
        );

        console.log('[ReleaseContainer] API response:', response.data);

        if (response.data.response_code === 200) {
            return { success: true, message: 'Container(s) released successfully' };
        }

        return {
            success: false,
            message: (response.data as any).response_message || 'Failed to release container'
        };
    } catch (error: any) {
        console.error('Error submitting release container:', error);
        return {
            success: false,
            message: error?.response?.data?.message || 'An error occurred while releasing container'
        };
    }
}


// --- React Query Hooks ---

/**
 * Hook for truck suggestions autocomplete
 */
export const useTruckSuggestionsQuery = (searchText: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['releaseContainerTrucks', searchText],
        queryFn: () => getTruckSuggestions(searchText),
        enabled,
        staleTime: 0, // 1 minute
    });
};

/**
 * Hook for fetching truck details
 */
export const useReleaseContainerTruckDetailsQuery = (truckNbr: string | null) => {
    return useQuery({
        queryKey: ['releaseContainerTruckDetails', truckNbr],
        queryFn: () => getReleaseContainerTruckDetails(truckNbr!),
        enabled: !!truckNbr && truckNbr.length >= 3,
        staleTime: 0, // Always consider data stale - fetch fresh on every request
        gcTime: 0, // Don't cache the data
    });
};

/**
 * Hook for submitting release container
 */
export const useSubmitReleaseContainerMutation = () => {
    return useMutation({
        mutationFn: submitReleaseContainer,
    });
};
