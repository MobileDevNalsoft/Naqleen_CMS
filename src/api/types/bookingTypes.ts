import type { ContainerType } from './containerTypes';

export interface CustomerBookingResponse {
    cust_name: string;
    bookings: {
        booking_id: string;
        container_types: ContainerType[];
    }[];
}

// Reservation API types
export interface ReservationRequest {
    booking_id: string;
    reserve_containers: string[];
}

export interface ReservationResponse {
    response_code: number;
    response_message: string;
    success_count?: number;
    fail_count?: number;
    booking_id?: string;
    debug_errors?: string;
}

export interface UnreservationRequest {
    booking_id: string;
    unreserve_containers: string[];
}

export interface SwapReservationRequest {
    booking_id: string;
    unreserve_containers: string[];
    reserve_containers: string[];
}
