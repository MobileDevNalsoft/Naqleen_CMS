import { mobileApiClient } from '../apiClient';
import { API_CONFIG } from '../apiConfig';
import type { ApiResponse } from '../types/commonTypes';
import type {
    CustomerInventoryData,
    InventoryApiResponse,
    InventoryItem,
    InventoryRecord,
    InventoryPayloadItem,
    CreateInventoryPayload,
    CustomerLookupData,
    ShipmentLookupData
} from '../types/inventoryTypes';

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
                hsCode: item.hs_code || '',
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
export const createInventory = async (data: Omit<InventoryRecord, 'id'>, flag: 'CHECK' | 'INSERT' = 'CHECK'): Promise<any> => {
    const url = API_CONFIG.ENDPOINTS.CREATE_INVENTORY;

    // Map UI data to API Payload
    const payloadItems: InventoryPayloadItem[] = data.items.map(item => ({
        customer: data.customer,
        customer_nbr: '', // UI doesn't have this, maybe backend handles or we need to look it up? Sending empty for now
        container_nbr: data.containerNumber,
        shipment_nbr: data.otmShipmentNumber,
        item_description: item.description,
        cargo_description: item.description, // Fallback
        hs_code: item.hsCode,
        gross_weight: parseFloat(item.grossWeight) || 0,
        net_weight: parseFloat(item.netWeight || '0') || 0,
        weight_uom: item.weightUom || 'KGM',
        volume: parseFloat(item.volume) || 0,
        volume_uom: item.volumeUom || 'M3',
        un_class: item.unClass || 'N/A',
        country_of_origin: item.countryOfOrigin || '',
        quantity: parseFloat(item.qty) || 0,
        quantity_uom: item.uom || 'EA',
        rcvd_qty: parseFloat(item.qty) || 0 // Assuming received = entered
    }));

    const payload: CreateInventoryPayload = {
        flag,
        data: payloadItems
    };

    try {
        const response = await mobileApiClient.post(url, payload);
        return response.data;
    } catch (error: any) {
        console.error("Error creating inventory:", error);
        // Rethrow or return structured error to UI
        // If 400/500, apiClient likely throws. 
        // But user says: "if response is as such show a dialog...". 
        // We need to return the response data even on error if it contains duplicate info?
        // Axios throws on non-2xx status by default. We might need to handle that.
        if (error.response && error.response.data) {
            throw error.response.data; // Throw backend error response to be caught by UI
        }
        throw error;
    }
};

export const createBulkInventory = async (payloadItems: InventoryPayloadItem[], flag: 'CHECK' | 'INSERT' = 'CHECK'): Promise<any> => {
    const url = API_CONFIG.ENDPOINTS.CREATE_INVENTORY;

    const payload: CreateInventoryPayload = {
        flag,
        data: payloadItems
    };

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
