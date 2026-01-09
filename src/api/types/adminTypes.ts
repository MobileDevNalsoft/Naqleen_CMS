export interface AdminUser {
    USER_ID: number;
    USERNAME: string;
    EMAIL: string;
    // Roles will be fetched separately or joined, but for now let's keep it simple
    ROLES?: string[];
    IS_ACTIVE: 'Y' | 'N';
    LASTLOGINAT?: string;
    CREATED_BY?: string;
    CREATION_DATE?: string;
    LAST_UPDATED_BY?: string;
    LAST_UPDATE_DATE?: string;
}

export interface RoleConfig {
    ROLE: string;
    SCREEN_NAME: string;
    SCREEN_PATH: string;
    IS_ACTIVE: 'Y' | 'N';
    CREATED_BY?: string;
    CREATED_DATE?: string;
    LAST_UPDATED_BY?: string;
    LAST_UPDATED_DATE?: string;
}

export interface UserRoleAssignment {
    ASSIGNMENT_ID: number;
    USER_ID: number;
    ROLE_CODE: string;
    IS_ACTIVE: 'Y' | 'N';
    CREATED_BY?: string;
    CREATION_DATE?: string;
    LAST_UPDATED_BY?: string;
    LAST_UPDATE_DATE?: string;
}

// Frontend helper types
export interface RoleAccessMatrix {
    roleName: string;
    permissions: {
        screenName: string;
        screenPath: string;
        hasAccess: boolean;
    }[];
}

export interface CreateRoleRequest {
    roleName: string;
    screens: { screenName: string; screenPath: string }[];
}

export interface UpdateRolePermissionRequest {
    roleName: string;
    screenName: string;
    screenPath: string;
    isActive: boolean; // true to add/enable, false to remove/disable
}

export interface AssignRoleRequest {
    userId: number;
    roleCode: string; // XX_USER_ROLE_ASSIGNMENT uses ROLE_CODE
    action: 'assign' | 'remove';
}

export interface ApiResponse<T> {
    response_code: number;
    response_message: string;
    // Dynamic keys depending on the procedure, usually 'data' or specific key like 'users', 'roles'.
    // We will handle specific keys in the service.
    [key: string]: any;
}
