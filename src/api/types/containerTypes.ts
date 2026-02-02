// Lightweight object for 3D positioning
export interface ContainerPosition {
    id: string;
    x: number;
    y: number;
    z: number;
    terminal: string;  // TRS or TRM
    block: string;     // A, B, C, or D
    blockId: string;
    lot: number;       // 1-based (matches API/UI)
    row: string;       // Row label directly from API (e.g., 'A', 'D', 'K')
    level: number;     // 1-based (matches API/UI)
    type?: string;
    status: string;
    customerName?: string; // Linked from grouped response
}

// Tracking event from API
export interface TrackingEvent {
    event_type: string;
    event_date: string;
}

// Detailed object for UI panel
export interface ContainerDetailsResponse {
    container_number: string;
    customer_name: string | null;
    inbound_order_nbr: string | null;
    inbound_shipment_nbr: string | null;
    container_type: string | null;
    booking_id: string | null;
    container_stored_time: string | null;
    shipment_name: string | null;
    plug_in_status?: string | null;
    tracking_events?: TrackingEvent[];
}

export interface RecommendedContainersResponse {
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
    reserved_containers?: string[];
}

/**
 * Result type for getContainers that includes both positions and lookup map
 */
export interface CfsContainer {
    id: string;
    type: string;
    status: string;
    area: string;
    customerName?: string;
}

/**
 * Result type for getContainers that includes both positions and lookup map
 */
export interface GetContainersResponse {
    positions: ContainerPosition[];
    cfsContainers: CfsContainer[];
    customerByContainer: Record<string, string>;
}

// Raw container from API (nested inside customer group)
export interface ContainerFromApi {
    container_nbr: string;
    type?: string;
    status?: string;
    position: string; // "TRS-A-2-D-1" (Terminal-Block-Lot-Row-Level) or "CFS"
}

// Customer group with nested containers (Option A structure)
export interface CustomerContainerGroup {
    customer_name: string;
    containers: ContainerFromApi[];
}

// Legacy flat structure (kept for backwards compatibility if needed)
export interface ContainersResponse {
    container_nbr: string;
    container_type?: string;
    position: {
        terminal: string;  // TRS or TRM
        block: string;     // A, B, C, or D
        block_id: string;  // e.g., "trs_block_a"
        lot: number;
        row: number;
        level: number;
    };
}

// Invalid container from API (containers with position = 'NA')
export interface InvalidContainer {
    container_nbr: string;
    container_type: string | null;
    stored_time: string | null;
    customer_name: string | null;
}

// Response from getInvalidContainers API with pagination
export interface InvalidContainersResponse {
    data: InvalidContainer[];
    total_count: number;
    offset: number;
    limit: number;
}

