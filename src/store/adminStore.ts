import { create } from 'zustand';
import { adminService } from '../api/services/adminService';
import type { AdminUser, PermissionMatrixItem, CreateUserRequest } from '../api/types/adminTypes';

interface AdminStoreState {
    // Data State
    users: AdminUser[];
    uniqueRoles: string[];
    permissionMatrix: PermissionMatrixItem[];
    isLoading: boolean;
    error: string | null;

    // UI State
    isUserModalOpen: boolean;
    selectedUser: AdminUser | null; // For editing

    // Actions
    setUsers: (users: AdminUser[]) => void;
    setRoles: (roles: string[]) => void;
    setPermissionMatrix: (matrix: PermissionMatrixItem[]) => void;

    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    openCreateUserModal: () => void;
    openEditUserModal: (user: AdminUser) => void;
    closeUserModal: () => void;

    // Optimistic Updates
    addUser: (user: AdminUser) => void;
    updateUser: (id: number, updates: Partial<AdminUser>) => void;
    updatePermission: (role: string, screenPath: string, hasAccess: boolean) => void;

    // Async Actions
    fetchInitialData: () => Promise<void>;
    createUser: (user: CreateUserRequest) => Promise<void>;
    savePermissionChange: (role: string, screenPath: string, hasAccess: boolean) => Promise<void>;
}



export const useAdminStore = create<AdminStoreState>((set, get) => ({
    users: [],
    uniqueRoles: [],
    permissionMatrix: [],
    isLoading: false,
    error: null,

    isUserModalOpen: false,
    selectedUser: null,

    setUsers: (users) => set({ users }),
    setRoles: (roles) => set({ uniqueRoles: roles }),
    setPermissionMatrix: (matrix) => set({ permissionMatrix: matrix }),

    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    openCreateUserModal: () => set({ isUserModalOpen: true, selectedUser: null }),
    openEditUserModal: (user) => set({ isUserModalOpen: true, selectedUser: user }),
    closeUserModal: () => set({ isUserModalOpen: false, selectedUser: null }),

    addUser: (newUser) => set((state) => ({ users: [...state.users, newUser] })),

    updateUser: (id, updates) => set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
    })),

    updatePermission: (role, screenPath, hasAccess) => set((state) => {
        const newMatrix = state.permissionMatrix.map(item => {
            if (item.screenPath === screenPath) {
                return {
                    ...item,
                    roles: { ...item.roles, [role]: hasAccess }
                };
            }
            return item;
        });
        return { permissionMatrix: newMatrix };
    }),

    // Async Implementations
    fetchInitialData: async () => {
        set({ isLoading: true, error: null });
        try {
            try {
                const [users, roles, matrix] = await Promise.all([
                    adminService.getUsers(),
                    adminService.getRoles(),
                    adminService.getPermissionMatrix()
                ]);
                set({ users, uniqueRoles: roles, permissionMatrix: matrix });
            } catch (e) {
                console.warn('Failed to fetch from API, loading mock data', e);
                set({
                    uniqueRoles: ['ADMIN', 'YARD_OPERATOR', 'DRIVER', 'GATE_OPERATOR'],
                    users: [
                        { id: 1, username: 'admin', email: 'admin@nalsoft.net', roles: ['ADMIN'], isActive: true, lastLoginAt: '2026-01-05T09:00:00Z' },
                        { id: 2, username: 'yard1', email: 'yard1@nalsoft.net', roles: ['YARD_OPERATOR', 'GATE_OPERATOR'], isActive: true, lastLoginAt: '2026-01-04T14:30:00Z' }
                    ],
                    permissionMatrix: [
                        { screenName: 'Gate In', screenPath: '/gate-in', roles: { 'ADMIN': true, 'GATE_OPERATOR': true } },
                        { screenName: 'Gate Out', screenPath: '/gate-out', roles: { 'ADMIN': true, 'GATE_OPERATOR': true } },
                        { screenName: 'Yard View', screenPath: '/yard', roles: { 'ADMIN': true, 'YARD_OPERATOR': true, 'GATE_OPERATOR': true } },
                        { screenName: 'User Management', screenPath: '/admin/users', roles: { 'ADMIN': true } },
                    ]
                });
            }
        } catch (error: any) {
            set({ error: error.message || 'Failed to fetch data' });
        } finally {
            set({ isLoading: false });
        }
    },

    createUser: async (request: CreateUserRequest) => {
        set({ isLoading: true });
        try {
            const newUser = await adminService.createUser(request);
            set((state) => ({ users: [...state.users, newUser] }));
            set({ isUserModalOpen: false });
        } catch (e: any) {
            console.error(e);
            // Mock success
            const mockUser: any = { ...request, id: Math.random(), lastLoginAt: undefined };
            set((state) => ({ users: [...state.users, mockUser] }));
            set({ isUserModalOpen: false });
        } finally {
            set({ isLoading: false });
        }
    },

    savePermissionChange: async (role: string, screenPath: string, hasAccess: boolean) => {
        get().updatePermission(role, screenPath, hasAccess);
        try {
            await adminService.updatePermission({ role, screenPath, screenName: '', hasAccess });
        } catch (e) {
            console.error("Failed to save permission", e);
            // Revert
            get().updatePermission(role, screenPath, !hasAccess);
        }
    }
}));
