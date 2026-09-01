import type { ApiResponse } from '../../../api/apiTypes';

// --- API Response Interfaces ---
export interface ItemData {
    item_description?: string;
    cargo_description?: string;
    item_code?: string;
    gross_weight?: number;
    net_weight?: number;
    weight_uom?: string;
    volume?: number;
    volume_uom?: string;
    un_class?: string;
    country_of_origin?: string;
    quantity?: number;
    quantity_uom?: string;
}

export interface ContainerData {
    container_nbr?: string;
    shipment_nbr?: string;
    items: ItemData[];
}

export interface CustomerInventoryData {
    customer: string;
    customer_nbr: string;
    containers: ContainerData[];
}

// Extended response type for inventory (has optional items field)
export interface InventoryApiResponse extends ApiResponse<CustomerInventoryData[]> {
    items?: CustomerInventoryData[];
}

// --- UI Interfaces ---
export interface InventoryItem {
    id: string;
    hsCode: string;
    qty: string;
    description: string;
    uom: string;
    grossWeight: string;
    netWeight?: string;
    weightUom?: string;
    volume: string;
    volumeUom?: string;
    unClass?: string;
    countryOfOrigin?: string;
}

export interface InventoryRecord {
    id: string;
    customer: string;
    customerNumber?: string; // Added for manual entry
    containerNumber: string;
    otmShipmentNumber: string;
    /**
     * The operation on the selected shipment, carried through from the lookup.
     * STUFFING and LOADING_LCL deduct stock; DESTUFFING, OFFLOADING_LCL and
     * STORE_AS_IT_IS add to it.
     */
    shipmentName?: string;
    contactPerson?: string;
    email?: string;
    items: InventoryItem[];
}

// --- POST Payload Interfaces ---
// --- POST Payload Interfaces ---

// Flat structure for Excel Import (Intermediate)
export interface InventoryImportRow {
    customer: string;
    customer_nbr?: string;
    container_nbr: string;
    shipment_nbr: string;
    item_description: string;
    cargo_description: string; // Usually same as description or separate?
    item_code: string; // was hs_code
    gross_weight: number;
    net_weight: number;
    weight_uom: string;
    volume: number;
    volume_uom: string;
    un_class: string;
    country_of_origin: string;
    quantity: number;
    quantity_uom: string;
    rcvd_qty: number;
}

// Nested Payload for API
export interface InventoryItemPayload {
    item_code: string;
    item_description: string;
    quantity: number;
    quantity_uom: string;
    gross_weight: number;
    net_weight: number;
    weight_uom: string;
    volume: number;
    volume_uom: string;
    UN_Class: string;
    country_of_origin: string;
}

export interface InventoryContainerPayload {
    customer_name: string;
    customer_nbr: string;
    container_nbr: string;
    shipment_nbr: string;
    shipment_name: string;
    cargo_description: string;
    items: InventoryItemPayload[];
}

export interface CreateInventoryPayload {
    flag: 'CHECK' | 'INSERT';
    data: InventoryContainerPayload[];
}

export interface CustomerLookupData {
    customer_number: string;
    customer_name: string;
}

export interface ShipmentLookupData {
    shipment_nbr: string;
    container_nbr?: string;
    /**
     * The OPERATION -- DESTUFFING, STORE_AS_IT_IS, OFFLOADING_LCL, STUFFING or
     * LOADING_LCL -- not a label for the shipment. It decides which way stock
     * moves: the first three add to customer stock, the last two deduct from it.
     *
     * /customerInventoryShipments has always returned this; the CMS just never
     * captured it, and sent the shipment NUMBER in the shipment_name field
     * instead.
     */
    shipment_name?: string;
}

// --- CFS History Types ---

export interface CFSItem {
    item_code: string;
    item_description: string;
    quantity: number;
    weight: number;
    package_uom: string;
    weight_uom: string;
}

export interface CFSShipment {
    shipment_nbr: string;
    customer_name: string;
    customer_number: string;
    shipment_name: string;
    operator: string;
    items: CFSItem[];
}

export interface CFSHistoryResponse extends ApiResponse<CFSShipment[]> { }
