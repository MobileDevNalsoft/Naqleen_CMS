export const API_CONFIG = {
    BASE_URL: 'https://paas.nalsoft.net:4443/ords/xxotm/otm-web', // Use execution context relative path by default
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
        GET_ICDS: '/dynamic_icds.json',
        GET_LAYOUT: (id: string) => `/layout/${id}.json`, // Example for future use
    }
} as const;
