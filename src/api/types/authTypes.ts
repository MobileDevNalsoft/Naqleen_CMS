// Auth Types for Login System

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface User {
    user_id: string | number;
    email: string;
    name: string;
    role: string;
    roles: string[]; // List of all assigned roles
    avatar?: string;
}

export interface LoginResponse {
    success: boolean;
    user?: User;
    token?: string;
    message: string;
}
