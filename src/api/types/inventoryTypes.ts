import type { ApiResponse } from './commonTypes';

// --- API Response Interfaces ---
export interface ItemData {
    item_description?: string;
    cargo_description?: string;
    hs_code?: string;
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
    containerNumber: string;
    otmShipmentNumber: string;
    contactPerson?: string;
    email?: string;
    items: InventoryItem[];
}

// --- POST Payload Interfaces ---
export interface InventoryPayloadItem {
    customer: string;
    customer_nbr?: string; // Optional if not available in UI
    container_nbr: string;
    shipment_nbr: string;
    item_description: string;
    cargo_description: string;
    hs_code: string;
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

export interface CreateInventoryPayload {
    flag: 'CHECK' | 'INSERT';
    data: InventoryPayloadItem[];
}

export interface CustomerLookupData {
    customer_nbr: string;
    customer_name: string;
}

export interface ShipmentLookupData {
    shipment_nbr: string;
    container_nbr?: string;
}
