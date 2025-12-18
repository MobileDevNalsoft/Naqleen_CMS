// Gate In Types
export interface GateTruckDetails {
    truckNumber: string;
    driverName: string;
    driverIqama: string;
    truckType: string;
    shipmentName: string;
    shipmentNumber: string;
    containerNumber: string;
    containerType: string;
    orderNumber: string;
    customerName: string;
    customerList?: GateCustomer[];
}

export interface GateCustomer {
    customerNbr: string;
    customerName: string;
}

export interface GateCustomerShipments {
    shipmentNbr: string;
    shipmentName?: string;
    containerNbr?: string;
    containerType?: string;
}

export interface GateInRequest {
    shipment_nbr: string;
    truck_nbr: string;
    driver_nbr: string;
    truck_type: string;
    container_nbr: string;
    documents: GateDocument[];
}

export interface GateDocument {
    documentXid: string;
    documentName: string;
    documentMimeType: string;
    documentBase64Content: string;
}

export interface TruckDetailsApiResponse {
    truck_nbr: string;
    driver_name: string;
    driver_iqama_nbr: string;
    truck_type: string;
    shipment_name: string;
    shipment_nbr: string;
    container_nbr: string;
    container_type: string;
    otm_order_nbr: string;
    customer_name: string;
    customer_list?: Array<{
        customer_nbr: string;
        customer_name: string;
    }>;
}
