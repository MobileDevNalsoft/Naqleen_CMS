import { useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { API_CONFIG } from '../../../api/apiConfig';
import type { ApiResponse } from '../../../api/apiTypes';
import type { LeasedContainer, LeasedContainersResponse } from '../types/containerTypes';

/**
 * Fetch leased containers with pagination and optional search
 * @param offset - Number of rows to skip
 * @param searchText - Optional search text to filter containers
 */
export async function getLeasedContainers(
    offset: number = 0,
    searchText?: string
): Promise<LeasedContainersResponse> {
    try {
        const response = await apiClient.get<ApiResponse<LeasedContainer[]> & {
            total_count: number;
            offset: number;
            limit: number;
        }>(
            API_CONFIG.ENDPOINTS.GET_LEASED_CONTAINERS,
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

        console.warn('Leased containers API response:', response.data);
        return { data: [], total_count: 0, offset: 0, limit: 50 };
    } catch (error) {
        console.error('Error fetching leased containers:', error);
        return { data: [], total_count: 0, offset: 0, limit: 50 };
    }
}

/**
 * React Query infinite query hook for scroll-based pagination with optional search
 * @param searchText - Optional search text to filter containers
 */
export const useLeasedContainersQuery = (searchText?: string) => {
    return useInfiniteQuery({
        queryKey: ['leasedContainers', searchText],
        queryFn: async ({ pageParam = 0 }) => {
            return getLeasedContainers(pageParam, searchText);
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            const nextOffset = lastPage.offset + lastPage.limit;
            if (nextOffset < lastPage.total_count) {
                return nextOffset;
            }
            return undefined;
        },
        staleTime: 60000, // 1 minute
        refetchOnWindowFocus: false,
    });
};
