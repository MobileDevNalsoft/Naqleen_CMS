import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { API_CONFIG } from './apiConfig';

/**
 * Creates an Axios instance with common configuration
 */
const createApiClient = (baseURL: string): AxiosInstance => {
    const client = axios.create({
        baseURL,
        timeout: API_CONFIG.TIMEOUT,
        headers: API_CONFIG.HEADERS,
        auth: {
            username: API_CONFIG.AUTH.BASIC_AUTH_USERNAME,
            password: API_CONFIG.AUTH.BASIC_AUTH_PASSWORD
        }
    });

    // Request interceptor
    client.interceptors.request.use(
        (config) => {
            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
            return config;
        },
        (error) => {
            console.error('[API Request Error]', error);
            return Promise.reject(error);
        }
    );

    // Response interceptor
    client.interceptors.response.use(
        (response) => {
            console.log(`[API Response] ${response.status} ${response.config.url}`);
            return response;
        },
        (error) => {
            if (error.response) {
                console.error(`[API Error] ${error.response.status}:`, error.response.data);
            } else if (error.request) {
                console.error('[API Error] No response received:', error.request);
            } else {
                console.error('[API Error]', error.message);
            }
            return Promise.reject(error);
        }
    );

    return client;
};

// Web API Client (for otm-web endpoints)
export const webApiClient = createApiClient(API_CONFIG.WEB_BASE_URL);

// Mobile API Client (for otm-mobile endpoints)
export const mobileApiClient = createApiClient(API_CONFIG.MOBILE_BASE_URL);

// Default export for backward compatibility
export default webApiClient;

