// Gate In Types

/**
 * One shipment on the truck, from `data.shipments[]`.
 *
 * A truck can be attached to up to TWO shipments, and shipment:container is
 * 1:1 -- so this array is also the list of containers. It never exceeds two;
 * XX_OTM_GET_GATE_IN_TRUCK_DETAILS caps collection at c_max_ships = 2.
 */
export interface GateShipment {
    shipmentNbr: string;
    shipmentName: string;
    containerNbr: string;
    containerType: string;
    customerName: string;
    customerNbr: string;
    loadStatus: string;
    orderNumber: string;
    /**
     * Already gated in on THIS visit. Read from VM.GATE_IN_SHIPMENTS, which
     * gate in alone writes -- deliberately NOT from VM.SHIPMENT_NBR, which
     * inspection also sets and would report a shipment as done before it was.
     */
    gateInCompleted: boolean;
}

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
    orderType: string;
    customerName: string;
    customerList?: GateCustomer[];
    lclOptions?: string[];
    /**
     * Every shipment on the truck. Populated by the Gate In path only; the
     * Gate Out path returns one GateTruckDetails per shipment instead and
     * leaves this undefined.
     *
     * The flat fields above mirror ONE shipment -- shipments[0] on load, then
     * whichever tab is active. They are what the ~1800 lines of this panel's
     * rendering read, so projecting the active shipment onto them is what
     * keeps the single-shipment layout working unchanged.
     */
    shipments?: GateShipment[];
    /** How many shipments are still outstanding. Server-computed. */
    pendingCount?: number;
    /**
     * Which screen to open, stated by the server rather than inferred.
     * 'SHIPMENTS' means shipment details are present. The old inference --
     * customer_list being non-empty -- read a legitimately EMPTY list as
     * "details present" and rendered blank shipment and container fields.
     */
    flow?: string;
}

export interface GateCustomer {
    customerNbr: string;
    customerName: string;
}

export interface GateCustomerShipments {
    shipmentNbr: string;
    shipmentName?: string;
    containerType?: string;
    containerNbr?: string;
}

export interface GateLclShipment {
    shipmentNbr: string;
    shipmentName: string;
    containerNbr: string;
    containerType: string;
    customerName: string;
    orderNbr: string;
    truckNbr: string;
    driverName: string;
    driverIqama: string;
}

export interface GateInRequest {
    shipment_nbr: string;
    truck_nbr: string;
    driver_nbr: string;
    truck_type: string;
    container_nbr: string;
    documents: GateDocument[];
    // Optional fields for CRO/LRO flow
    customer_nbr?: string;
    customer_name?: string;
    booking_id?: string;
    order_type?: string;
}

export interface GateDocument {
    documentXid: string;
    documentName: string;
    documentMimeType: string;
    documentBase64Content: string;
}

/** One entry of `data.shipments[]` as ORDS emits it. */
export interface ShipmentApiResponse {
    shipment_nbr?: string;
    shipment_name?: string;
    container_nbr?: string;
    container_type?: string;
    customer_name?: string;
    customer_nbr?: string;
    load_status?: string;
    otm_order_nbr?: string;
    /** A real JSON boolean, not 'Y'/'N' -- apex_json.write emits it as one. */
    gate_in_completed?: boolean;
}

export interface TruckDetailsApiResponse {
    truck_nbr: string;
    driver_name: string;
    driver_nbr?: string;
    driver_iqama_nbr?: string;
    driver_iqama?: string;
    truck_type: string;
    shipment_name: string;
    shipment_nbr: string;
    container_nbr: string;
    container_type: string;
    otm_order_nbr: string;
    order_nbr:string
    order_type?: string;
    customer_name: string;
    customer_list?: Array<{
        customer_nbr: string;
        customer_name: string;
    }>;
    lcl_options?: string[];
    // Dual-shipment fields. All optional: absent on an older server build, and
    // absent on the LCL and CRO/LRO branches, which return a customer list
    // instead of shipment details.
    shipments?: ShipmentApiResponse[];
    shipment_count?: number;
    pending_count?: number;
    flow?: string;
}

// Gate Out Types
export interface GateOutRequest {
    shipment_nbr: string;
    truck_nbr: string;
}

// Booking Shipments Response (includes order_type for CRO/LRO detection)
export interface BookingShipmentsResponse {
    shipments: GateCustomerShipments[];
    orderType: string | null;
}
