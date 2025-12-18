// Auth API Handler - Simulated Login

import type { LoginCredentials, LoginResponse } from '../types/authTypes';

// Demo credentials
const DEMO_EMAIL = 'admin@nalsoft.net';
const DEMO_PASSWORD = 'Admin@123';

/**
 * Simulated login API
 * Validates against demo credentials with realistic delay
 */
export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
    // Simulate network delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { email, password } = credentials;

    // Validate against demo credentials
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        return {
            success: true,
            user: {
                id: 'usr_001',
                email: DEMO_EMAIL,
                name: 'Admin User',
                role: 'admin',
            },
            token: 'demo_jwt_token_' + Date.now(),
            message: 'Login successful',
        };
    }

    // Invalid credentials
    return {
        success: false,
        message: 'Invalid email or password',
    };
}
