export interface AdminUser {
    id: number;
    username: string;
    email: string;
    roles: string[]; // Changed from single role to array of strings
    isActive: boolean;
    lastLoginAt?: string;
    createdBy?: string;
    createdDate?: string;
    lastUpdatedBy?: string;
    lastUpdatedDate?: string;
}

export interface RoleConfig {
    role: string;
    screenName: string;
    screenPath: string;
    isActive: boolean;
    createdBy?: string;
    createdDate?: string;
    lastUpdatedBy?: string;
    lastUpdatedDate?: string;
}

export interface PermissionMatrixItem {
    screenName: string;
    screenPath: string;
    category?: string; // Optional for grouping
    roles: {
        [roleName: string]: boolean; // e.g., "ADMIN": true, "DRIVER": false
    };
}

export interface CreateUserRequest {
    username: string;
    email: string;
    roles: string[];
    password?: string; // Optional, might generate one or set default
    isActive: boolean;
}

export interface UpdateUserRequest {
    id: number;
    email?: string;
    roles?: string[];
    isActive?: boolean;
    password?: string; // For reset
}

export interface UpdatePermissionRequest {
    role: string;
    screenName: string;
    screenPath: string;
    hasAccess: boolean; // true = grant (add db row), false = revoke (delete db row)
}
