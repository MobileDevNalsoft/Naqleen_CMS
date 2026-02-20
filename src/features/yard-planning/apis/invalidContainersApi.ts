import { useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { API_CONFIG } from '../../../api/apiConfig';
import type { ApiResponse } from '../../../api/apiTypes';
import type { InvalidContainer, InvalidContainersResponse } from '../types/containerTypes';

/**
 * Fetch invalid containers with pagination and optional search
 * @param offset - Number of rows to skip
 * @param searchText - Optional search text to filter containers
 */
export async function getInvalidContainers(
    offset: number = 0,
    searchText?: string
): Promise<InvalidContainersResponse> {
    try {
        const response = await apiClient.get<ApiResponse<InvalidContainer[]> & {
            total_count: number;
            offset: number;
            limit: number;
        }>(
            API_CONFIG.ENDPOINTS.GET_INVALID_CONTAINERS,
            { params: { offset, searchText: searchText || undefined } }
        );

        if (response.data.response_code === 200) {
            return {
                data: response.data.data || [],
                total_count: response.data.total_count || 0,
                offset: response.data.offset || 0,
                limit: response.data.limit || 50
            };
        }

        console.warn('Invalid containers API response:', response.data);
        return { data: [], total_count: 0, offset: 0, limit: 50 };
    } catch (error) {
        console.error('Error fetching invalid containers:', error);
        return { data: [], total_count: 0, offset: 0, limit: 50 };
    }
}

/**
 * React Query infinite query hook for scroll-based pagination with optional search
 * @param searchText - Optional search text to filter containers
 */
export const useInvalidContainersQuery = (searchText?: string) => {
    return useInfiniteQuery({
        queryKey: ['invalidContainers', searchText],
        queryFn: async ({ pageParam = 0 }) => {
            return getInvalidContainers(pageParam, searchText);
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            // Calculate if there are more pages
            const nextOffset = lastPage.offset + lastPage.limit;
            if (nextOffset < lastPage.total_count) {
                return nextOffset;
            }
            return undefined; // No more pages
        },
        staleTime: 60000, // 1 minute
        refetchOnWindowFocus: false,
    });
};
