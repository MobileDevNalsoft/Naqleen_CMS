// Auth API Handler - Simulated Login

import type { LoginCredentials, LoginResponse } from '../types/authTypes';


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

            // Strict Role Check - Only ADMIN allowed
            if (user.role !== 'ADMIN') {
                return {
                    success: false,
                    message: 'Access Denied: You must be an ADMIN to login.'
                };
            }

            return {
                success: true,
                user: user,
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
