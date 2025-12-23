// Release Container API Types

// Truck suggestion for autocomplete
export interface TruckSuggestion {
    truckNbr: string;
}

// Container data within a container type
export interface ContainerData {
    containerNbr: string;
    position: string;
}

// Container type data structure
export interface ContainerTypeData {
    containers: ContainerData[];
    shipments: string[];
}

// Truck details response from API
export interface ReleaseContainerTruckDetails {
    truckNbr: string;
    driverName: string;
    driverIqamaNbr: string;
    customerName: string;
    customerNbr: string;
    bookingNbr: string;
    orderType: string; // 'CRO', 'LRO', 'RELEASE_CFS'
    orderMovementXid?: string;
    containerTypes?: Record<string, ContainerTypeData>; // type -> containers & shipments
    // For RELEASE_CFS (pre-filled container info)
    containerNbr?: string;
    containerType?: string;
    shipmentNbr?: string;
    position?: string;
}

// Selected container item in UI state
export interface SelectedContainer {
    containerNbr: string;
    containerType: string;
    shipment: string;
    position: string;
}

// Container item for submit request
export interface ReleaseContainerItem {
    containerNbr: string;
    containerType: string;
    shipmentNbr: string;
    position: string;
}

// Submit release container request
export interface ReleaseContainerRequest {
    truckNbr: string;
    bookingNbr: string;
    orderType: string;
    customerNbr: string;
    customerName: string;
    orderNbr?: string;
    containers: ReleaseContainerItem[];
}

// Submit response
export interface ReleaseContainerResponse {
    success: boolean;
    message?: string;
}
