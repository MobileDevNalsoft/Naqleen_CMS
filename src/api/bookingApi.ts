import { useQuery } from '@tanstack/react-query';
import apiClient from './apiClient';
import { API_CONFIG } from './apiConfig';
import { MOCK_CUSTOMERS_AND_BOOKINGS } from './mockData';
import type { CustomerBooking, ApiResponse } from './types';

/**
 * Fetch reserve containers
 */
export const getCustomersAndBookings = async (): Promise<CustomerBooking[]> => {
    try {
        const response = await apiClient.get<ApiResponse<CustomerBooking[]>>(API_CONFIG.ENDPOINTS.GET_CUSTOMERS_AND_BOOKINGS);
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

// --- Mock APIs for Development ---

export const getCustomersAndBookingsTest = async (): Promise<any> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_CUSTOMERS_AND_BOOKINGS.data;
};


// --- Hooks ---

export const useCustomersAndBookingsQuery = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['customersAndBookings'],
        queryFn: getCustomersAndBookings,
        enabled: enabled,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
};

export const useCustomersAndBookingsTestQuery = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['customersAndBookingsTest'],
        queryFn: getCustomersAndBookingsTest,
        enabled: enabled,
        staleTime: Infinity,
    });
};
