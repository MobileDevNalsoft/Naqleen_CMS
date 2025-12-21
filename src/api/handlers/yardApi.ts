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
        return response.data;
    },

    getAvailablePositionLov: async (request: AvailablePositionRequest): Promise<AvailablePositionResponse> => {
        // Map request to query params matching Flutter: 'row_no' instead of 'row'
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
