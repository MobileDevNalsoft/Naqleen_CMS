// Auth Types for Login System

export interface LoginCredentials {
    email: string;
    password: string;
    platform: string;
}

export interface UserScreen {
    screen_name: string;
    screen_path: string;
    is_active: boolean;
    role: string;
}

export interface Location {
    id: string;
    name: string;
}

export interface User {
    user_id: string | number;
    email: string;
    name: string;
    role: string;
    roles: string[]; // List of all assigned roles
    screens: UserScreen[]; // Screen-based permissions
    accessible_locations?: Location[]; // Optional array of accessible locations
    avatar?: string;
    isSubscriptionValid?: boolean;
}

export interface LoginResponse {
    success: boolean;
    user?: User;
    token?: string;
    message: string;
}
