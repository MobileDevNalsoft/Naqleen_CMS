import { mobileApiClient } from '../apiClient';
import { API_CONFIG } from '../apiConfig';
import type {
    PositionTrucksRequest,
    PositionTrucksResponse,
    PositionTruckDetailsRequest,
    PositionTruckDetailsResponse,
    AvailablePositionRequest,
    AvailablePositionResponse,
    SubmitContainerPositionRequest,
    SubmitContainerPositionResponse,
    RestackContainerRequest,
    RestackContainerResponse
} from '../types/yardTypes';

export const yardApi = {
    // Position Container API
    getPositionTrucks: async (request: PositionTrucksRequest): Promise<PositionTrucksResponse> => {
        const queryParams: any = {};
        if (request.searchText) queryParams.searchText = request.searchText;

        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.positionTrucksEndpoint, { params: queryParams });
        return response.data;
    },

    getPositionTruckDetails: async (request: PositionTruckDetailsRequest): Promise<PositionTruckDetailsResponse> => {
        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.positionTruckDetails, { params: { truckNbr: request.truckNbr } });
        const raw = response.data;

        if (raw.response_code === 200 && raw.data) {
            return {
                responseCode: raw.response_code,
                responseMessage: raw.response_message,
                data: {
                    truckNbr: raw.data.truck_nbr,
                    driverNbr: raw.data.driver_nbr,
                    driverIqama: raw.data.driver_iqama,
                    shipmentName: raw.data.shipment_name,
                    containerNbr: raw.data.container_nbr,
                    containerType: raw.data.container_type,
                    shipmentNbr: raw.data.shipment_nbr
                }
            };
        }

        return {
            responseCode: raw.response_code || 500,
            responseMessage: raw.response_message || 'Unknown error',
            data: undefined
        };
    },

    getAvailablePositionLov: async (request: AvailablePositionRequest): Promise<AvailablePositionResponse> => {
        const params: any = {
            flag: request.flag,
            container_type: request.containerType,
        };
        if (request.terminal) params.terminal = request.terminal;
        if (request.block) params.block = request.block;
        if (request.row) params.row_no = request.row;
        if (request.lot) params.lot = request.lot;

        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.getAvailablePositionLov, { params });
        return response.data;
    },

    submitContainerPosition: async (request: SubmitContainerPositionRequest): Promise<SubmitContainerPositionResponse> => {
        const response = await mobileApiClient.post(API_CONFIG.ENDPOINTS.submitContainerPosition, request);
        return response.data;
    },

    // Restack Container API
    restackContainer: async (request: RestackContainerRequest): Promise<RestackContainerResponse> => {
        const response = await mobileApiClient.post(API_CONFIG.ENDPOINTS.restackContainer, request);
        return response.data;
    }
};
