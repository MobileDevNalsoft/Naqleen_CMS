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
    status: string;
}

// Detailed object for UI panel
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

export interface RecommendedContainerResponse {
    container_type: string;
    recommended_containers: string[];
}

export interface SwapCandidate {
    container_nbr: string;
    container_type: string;
    position: string;
}

// Also used in booking, but primarily a container spec
export interface ContainerType {
    container_type: string;
    container_count: number;
}

export interface ContainerApiResponse {
    container_nbr: string;
    container_type?: string;
    position: {
        block_id: string;
        lot: number;
        row: number;
        level: number;
    };
}
