import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../apiClient';
import { API_CONFIG } from '../apiConfig';
import type { ApiResponse } from '../types/commonTypes';
import type { GateTruckDetails, GateCustomerShipments, GateInRequest, TruckDetailsApiResponse, GateOutRequest, BookingShipmentsResponse } from '../types/gateTypes';

/**
 * Fetch truck suggestions for Gate In
 * If searchText is empty, returns all available trucks waiting for gate in
 */
export async function getGateInTrucks(searchText: string): Promise<string[]> {
    try {
        const response = await mobileApiClient.get<ApiResponse<string[]>>(
            API_CONFIG.ENDPOINTS.GATE_IN_TRUCKS,
            { params: { searchText } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching gate in trucks:', error);
        return [];
    }
}

/**
 * Fetch truck details for Gate In
 */
export async function getGateInTruckDetails(truckNbr: string): Promise<GateTruckDetails | null> {
    try {
        const response = await mobileApiClient.get<ApiResponse<TruckDetailsApiResponse>>(
            API_CONFIG.ENDPOINTS.GATE_IN_TRUCK_DETAILS,
            { params: { truckNbr } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            const raw = response.data.data;
            return {
                truckNumber: raw.truck_nbr || '',
                driverName: raw.driver_name || '',
                driverIqama: raw.driver_iqama_nbr || '',
                truckType: raw.truck_type || '',
                shipmentName: raw.shipment_name || '',
                shipmentNumber: raw.shipment_nbr || '',
                containerNumber: raw.container_nbr || '',
                containerType: raw.container_type || '',
                orderNumber: raw.otm_order_nbr || '',
                customerName: raw.customer_name || '',
                customerList: raw.customer_list?.map(c => ({
                    customerNbr: c.customer_nbr,
                    customerName: c.customer_name
                }))
            };
        }

        console.warn('Truck details not found:', truckNbr);
        return null;
    } catch (error) {
        console.error('Error fetching truck details:', error);
        return null;
    }
}

// Raw API response interface for customer shipments
interface CustomerShipmentsApiResponse {
    shipment_nbr?: string;
    shipment_name?: string;
    container_nbr?: string;
    container_type?: string;
}

/**
 * Fetch customer shipments
 */
export async function getCustomerShipments(
    customerNbr: string,
    pageNum: number = 0,
    searchText: string = ''
): Promise<GateCustomerShipments[]> {
    try {
        const response = await mobileApiClient.get<ApiResponse<CustomerShipmentsApiResponse[]>>(
            API_CONFIG.ENDPOINTS.CUSTOMER_SHIPMENTS,
            { params: { customerNbr, pageNum, searchText } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            // Transform snake_case API response to camelCase
            return response.data.data.map(item => ({
                shipmentNbr: item.shipment_nbr || '',
                shipmentName: item.shipment_name,
                containerType: item.container_type
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching customer shipments:', error);
        return [];
    }
}

/**
 * Fetch customer bookings
 */
export async function getCustomerBookings(
    customerNbr: string,
    searchText: string = ''
): Promise<string[]> {
    try {
        const response = await mobileApiClient.get<ApiResponse<string[]>>(
            API_CONFIG.ENDPOINTS.CUSTOMER_BOOKINGS,
            { params: { customerNbr, searchText } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            // Return unique booking IDs
            return [...new Set(response.data.data)];
        }
        return [];
    } catch (error) {
        console.error('Error fetching customer bookings:', error);
        return [];
    }
}

// Raw API response interface for booking shipments
interface BookingShipmentsApiResponse {
    order_type?: string;
    shipments?: Array<{
        shipment_nbr?: string;
        shipment_name?: string;
        container_nbr?: string;
        container_type?: string;
    }>;
}

/**
 * Fetch booking shipments (includes order_type for CRO/LRO detection)
 */
export async function getBookingShipments(
    bookingNbr: string,
    pageNum: number = 0,
    searchText: string = ''
): Promise<BookingShipmentsResponse> {
    try {
        const response = await mobileApiClient.get<ApiResponse<BookingShipmentsApiResponse | Array<any>>>(
            API_CONFIG.ENDPOINTS.BOOKING_SHIPMENTS,
            { params: { bookingNbr, pageNum, searchText } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            const innerData = response.data.data;
            let orderType: string | null = null;
            let shipments: GateCustomerShipments[] = [];

            if (innerData && typeof innerData === 'object' && !Array.isArray(innerData)) {
                // New format: { order_type: "CRO", shipments: [...] }
                orderType = innerData.order_type || null;
                const shipmentsData = innerData.shipments;
                if (Array.isArray(shipmentsData)) {
                    shipments = shipmentsData.map(item => ({
                        shipmentNbr: item.shipment_nbr || '',
                        shipmentName: item.shipment_name,
                        containerNbr: item.container_nbr,
                        containerType: item.container_type
                    }));
                }
            } else if (Array.isArray(innerData)) {
                // Legacy format: direct list of shipments
                shipments = innerData.map(item => ({
                    shipmentNbr: item.shipment_nbr || '',
                    shipmentName: item.shipment_name,
                    containerNbr: item.container_nbr,
                    containerType: item.container_type
                }));
            }

            return { shipments, orderType };
        }
        return { shipments: [], orderType: null };
    } catch (error) {
        console.error('Error fetching booking shipments:', error);
        return { shipments: [], orderType: null };
    }
}

/**
 * Fetch shipment details
 */
export async function getShipmentDetails(shipmentNbr: string): Promise<Record<string, string> | null> {
    try {
        const response = await mobileApiClient.get<ApiResponse<Record<string, string>>>(
            API_CONFIG.ENDPOINTS.SHIPMENT_DETAILS,
            { params: { shipmentNbr } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching shipment details:', error);
        return null;
    }
}

/**
 * Submit Gate In
 */
export async function submitGateIn(request: GateInRequest): Promise<boolean> {
    try {
        const response = await mobileApiClient.post<ApiResponse<null>>(
            API_CONFIG.ENDPOINTS.SUBMIT_GATE_IN,
            request
        );

        return response.data.response_code === 200;
    } catch (error) {
        console.error('Error submitting gate in:', error);
        throw error;
    }
}

// --- Gate Out API ---

/**
 * Fetch truck suggestions for Gate Out
 * If searchText is empty, returns all available trucks waiting for gate out
 */
export async function getGateOutTrucks(searchText: string): Promise<string[]> {
    try {
        const response = await mobileApiClient.get<ApiResponse<string[]>>(
            API_CONFIG.ENDPOINTS.GATE_OUT_TRUCKS,
            { params: { searchText } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching gate out trucks:', error);
        return [];
    }
}

/**
 * Fetch truck details for Gate Out
 * Reuses GateTruckDetails interface as structure is likely similar
 */
export async function getGateOutTruckDetails(truckNbr: string): Promise<GateTruckDetails | null> {
    try {
        const response = await mobileApiClient.get<ApiResponse<TruckDetailsApiResponse>>(
            API_CONFIG.ENDPOINTS.GATE_OUT_TRUCK_DETAILS,
            { params: { truckNbr } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            const raw = response.data.data;
            // Map raw response to clean interface
            return {
                truckNumber: raw.truck_nbr || '',
                driverName: raw.driver_name || '',
                driverIqama: raw.driver_iqama_nbr || raw.driver_iqama || '',
                truckType: raw.truck_type || '',
                shipmentName: raw.shipment_name || '',
                shipmentNumber: raw.shipment_nbr || '',
                containerNumber: raw.container_nbr || '',
                containerType: raw.container_type || '',
                orderNumber: raw.otm_order_nbr || raw.order_nbr || '',
                customerName: raw.customer_name || '',
                // Gate Out likely doesn't have ambiguity list, but we keep structure consistent
                customerList: raw.customer_list?.map(c => ({
                    customerNbr: c.customer_nbr,
                    customerName: c.customer_name
                }))
            };
        }

        console.warn('Gate Out truck details not found:', truckNbr);
        return null;
    } catch (error) {
        console.error('Error fetching gate out truck details:', error);
        return null;
    }
}

/**
 * Submit Gate Out
 */
export async function submitGateOut(request: GateOutRequest): Promise<boolean> {
    try {
        const response = await mobileApiClient.post<ApiResponse<any>>(
            API_CONFIG.ENDPOINTS.SUBMIT_GATE_OUT,
            request
        );

        return response.data.response_code === 200;
    } catch (error) {
        console.error('Error submitting gate out:', error);
        throw error;
    }
}

// --- React Query Hooks ---

export function useGateInTrucksQuery(searchText: string, enabled: boolean = true) {
    return useQuery({
        queryKey: ['gate-in-trucks', searchText],
        queryFn: () => getGateInTrucks(searchText),
        enabled: enabled, // Allow empty search to fetch all trucks
        staleTime: 30000
    });
}

export function useGateInTruckDetailsQuery(truckNbr: string, enabled: boolean = true) {
    return useQuery({
        queryKey: ['gate-in-truck-details', truckNbr],
        queryFn: () => getGateInTruckDetails(truckNbr),
        enabled: enabled && !!truckNbr,
        staleTime: 60000
    });
}

export function useCustomerShipmentsQuery(
    customerNbr: string,
    pageNum: number = 0,
    searchText: string = '',
    enabled: boolean = true
) {
    return useQuery({
        queryKey: ['customer-shipments', customerNbr, pageNum, searchText],
        queryFn: () => getCustomerShipments(customerNbr, pageNum, searchText),
        enabled: enabled && !!customerNbr,
        staleTime: 30000
    });
}

export function useCustomerBookingsQuery(
    customerNbr: string,
    searchText: string = '',
    enabled: boolean = true
) {
    return useQuery({
        queryKey: ['customer-bookings', customerNbr, searchText],
        queryFn: () => getCustomerBookings(customerNbr, searchText),
        enabled: enabled && !!customerNbr,
        staleTime: 30000
    });
}

export function useBookingShipmentsQuery(
    bookingNbr: string,
    pageNum: number = 0,
    searchText: string = '',
    enabled: boolean = true
) {
    return useQuery({
        queryKey: ['booking-shipments', bookingNbr, pageNum, searchText],
        queryFn: () => getBookingShipments(bookingNbr, pageNum, searchText),
        enabled: enabled && !!bookingNbr,
        staleTime: 30000
    });
}

// Restore useSubmitGateInMutation
export function useSubmitGateInMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: submitGateIn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gate-in-trucks'] });
            queryClient.invalidateQueries({ queryKey: ['gate-in-truck-details'] });
        }
    });
}


// --- Gate Out Hooks ---

export function useGateOutTrucksQuery(searchText: string, enabled: boolean = true) {
    return useQuery({
        queryKey: ['gate-out-trucks', searchText],
        queryFn: () => getGateOutTrucks(searchText),
        enabled: enabled,
        staleTime: 30000
    });
}

export function useGateOutTruckDetailsQuery(truckNbr: string, enabled: boolean = true) {
    return useQuery({
        queryKey: ['gate-out-truck-details', truckNbr],
        queryFn: () => getGateOutTruckDetails(truckNbr),
        enabled: enabled && !!truckNbr,
        staleTime: 60000
    });
}

export function useSubmitGateOutMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: submitGateOut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gate-out-trucks'] });
            queryClient.invalidateQueries({ queryKey: ['gate-out-truck-details'] });
        }
    });
}

