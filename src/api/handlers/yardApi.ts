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
    RestackContainerResponse,
    PlugInOutRequest,
    PlugInOutResponse,
    PlugInOutDetailsRequest,
    PlugInOutDetailsResponse,
    ValidateContainerRequest,
    ValidateContainerResponse
} from '../types/yardTypes';
import type {
    TaskAssignmentRequest,
    TaskAssignmentResponse,
    TaskAssignmentDetailResponse,
    AvailableOperatorsResponse,
    AssignTaskRequest,
    AssignTaskResponse
} from '../types/taskAssignmentTypes';

export const yardApi = {
    // Position Container API
    getPositionTrucks: async (request: PositionTrucksRequest): Promise<PositionTrucksResponse> => {
        const queryParams: any = {};
        if (request.searchText) queryParams.searchText = request.searchText;

        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.POSITION_TRUCKS, { params: queryParams });
        return response.data;
    },

    getPositionTruckDetails: async (request: PositionTruckDetailsRequest): Promise<PositionTruckDetailsResponse> => {
        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.POSITION_TRUCK_DETAILS, { params: { truckNbr: request.truckNbr } });
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
        if (request.containerNbr) params.container_nbr = request.containerNbr;

        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.GET_AVAILABLE_POSITION_LOV, { params });
        return response.data;
    },

    submitContainerPosition: async (request: SubmitContainerPositionRequest): Promise<SubmitContainerPositionResponse> => {
        const response = await mobileApiClient.post(API_CONFIG.ENDPOINTS.SUBMIT_CONTAINER_POSITION, request);
        return response.data;
    },

    // Restack Container API
    restackContainer: async (request: RestackContainerRequest): Promise<RestackContainerResponse> => {
        const response = await mobileApiClient.post(API_CONFIG.ENDPOINTS.RESTACK_CONTAINER, request);
        return response.data;
    },

    // Plug In/Out API
    postPlugInOutContainer: async (request: PlugInOutRequest): Promise<PlugInOutResponse> => {
        // Map request to match backend Expected format if needed. 
        // Based on Flutter code, keys are: container_nbr, type, setPointTemp, currentTemp, remarks, timestamp
        // The interface defines camelCase for convenience in React, but API might expect snake_case if it's typical APEX.
        // Checking Flutter code Step 5419: toJson() maps camelCase props to snake_case keys or matching keys.
        // Flutter: {'container_nbr': containerNbr, 'type': type, 'setPointTemp': setPointTemp, 'currentTemp': currentTemp, 'remarks': remarks, 'timestamp': timestamp}

        const payload = {
            container_nbr: request.containerNbr,
            type: request.type,
            setPointTemp: request.setPointTemp, // Flutter model uses same key
            currentTemp: request.currentTemp,   // Flutter model uses same key
            remarks: request.remarks,
            timestamp: request.timestamp
        };

        const response = await mobileApiClient.post(API_CONFIG.ENDPOINTS.PLUG_IN_OUT_CONTAINER, payload);
        return response.data;
    },

    getPlugInOutContainerDetails: async (request: PlugInOutDetailsRequest): Promise<PlugInOutDetailsResponse> => {
        // Flutter uses query param: p_contianer_nbr
        // Checking PlugInOutDetailsRequest.toQuery() in Step 5420: {'p_contianer_nbr': containerNbr} 
        // Note the typo 'contianer' in the Flutter code query param! I must match it if the backend expects it.

        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.PLUG_IN_OUT_CONTAINER_DETAILS, {
            params: { p_contianer_nbr: request.containerNbr }
        });

        // Map response logic similar to Flutter if needed, but here we just return data
        const raw = response.data;
        // Adjust response mapping if needed
        return {
            responseCode: raw.response_code,
            responseMessage: raw.response_message,
            data: raw.data
        };
    },

    // Validate Container API
    validateCfsContainer: async (request: ValidateContainerRequest): Promise<ValidateContainerResponse> => {
        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.VALIDATE_CFS_CONTAINER, {
            params: { containerNbr: request.containerNbr }
        });
        return response.data;
    },

    // Task Assignment API
    getNewTaskAssignmentShipments: async (request: TaskAssignmentRequest): Promise<TaskAssignmentResponse> => {
        const queryParams: any = {
            searchText: request.searchText || '',
            pageNum: request.pageNum || 1
        };

        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.NEW_TASK_ASSIGNMENT_SHIPMENTS, { params: queryParams });
        const raw = response.data || {};

        let rawShipments = [];
        if (Array.isArray(raw)) {
            rawShipments = raw;
        } else {
            rawShipments = raw.shipments || raw.items || raw.data || [];
        }

        const shipments = rawShipments.map((s: any) => ({
            shipmentNumber: s.shipment_xid || s.shipment_nbr || s.shipmentNumber || s.shipmentNbr || '',
            shipmentName: s.shipment_name || s.shipmentName || '',
            status: s.shipment_status || s.status || '',
            requestType: s.request_type || s.requestType || '',
            containerNumber: s.container_nbr || s.containerNumber || '',
            customer: s.customer || '',
            date: s.date || '',
            operator: s.operator || ''
        }));

        return {
            shipments,
            responseCode: raw.responseCode || raw.response_code || response.status || 200,
            responseMessage: raw.responseMessage || raw.response_message || ''
        };
    },

    getAssignedTaskAssignmentShipments: async (request: TaskAssignmentRequest): Promise<TaskAssignmentResponse> => {
        const queryParams: any = {
            searchText: request.searchText || '',
            pageNum: request.pageNum || 1
        };

        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.ASSIGNED_TASK_ASSIGNMENT_SHIPMENTS, { params: queryParams });
        const raw = response.data || {};

        let rawShipments = [];
        if (Array.isArray(raw)) {
            rawShipments = raw;
        } else {
            rawShipments = raw.shipments || raw.items || raw.data || [];
        }

        const shipments = rawShipments.map((s: any) => ({
            shipmentNumber: s.shipment_xid || s.shipment_nbr || s.shipmentNumber || s.shipmentNbr || '',
            shipmentName: s.shipment_name || s.shipmentName || '',
            status: s.shipment_status || s.status || '',
            requestType: s.request_type || s.requestType || '',
            containerNumber: s.container_nbr || s.containerNumber || '',
            customer: s.customer || '',
            date: s.date || '',
            operator: s.operator || ''
        }));

        return {
            shipments,
            responseCode: raw.responseCode || raw.response_code || response.status || 200,
            responseMessage: raw.responseMessage || raw.response_message || ''
        };
    },

    getTaskAssignmentShipmentDetails: async (shipmentNbr: string): Promise<TaskAssignmentDetailResponse> => {
        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.GET_TASK_ASSIGNMENT_SHIPMENT_DETAILS, { params: { shipmentNbr } });
        const raw = response.data || {};
        const data = raw.data || {};

        return {
            responseCode: raw.response_code || raw.responseCode || response.status || 200,
            responseMessage: raw.response_message || raw.responseMessage || '',
            data: {
                shipmentNbr: data.shipment_nbr || data.shipmentNbr || '',
                shipmentName: data.shipment_name || data.shipmentName || '',
                contNo: data.cont_no || data.contNo || '',
                customer: data.customer || '',
                operator: data.operator || '',
                status: data.status || '',
                assignedDate: data.assigned_date || data.assignedDate || ''
            }
        };
    },

    getTaskAssignmentOperators: async (searchText: string): Promise<AvailableOperatorsResponse> => {
        const response = await mobileApiClient.get(API_CONFIG.ENDPOINTS.GET_TASK_ASSIGNMENT_OPERATORS, { params: { searchText } });
        const raw = response.data || {};
        return {
            responseCode: raw.response_code || raw.responseCode || response.status || 200,
            responseMessage: raw.response_message || raw.responseMessage || '',
            data: Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : [])
        };
    },

    assignTaskToOperator: async (request: AssignTaskRequest): Promise<AssignTaskResponse> => {
        const response = await mobileApiClient.post(API_CONFIG.ENDPOINTS.ASSIGN_TASK_TO_OPERATOR, request);
        const raw = response.data || {};
        return {
            responseCode: raw.response_code || raw.responseCode || response.status || 200,
            responseMessage: raw.response_message || raw.responseMessage || ''
        };
    }
};
