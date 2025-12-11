export const API_CONFIG = {
    BASE_URL: 'https://paas.nalsoft.net:4443/ords/xxotm/otm-web', // Use execution context relative path by default
    MOBILE_BASE_URL: 'https://paas.nalsoft.net:4443/ords/xxotm/otm-mobile',
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
        GET_RESERVED_CONTAINERS: '/getReservedContainers',
        GET_INVENTORY: '/getInventory',
        CREATE_INVENTORY: '/customerInventory',
        GET_ICDS: '/dynamic_icds.json',
        GET_LAYOUT: (id: string) => `/layout/${id}.json`, // Example for future use
    }
} as const;
