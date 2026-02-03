import type { ApiResponse } from './commonTypes';

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
}
