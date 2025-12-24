
export interface PositionTrucksRequest {
    searchText?: string;
}

export interface PositionTrucksResponse {
    responseCode: number;
    responseMessage: string;
    data?: string[];
}

export interface PositionTruckDetailsRequest {
    truckNbr: string;
}

export interface PositionTruckDetails {
    truckNbr: string;
    driverNbr: string;
    driverIqama: string;
    shipmentName: string;
    containerNbr: string;
    containerType: string;
    shipmentNbr: string;
}

export interface PositionTruckDetailsResponse {
    responseCode: number;
    responseMessage: string;
    data?: PositionTruckDetails;
}

export interface AvailablePositionRequest {
    flag: 'I' | 'T' | 'B' | 'R' | 'L'; // I=Init/Terminals, T=Blocks, B=Lots, L=Rows, R=Levels
    containerType: string;
    terminal?: string;
    block?: string;
    row?: string;
    lot?: string;
}

export interface AvailablePositionData {
    blocks?: string[];
    rows?: string[];
    lots?: string[];
    level?: number;
    terminals?: string[];
}

export interface AvailablePositionResponse {
    responseCode: number;
    responseMessage: string;
    data?: AvailablePositionData;
}

export interface SubmitContainerPositionRequest {
    shipment_nbr: string;
    container_nbr: string;
    position: string;
}

export interface SubmitContainerPositionResponse {
    response_code: number;
    response_message: string;
    data?: any;
}

// Restacking Types

export interface RestackContainerRequest {
    container_nbr: string;
    newPosition: string;
    currentPosition: string;
    timestamp: string;
}

export interface RestackContainerResponse {
    response_code: number;
    response_message: string;
    data?: any;
}

// Plug In/Out Types
export interface PlugInOutRequest {
    containerNbr: string;
    type: 'Plugged' | 'Unplugged';
    setPointTemp: string;
    currentTemp: string;
    remarks?: string;
    timestamp: string;
}

export interface PlugInOutResponse {
    response_code: number;
    response_message: string;
}

export interface PlugInOutDetailsRequest {
    containerNbr: string;
}

export interface PlugInOutHistoryItem {
    timestamp: string;
    type: string; // "Plugged" or "Unplugged"
    setPointTemp?: string;
    currentTemp?: string;
    remarks?: string;
}

export interface PlugInOutDetailsData {
    container_nbr: string;
    history: PlugInOutHistoryItem[];
}

export interface PlugInOutDetailsResponse {
    responseCode: number;
    responseMessage: string;
    data?: PlugInOutDetailsData;
}

export interface ValidateContainerRequest {
    containerNbr: string;
}

export interface ValidateContainerResponse {
    response_code: number;
    response_message: string;
    data?: {
        is_valid: boolean;
        container_nbr: string;
        validation_message: string;
    }
}
