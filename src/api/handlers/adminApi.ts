import { webApiClient } from '../apiClient';
import { API_CONFIG } from '../apiConfig';
import type {
    AdminUser,
    RoleConfig,
    CreateRoleRequest,
    UpdateRolePermissionRequest,
    ApiResponse,
    CreateUserRequest,
    UpdateUserRequest
} from '../types/adminTypes';

class AdminService {

    // --- Users ---
    async getUsers(): Promise<AdminUser[]> {
        // Backend returns { ... users: [...] }
        const response = await webApiClient.get<ApiResponse<AdminUser[]>>(API_CONFIG.ENDPOINTS.ADMIN_USERS);
        return response.data.users || [];
    }

    async createUser(payload: CreateUserRequest): Promise<void> {
        await webApiClient.post(API_CONFIG.ENDPOINTS.USERS_CREATE, payload);
    }

    async updateUser(payload: UpdateUserRequest): Promise<void> {
        await webApiClient.post(API_CONFIG.ENDPOINTS.USERS_UPDATE, payload);
    }

    async deleteUser(email: string): Promise<void> {
        // Using DELETE on user/update endpoint with query param as configured in ORDS handler (:email)
        await webApiClient.delete(API_CONFIG.ENDPOINTS.USERS_UPDATE, {
            params: { email }
        });
    }

    // --- Roles & Permissions ---

    // Fetch all distinct roles defined in the system
    async getAllRoles(): Promise<string[]> {
        const response = await webApiClient.get<ApiResponse<any>>(API_CONFIG.ENDPOINTS.ADMIN_ROLES);
        // XX_GET_ALL_ROLES returns { roles: ["R1", "R2"] }
        return response.data.roles || [];
    }

    // Fetch master list of all available screens (for configuration)
    async getMasterScreenList(): Promise<{ screenName: string; screenPath: string }[]> {
        const response = await webApiClient.get<ApiResponse<any>>(API_CONFIG.ENDPOINTS.ADMIN_SCREENS);
        // XX_GET_MASTER_SCREEN_LIST returns { screens: [{screenName, screenPath}] }
        return response.data.screens || [];
    }

    // Get configuration for a specific role
    async getRoleConfig(roleName: string): Promise<RoleConfig[]> {
        const response = await webApiClient.get<ApiResponse<any>>(`${API_CONFIG.ENDPOINTS.ADMIN_ROLES}/${roleName}`);
        // XX_GET_ROLE_INFO (existing proc I saw) returns { role_info: { screens: [...] } }
        // The endpoint likely calls that.
        const screens = response.data.role_info?.screens || [];
        // Map backend to frontend model
        return screens.map((s: any) => ({
            ROLE: roleName,
            SCREEN_NAME: s.screen_name,
            SCREEN_PATH: s.screen_path,
            IS_ACTIVE: s.is_active ? 'Y' : 'N'
        }));
    }

    // Create a new role with initial permissions
    async createRole(request: CreateRoleRequest): Promise<void> {
        await webApiClient.post(API_CONFIG.ENDPOINTS.ADMIN_ROLES, request);
    }

    // Update permission for a role on a specific screen
    async updateRolePermission(request: UpdateRolePermissionRequest): Promise<void> {
        await webApiClient.post(API_CONFIG.ENDPOINTS.ADMIN_ROLE_PERMISSIONS, request);
    }

    // Delete a role
    async deleteRole(roleName: string): Promise<void> {
        // Using query param or path param depending on ORDS setup. 
        // Assuming path param for standard REST: DELETE /admin/roles/ROLE_NAME
        // But role names might have special chars? Usually not.
        await webApiClient.delete(`${API_CONFIG.ENDPOINTS.ADMIN_ROLES}/${roleName}`);
    }
}

export const adminService = new AdminService();
