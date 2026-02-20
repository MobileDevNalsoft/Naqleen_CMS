
export interface TaskAssignmentRequest {
    searchText: string;
    pageNum?: number;
}

export interface TaskAssignmentShipment {
    shipmentNumber: string;
    requestType: string;
    containerNumber?: string;
    customer?: string;
    date?: string;
    operator?: string;
    status: string;
    shipmentName?: string;
}

export interface TaskAssignmentResponse {
    shipments: TaskAssignmentShipment[];
    responseCode: number;
    responseMessage: string;
}

export interface TaskAssignmentDetail {
    shipmentNbr: string;
    shipmentName: string;
    contNo: string;
    customer: string;
    operator?: string;
    status?: string;
    assignedDate?: string;
}

export interface TaskAssignmentDetailResponse {
    responseMessage?: string;
    responseCode?: number;
    data?: TaskAssignmentDetail;
}

export interface AvailableOperatorsResponse {
    responseMessage?: string;
    responseCode?: number;
    data?: string[];
}

export interface AssignTaskRequest {
    shipment_nbr: string;
    operator: string;
}

export interface AssignTaskResponse {
    responseCode: number;
    responseMessage: string;
}
