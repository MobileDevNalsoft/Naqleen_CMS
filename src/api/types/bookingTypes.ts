export interface Customer {
    cust_name: string;
    cust_nbr: string;
    booking_count: number;
}

// Booking List Types
export interface BookingTypeStats {
    type: string;
    total: number;
    reserved: number;
    to_plan: number;
}

export interface Booking {
    booking_id: string;
    types: BookingTypeStats[];
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
