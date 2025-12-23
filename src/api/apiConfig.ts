export const API_CONFIG = {
    WEB_BASE_URL: '/ords/xxotm/otm-web',
    MOBILE_BASE_URL: '/ords/xxotm/otm-mobile',
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    AUTH: {
        BASIC_AUTH_USERNAME: 'ADMIN',
        BASIC_AUTH_PASSWORD: 'otm@2025'
    },
    ENDPOINTS: {
        GET_CONTAINERS: '/getContainers',
        GET_CUSTOMERS_AND_BOOKINGS: '/getCustomersAndBookings',
        GET_RECOMMENDED_CONTAINERS: '/getRecommendedContainers',
        GET_CONTAINERS_OF_TYPE: '/getContainersOfType',
        GET_INVENTORY: '/getInventory',
        GET_CONTAINER_DETAILS: '/getContainerDetails',
        CREATE_INVENTORY: '/customerInventory',
        GET_ICDS: '/dynamic_icds.json',
        // Gate In endpoints
        GATE_IN_TRUCKS: '/gateInTrucks',
        GATE_IN_TRUCK_DETAILS: '/gateInTruckDetails',
        CUSTOMER_SHIPMENTS: '/customerShipments',
        SHIPMENT_DETAILS: '/shipmentDetails',
        SUBMIT_GATE_IN: '/submitGateIn',
        // Reservation endpoints
        POST_RESERVATION_CONTAINERS: '/postReservationContainers',
        DELETE_RESERVATION_CONTAINERS: '/deleteReservationContainers',
        SWAP_RESERVATION_CONTAINERS: '/swapReservationContainers',
        // Release Container endpoints
        RELEASE_CONTAINER_TRUCK_SUGGESTIONS: '/releaseContainerTruckSuggestions',
        RELEASE_CONTAINER_TRUCK_DETAILS: '/releaseContainerTruckDetails',
        SUBMIT_RELEASE_CONTAINER: '/submitReleaseContainer',
    }
} as const;
