import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { API_CONFIG } from '../apiConfig';
import type { ApiResponse } from '../types/commonTypes';
import type { CustomerBookingResponse, ReservationRequest, ReservationResponse, UnreservationRequest, SwapReservationRequest } from '../types/bookingTypes';

/**
 * Fetch reserve containers
 */
export const getCustomersAndBookings = async (): Promise<CustomerBookingResponse[]> => {
    try {
        const response = await apiClient.get<ApiResponse<CustomerBookingResponse[]>>(API_CONFIG.ENDPOINTS.GET_CUSTOMERS_AND_BOOKINGS);
        const apiResponse = response.data;
        if (apiResponse.response_code === 200 && Array.isArray(apiResponse.data)) {
            return apiResponse.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching customers and bookings:', error);
        return [];
    }
};

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

export const useCustomersAndBookingsQuery = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['customersAndBookings'],
        queryFn: getCustomersAndBookings,
        enabled: enabled,
        staleTime: 0, // Always fetch fresh data
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

/**
 * SWAP reservation containers - calls external OTM API which unreserves then reserves
 */
export const swapReservation = async (request: SwapReservationRequest): Promise<ReservationResponse> => {
    try {
        const response = await apiClient.post<ReservationResponse>(
            API_CONFIG.ENDPOINTS.SWAP_RESERVATION_CONTAINERS,
            request
        );
        return response.data;
    } catch (error: any) {
        console.error('Error swapping reservation containers:', error);
        return {
            response_code: 500,
            response_message: error?.response?.data?.response_message || error?.message || 'Network error occurred'
        };
    }
};

export const useSwapReservationMutation = () => {
    return useMutation({
        mutationFn: swapReservation,
    });
};