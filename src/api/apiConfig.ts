export const API_CONFIG = {
    WEB_BASE_URL: (import.meta.env.VITE_API_BASE_URL || '') + '/ords/xxotm/otm-web',
    MOBILE_BASE_URL: (import.meta.env.VITE_API_BASE_URL || '') + '/ords/xxotm/otm-mobile',
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    AUTH: {
        BASIC_AUTH_USERNAME: 'OTM.INTEGRATION',
        BASIC_AUTH_PASSWORD: 'Naqleen@123'
    },
    // Location IDs per yard layout
    LOCATION_IDS: {
        'naqleen-jeddah': 103,
        'naqleen-dammam': 102,
    } as Record<string, number>,
    ENDPOINTS: {
        // Inventory endpoints
        GET_CONTAINERS: '/getContainers',
        GET_CUSTOMERS: '/getCustomers',
        GET_RECOMMENDED_CONTAINERS: '/getRecommendedContainers',
        GET_INVENTORY: '/getInventory',
        GET_CONTAINER_DETAILS: '/getContainerDetails',
        CREATE_INVENTORY: '/customerInventory',
        GET_ICDS: '/dynamic_icds.json',
        GET_SHIPMENT_INVENTORY: '/getShipmentInventory',
        // Gate In endpoints
        GATE_IN_TRUCKS: '/gateInTrucks',
        GATE_IN_TRUCK_DETAILS: '/gateInTruckDetails',
        CUSTOMER_SHIPMENTS: '/customerShipments',
        CUSTOMER_BOOKINGS: '/getCustomerBookings',
        GET_BOOKINGS: '/getBookings',
        GET_AVAILABLE_RESERVED: '/getAvailableReservedContainers',
        GET_LCL_ACTIVE_SHIPMENTS: '/getLclActiveShipments',
        BOOKING_SHIPMENTS: '/getBookingShipments',
        SHIPMENT_DETAILS: '/shipmentDetails',
        SUBMIT_GATE_IN: '/submitGateIn',
        // Gate Out endpoints
        GATE_OUT_TRUCKS: '/gateOutTrucks',
        GATE_OUT_TRUCK_DETAILS: '/gateOutTruckDetails',
        SUBMIT_GATE_OUT: '/submitGateOut',
        // Reservation endpoints
        POST_RESERVATION_CONTAINERS: '/postReservationContainers',
        DELETE_RESERVATION_CONTAINERS: '/deleteReservationContainers',
        // Release Container endpoints
        RELEASE_CONTAINER_TRUCKS: '/getReleaseContainerTrucks',
        RELEASE_CONTAINER_TRUCK_DETAILS: '/releaseContainerTruckDetails',
        SUBMIT_RELEASE_CONTAINER: '/submitReleaseContainer',

        // Task Assignment
        NEW_TASK_ASSIGNMENT_SHIPMENTS: '/getTaskAssignmentShipments',
        ASSIGNED_TASK_ASSIGNMENT_SHIPMENTS: '/getAssignedTasks',
        GET_TASK_ASSIGNMENT_SHIPMENT_DETAILS: '/getTaskAssignmentShipmentDetails',
        GET_TASK_ASSIGNMENT_OPERATORS: '/getTaskAssignmentOperators',
        ASSIGN_TASK_TO_OPERATOR: '/assignTaskToOperator',
        POSITION_TRUCKS: '/positionTrucks',
        POSITION_TRUCK_DETAILS: '/positionTruckDetails',
        GET_AVAILABLE_POSITION_LOV: '/getAvailablePositionLov',
        SUBMIT_CONTAINER_POSITION: '/submitContainerPosition',
        RESTACK_CONTAINER: '/restackContainer',
        PLUG_IN_OUT_CONTAINER: '/plugInOutContainer',
        PLUG_IN_OUT_CONTAINER_DETAILS: '/plugInOutContainerDetails',
        VALIDATE_CFS_CONTAINER: '/validateCfsContainer',
        // Admin endpoints
        AUTH_LOGIN: '/auth',
        ADMIN_USERS: '/users',
        USERS_CREATE: '/users',
        ADMIN_ASSIGN_ROLE: '/users/assignRole',
        ADMIN_ROLES: '/roles',
        ADMIN_SCREENS: '/screens',
        ADMIN_ROLE_PERMISSIONS: '/roles/permissions',
        USERS_UPDATE: '/user/update',
        USERS_DELETE: '/user/delete',
        // Dashboard endpoints
        GET_DASHBOARD_METRICS: '/getDashboardMetrics',
        GET_OPERATIONAL_METRICS: '/getDashboards',
        GET_DASHBOARD_DRILLDOWN: '/getDashboardDrilldown',
        // Invalid Containers endpoint
        GET_INVALID_CONTAINERS: '/getInvalidContainers',
        // Leased Containers endpoint
        GET_LEASED_CONTAINERS: '/getLeasedContainers',
        // Subscription Validation
        VALIDATE_SUBSCRIPTION: '/unisub/validateSubscription',
    }
} as const;
