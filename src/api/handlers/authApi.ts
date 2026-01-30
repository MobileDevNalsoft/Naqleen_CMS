// Auth API Handler - Simulated Login

import type { LoginCredentials, LoginResponse, UserScreen } from '../types/authTypes';


import { webApiClient } from '../apiClient';
import { API_CONFIG } from '../apiConfig';

/**
 * Login API
 * Authenticates user against OTM Backend
 */
export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
        const response = await webApiClient.post<any>(API_CONFIG.ENDPOINTS.AUTH_LOGIN, credentials);

        // ORDS might return different structures depending on setup, but typically wrapper
        // Our procedure returns { response_code, response_message, data: { ... } }
        // webApiClient unwraps 'data' usually? No, axios returns { data: ... }. 
        // Let's assume webApiClient returns AxiosResponse or the data directly?
        // Checking existing patterns... adminApi uses webApiClient.get<ApiResponse<...>>

        const data = response.data; // content of response

        if (data.response_code === 200) {
            const user = data.data;

            // Ensure screens array exists (default to empty if missing)
            const screens: UserScreen[] = user.screens || [];

            // Path-Based Access Check - Must have /3d-view OR /dashboards
            const hasViewAccess = screens.some(
                (s: UserScreen) =>
                    s.is_active && (s.screen_path === '/3d-view' || s.screen_path === '/dashboards')
            );

            if (!hasViewAccess) {
                return {
                    success: false,
                    message: 'Access Denied: You do not have access to any views. Please contact support.'
                };
            }

            return {
                success: true,
                user: {
                    ...user,
                    screens: screens // Ensure screens is always included
                },
                token: 'session_active',
                message: data.response_message
            };
        } else {
            return {
                success: false,
                message: data.response_message || 'Login failed'
            };
        }
    } catch (error: any) {
        console.error("Login Error", error);
        return {
            success: false,
            message: error.response?.data?.response_message || 'Network error occurred'
        };
    }
}

