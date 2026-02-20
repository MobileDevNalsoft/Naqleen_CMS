import { mobileApiClient } from '../../../api/apiClient';
import { API_CONFIG } from '../../../api/apiConfig';
import type { ApiResponse } from '../../../api/apiTypes';
import type {
    CustomerInventoryData,
    InventoryApiResponse,
    InventoryItem,
    InventoryRecord,
    InventoryImportRow,
    InventoryContainerPayload,
    InventoryItemPayload,

    CustomerLookupData,
    ShipmentLookupData,
    CFSShipment,
    CFSHistoryResponse
} from '../types/inventoryTypes';

// Function to fetch shipment inventory (CFS History)
export const fetchShipmentInventory = async (params: { searchBy: 'shipment' | 'customer' | 'item_code', searchValue: string }): Promise<CFSShipment[]> => {
    try {
        const response = await mobileApiClient.get<CFSHistoryResponse>(API_CONFIG.ENDPOINTS.GET_SHIPMENT_INVENTORY, {
            params: {
                // Map frontend searchBy to backend expected params if needed, or send as is
                // Based on user request "search by shipment number, customer or item code"
                // Assuming backend takes generic search params or specific ones. 
                // Let's assume generic 'search_by' and 'search_value' or specific keys.
                // Given the context of OTM, it's often specific keys. 
                // Let's try sending all three as optional params based on selection.
                shipmentNbr: params.searchBy === 'shipment' ? params.searchValue : undefined,
                customerName: params.searchBy === 'customer' ? params.searchValue : undefined,
                itemCode: params.searchBy === 'item_code' ? params.searchValue : undefined
            }
        });

        if (response.data && Array.isArray(response.data.data)) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching shipment inventory:", error);
        throw error;
    }
};

// Function to fetch inventory with search params
export const fetchInventory = async (params: { searchCust?: string, searchCont?: string, searchShip?: string, pageNum?: number } = {}): Promise<InventoryRecord[]> => {
    const { searchCust = '', searchCont = '', searchShip = '', pageNum = 0 } = params;

    try {
        const response = await mobileApiClient.get<InventoryApiResponse>(API_CONFIG.ENDPOINTS.GET_INVENTORY, {
            params: {
                searchCust: searchCust,
                searchCont: searchCont,
                searchShip: searchShip,
                pageNum: pageNum
            }
        });

        console.log("FetchInventory Response:", response);
        console.log("FetchInventory Body:", response.data);

        let records: CustomerInventoryData[] = [];
        if (response.data) {
            if (Array.isArray(response.data.data)) {
                records = response.data.data;
            } else if (Array.isArray(response.data.items)) {
                records = response.data.items;
            } else if (Array.isArray(response.data)) {
                // This case might happen if the API directly returns an array without a wrapper object
                // We need to ensure the type is compatible with CustomerInventoryData[]
                records = response.data;
            }
        }

        if (records.length > 0) {
            const mapped = mapApiResponseToInventoryRecords(records);
            console.log("Mapped Records:", mapped);
            return mapped;
        }
        return [];
    } catch (error) {
        console.error("Error fetching inventory:", error);
        throw error;
    }
};

