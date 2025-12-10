import axios from 'axios';
import { API_CONFIG } from './apiConfig';

/**
 * Axios instance with common configuration
 * 
 * Benefits over fetch:
 * - Automatic JSON parsing
 * - Better error handling (throws on 4xx, 5xx)
 * - Request/response interceptors
 * - Timeout support
 * - Request cancellation
 */
const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: API_CONFIG.HEADERS,
    auth: {
        username: API_CONFIG.AUTH.BASIC_AUTH_USERNAME,
        password: API_CONFIG.AUTH.BASIC_AUTH_PASSWORD
    }
});

// Request interceptor (useful for adding auth tokens, logging, etc.)
apiClient.interceptors.request.use(
    (config) => {
        // You can add auth tokens here in the future
        // config.headers.Authorization = `Bearer ${token}`;
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// Response interceptor (useful for global error handling, logging, etc.)
apiClient.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        // Global error handling
        if (error.response) {
            // Server responded with error status
            console.error(`[API Error] ${error.response.status}:`, error.response.data);
        } else if (error.request) {
            // Request made but no response
            console.error('[API Error] No response received:', error.request);
        } else {
            // Error setting up request
            console.error('[API Error]', error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
