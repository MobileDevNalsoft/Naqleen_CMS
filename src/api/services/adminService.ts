import { webApiClient } from '../apiClient';
import type {
    AdminUser,
    CreateUserRequest,
    PermissionMatrixItem,
    UpdatePermissionRequest,
    UpdateUserRequest
} from '../types/adminTypes';

class AdminService {
    private readonly baseUrl = '/admin'; // Adjust based on actual API prefix

    // Users
    async getUsers(): Promise<AdminUser[]> {
        const response = await webApiClient.get<AdminUser[]>(`${this.baseUrl}/users`);
        return response.data;
    }

    async createUser(user: CreateUserRequest): Promise<AdminUser> {
        const response = await webApiClient.post<AdminUser>(`${this.baseUrl}/users`, user);
        return response.data;
    }

    async updateUser(request: UpdateUserRequest): Promise<AdminUser> {
        const response = await webApiClient.put<AdminUser>(`${this.baseUrl}/users/${request.id}`, request);
        return response.data;
    }

    // Permission Matrix
    async getPermissionMatrix(): Promise<PermissionMatrixItem[]> {
        const response = await webApiClient.get<PermissionMatrixItem[]>(`${this.baseUrl}/permissions`);
        return response.data;
    }

    async updatePermission(request: UpdatePermissionRequest): Promise<void> {
        await webApiClient.post(`${this.baseUrl}/permissions/update`, request);
    }

    // Role Config (if separate)
    async getRoles(): Promise<string[]> {
        // This might come from unique values in xx_role_config or a specific endpoint
        const response = await webApiClient.get<string[]>(`${this.baseUrl}/roles`);
        return response.data;
    }
}

export const adminService = new AdminService();
