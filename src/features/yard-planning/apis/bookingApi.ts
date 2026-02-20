import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { API_CONFIG } from '../../../api/apiConfig';
import type { Booking, Customer, ReservationRequest, ReservationResponse, UnreservationRequest } from '../types/bookingTypes';
import type { ApiResponse } from '../../../api/apiTypes';


/**
 * Fetch customers list
 */
export const getCustomers = async (): Promise<Customer[]> => {
    try {
        const response = await apiClient.get<ApiResponse<Customer[]>>(API_CONFIG.ENDPOINTS.GET_CUSTOMERS);
        const apiResponse = response.data;
        if (apiResponse.response_code === 200 && Array.isArray(apiResponse.data)) {
            return apiResponse.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
    }
};

/**
 * Fetch bookings for a customer (Stage 2)
 */
export const getBookings = async (cust_nbr: string, searchText: string = '', page: number = 1, limit: number = 20): Promise<{ bookings: Booking[], total_count: number }> => {
    try {
        const response = await apiClient.get<ApiResponse<Booking[]>>(API_CONFIG.ENDPOINTS.GET_BOOKINGS, {
            params: {
                p_cust_nbr: cust_nbr,
                p_search_text: searchText,
                p_page: page,
                p_limit: limit
            }
        });
        const apiResponse = response.data;
        if (apiResponse.response_code === 200 && Array.isArray(apiResponse.data)) {
            return {
                bookings: apiResponse.data,
                total_count: (apiResponse as any).total_count || 0
            };
        }
        return { bookings: [], total_count: 0 };
    } catch (error) {
        console.error('Error fetching customer bookings:', error);
        return { bookings: [], total_count: 0 };
    }
};

/**
 * Fetch reserved AND available containers for a booking and type (Stage 3)
 * Returns: { reserved: string[], available: string[] }
 */
export interface AvailableReservedResponse {
    reserved: string[];
    available: string[];
}

export const getAvailableReserved = async (cust_nbr: string, booking_id: string, type: string): Promise<AvailableReservedResponse> => {
    try {
        const response = await apiClient.get<ApiResponse<null> & { reserved?: string[], available?: string[] }>(API_CONFIG.ENDPOINTS.GET_AVAILABLE_RESERVED, {
            params: {
                p_cust_nbr: cust_nbr,
                p_booking_id: booking_id,
                p_type: type
            }
        });
        const apiResponse = response.data;
        if (apiResponse.response_code === 200) {
            return {
                reserved: apiResponse.reserved || [],
                available: apiResponse.available || []
            };
        }
        return { reserved: [], available: [] };
    } catch (error) {
        console.error('Error fetching available/reserved containers:', error);
        return { reserved: [], available: [] };
    }
};

// getBookingShipments moved to gateApi.ts to handle complex CRO/LRO response formats


/**
 * POST reservation containers - calls external OTM API for each container
 */
export const postReservationContainers = async (request: ReservationRequest): Promise<ReservationResponse> => {
    try {
        const response = await apiClient.post<ReservationResponse>(
            API_CONFIG.ENDPOINTS.POST_RESERVATION_CONTAINERS,
            request
        );
        return response.data;
    } catch (error: any) {
        console.error('Error posting reservation containers:', error);
        // Return error response
        return {
            response_code: 500,
            response_message: error?.response?.data?.response_message || error?.message || 'Network error occurred'
        };
    }
};

// --- Hooks ---

/**
 * DELETE reservation containers - calls external OTM API for each container
 */
export const deleteReservationContainers = async (request: UnreservationRequest): Promise<ReservationResponse> => {
    try {
        const response = await apiClient.delete<ReservationResponse>(
            API_CONFIG.ENDPOINTS.DELETE_RESERVATION_CONTAINERS,
            { data: request }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error deleting reservation containers:', error);
        return {
            response_code: 500,
            response_message: error?.response?.data?.response_message || error?.message || 'Network error occurred'
        };
    }
};

export const useCustomersQuery = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['customers'],
        queryFn: getCustomers,
        enabled: enabled,
        staleTime: 0, // Always fetch fresh data per user request
    });
};

export const useBookingsQuery = (cust_nbr: string | null, searchText: string = '') => {
    return useInfiniteQuery({
        queryKey: ['bookings', cust_nbr, searchText],
        queryFn: ({ pageParam = 1 }) => getBookings(cust_nbr!, searchText, pageParam as number),
        getNextPageParam: (lastPage: { bookings: Booking[], total_count: number }, allPages: { bookings: Booking[], total_count: number }[]) => {
            const loadedCount = allPages.flatMap(p => p.bookings).length;
            if (loadedCount < lastPage.total_count) {
                return allPages.length + 1;
            }
            return undefined;
        },
        enabled: !!cust_nbr,
        initialPageParam: 1,
        staleTime: 0, // Always fetch fresh data per user request
    });
};

export const useAvailableReservedQuery = (cust_nbr: string | null, booking_id: string | null, type: string | null, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['availableReserved', cust_nbr, booking_id, type],
        queryFn: () => getAvailableReserved(cust_nbr!, booking_id!, type!),
        enabled: enabled && !!cust_nbr && !!booking_id && !!type,
        staleTime: 5000,
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
    });
};

export const useReservationMutation = () => {
    return useMutation({
        mutationFn: postReservationContainers,
    });
};

export const useDeleteReservationMutation = () => {
    return useMutation({
        mutationFn: deleteReservationContainers,
    });
};
