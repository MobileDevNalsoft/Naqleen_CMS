import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../apiClient';
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
        const response = await apiClient.get<ApiResponse<string[]>>(
            API_CONFIG.ENDPOINTS.RELEASE_CONTAINER_TRUCK_SUGGESTIONS,
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
 * Fetch truck details for release container
 */
export async function getReleaseContainerTruckDetails(
    truckNbr: string
): Promise<ReleaseContainerTruckDetails | null> {
    try {
        const response = await apiClient.get<ApiResponse<ReleaseContainerTruckDetails>>(
            API_CONFIG.ENDPOINTS.RELEASE_CONTAINER_TRUCK_DETAILS,
            { params: { truckNbr } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
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
        const response = await apiClient.post<ApiResponse<ReleaseContainerResponse>>(
            API_CONFIG.ENDPOINTS.SUBMIT_RELEASE_CONTAINER,
            request
        );

        if (response.data.response_code === 200) {
            return { success: true, message: 'Container(s) released successfully' };
        }

        return {
            success: false,
            message: 'Failed to release container'
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
export const useTruckSuggestionsQuery = (searchText: string) => {
    return useQuery({
        queryKey: ['releaseContainerTruckSuggestions', searchText],
        queryFn: () => getTruckSuggestions(searchText),
        enabled: searchText.length >= 3,
        staleTime: 1000 * 60, // 1 minute
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
        staleTime: 1000 * 60 * 5, // 5 minutes
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
