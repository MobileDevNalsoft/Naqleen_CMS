// Auth Types for Login System

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user' | 'viewer';
    avatar?: string;
}

export interface LoginResponse {
    success: boolean;
    user?: User;
    token?: string;
    message: string;
}