const mapApiResponseToInventoryRecords = (apiData: CustomerInventoryData[]): InventoryRecord[] => {
    const records: InventoryRecord[] = [];

    apiData.forEach(customerData => {
        customerData.containers.forEach(container => {
            const items: InventoryItem[] = container.items.map((item, index) => ({
                id: `${container.container_nbr}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Robust ID
                hsCode: item.item_code || '',
                qty: item.quantity?.toString() || '0',
                description: item.item_description || item.cargo_description || '', // Fallback to cargo desc
                uom: item.quantity_uom || '',
                grossWeight: item.gross_weight?.toString() || '0',
                netWeight: item.net_weight?.toString(),
                weightUom: item.weight_uom,
                volume: item.volume?.toString() || '0',
                volumeUom: item.volume_uom,
                unClass: item.un_class,
                countryOfOrigin: item.country_of_origin
            }));

            records.push({
                id: `${customerData.customer}-${container.container_nbr}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                customer: customerData.customer,
                containerNumber: container.container_nbr || 'N/A',
                otmShipmentNumber: container.shipment_nbr || 'N/A',
                items: items
            });
        });
    });

    return records;
};

// --- POST Payload Interfaces ---

// Function to create new inventory 
export const createInventory = async (data: Omit<InventoryRecord, 'id'>): Promise<any> => {
    const url = API_CONFIG.ENDPOINTS.CREATE_INVENTORY;

    // Map UI data to API Payload (Nested)
    const itemsPayload: InventoryItemPayload[] = data.items.map(item => ({
        item_code: item.hsCode,
        item_description: item.description,
        quantity: parseFloat(item.qty) || 0,
        quantity_uom: item.uom || 'EA',
        gross_weight: parseFloat(item.grossWeight) || 0,
        net_weight: parseFloat(item.netWeight || '0') || 0,
        weight_uom: item.weightUom || 'KGM',
        volume: parseFloat(item.volume) || 0,
        volume_uom: item.volumeUom || 'M3',
        UN_Class: item.unClass || 'N/A',
        country_of_origin: item.countryOfOrigin || ''
    }));

    const containerPayload: InventoryContainerPayload = {
        customer_name: data.customer,
        customer_nbr: data.customerNumber || '', // Use passed customer number
        container_nbr: data.containerNumber,
        shipment_nbr: data.otmShipmentNumber,
        shipment_name: data.otmShipmentNumber, // Using shipment number as name if not available
        cargo_description: itemsPayload[0]?.item_description || '', // Use first item desc as cargo desc
        items: itemsPayload
    };

    // User requested direct payload
    const payload = containerPayload;

    console.log("createInventory Payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await mobileApiClient.post(url, payload);
        return response.data;
    } catch (error: any) {
        console.error("Error creating inventory:", error);
        if (error.response && error.response.data) {
            throw error.response.data; // Throw backend error response to be caught by UI
        }
        throw error;
    }
};

export const createBulkInventory = async (importRows: InventoryImportRow[]): Promise<any> => {
    const url = API_CONFIG.ENDPOINTS.CREATE_INVENTORY;

    // Group import rows by Container (and Shipment)
    const containerMap = new Map<string, InventoryContainerPayload>();

    importRows.forEach(row => {
        const key = `${row.container_nbr}-${row.shipment_nbr}`;

        if (!containerMap.has(key)) {
            containerMap.set(key, {
                customer_name: row.customer,
                customer_nbr: row.customer_nbr || '',
                container_nbr: row.container_nbr,
                shipment_nbr: row.shipment_nbr,
                shipment_name: row.shipment_nbr,
                cargo_description: row.cargo_description || row.item_description,
                items: []
            });
        }

        const container = containerMap.get(key)!;
        container.items.push({
            item_code: row.item_code,
            item_description: row.item_description,
            quantity: row.quantity,
            quantity_uom: row.quantity_uom,
            gross_weight: row.gross_weight,
            net_weight: row.net_weight,
            weight_uom: row.weight_uom,
            volume: row.volume,
            volume_uom: row.volume_uom,
            UN_Class: row.un_class,
            country_of_origin: row.country_of_origin
        });
    });

    // User requested direct payload
    const payload = Array.from(containerMap.values());

    console.log("createBulkInventory Payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await mobileApiClient.post(url, payload);
        return response.data;
    } catch (error: any) {
        console.error("Error creating bulk inventory:", error);
        if (error.response && error.response.data) {
            throw error.response.data;
        }
    }
};

export const fetchCustomerLookup = async (searchText: string): Promise<CustomerLookupData[]> => {
    try {
        const response = await mobileApiClient.get<ApiResponse<CustomerLookupData[]>>('/customerInventoryCustomers', {
            params: { p_search_text: searchText }
        });

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching customer lookup:", error);
        return [];
    }
};

export const fetchShipmentLookup = async (customerNbr: string, searchText: string): Promise<ShipmentLookupData[]> => {
    try {
        const response = await mobileApiClient.get<ApiResponse<ShipmentLookupData[]>>('/customerInventoryShipments', {
            params: { customerNbr: customerNbr, searchText: searchText }
        });

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching shipment lookup:", error);
        return [];
    }
};

export interface CustomerStockItem {
    cust_name: string;
    cust_nbr: string;
    item_code: string;
    item_description: string;
    available_qty: number;
    qty_uom: string;
    net_weight: number;
    weight_uom: string;
}

export const fetchCustomerStock = async (customerName?: string, itemCode?: string): Promise<CustomerStockItem[]> => {
    try {
        const params: any = {};
        if (customerName) {
            params.customerName = customerName;
        }
        if (itemCode) {
            params.itemCode = itemCode;
        }

        const response = await mobileApiClient.get<ApiResponse<CustomerStockItem[]>>('/getCustomerStock', {
            params: params
        });

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching customer stock:", error);
        return [];
    }
};
