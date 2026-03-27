import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { API_CONFIG } from './apiConfig';

/**
 * Creates an Axios instance with common configuration.
 * The request interceptor automatically injects `userId` (from the logged-in
 * user's session) as a query param on every outgoing request.
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

    // Request interceptor — subscription guard + userId injection
    client.interceptors.request.use(
        (config) => {
            // Read auth state from localStorage (persisted by authStore)
            const authRaw = localStorage.getItem('auth-storage');
            const user = authRaw
                ? JSON.parse(authRaw)?.state?.user
                : null;

            // Block requests if subscription has expired
            if (user && user.isSubscriptionValid === false) {
                const controller = new AbortController();
                config.signal = controller.signal;
                controller.abort('Subscription Expired');
                throw new axios.Cancel('Subscription Expired');
            }

            // Inject userId into every request as a query param
            if (user?.user_id) {
                config.params = {
                    ...(config.params || {}),
                    userId: user.user_id,
                };
            }

            // Inject req_location_id into every request as a header
            const currentLocation = authRaw
                ? JSON.parse(authRaw)?.state?.currentLocation
                : null;

            if (currentLocation?.id) {
                config.params = {
                    ...(config.params || {}),
                    req_location_id: currentLocation.id,
                };
            }

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
