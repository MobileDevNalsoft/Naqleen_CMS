// Standard API Response Wrapper
export interface ApiResponse<T> {
    response_code: number;
    message: string;
    data: T;
}

// Lightweight object for 3D positioning
export interface ContainerPosition {
    id: string;
    x: number;
    y: number;
    z: number;
    blockId: string;
    lot: number;
    row: number;
    level: number;
    type?: string;
    status: string; // Ensure this is explicitly typed as it's used in mapping
}

// Detailed object for UI panel - matches XX_OTM_GET_CONTAINER_DETAILS response
export interface ContainerDetails {
    container_number: string;
    customer_name: string | null;
    inbound_order_nbr: string | null;
    inbound_shipment_nbr: string | null;
    container_type: string | null;
    booking_id: string | null;
    container_stored_time: string | null;
    shipment_name: string | null;
}

// Booking & Reservation Types
export interface ContainerType {
    container_type: string;
    container_count: number;
}

export interface CustomerBooking {
    cust_name: string;
    bookings: {
        booking_id: string;
        container_types: ContainerType[];
    }[];
}

export interface RecommendedContainerResponse {
    container_type: string;
    recommended_containers: string[];
}

export interface SwapCandidate {
    container_nbr: string;
    container_type: string;
    position: string;
}
