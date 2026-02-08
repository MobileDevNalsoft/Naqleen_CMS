import { create } from 'zustand';
import type { AdminUser, RoleConfig } from '../types/adminTypes';
import { adminService } from '../apis/adminApi';

interface AdminStore {
    // Data State
    roles: string[];
    masterScreens: { screenName: string; screenPath: string }[];
    users: AdminUser[];
    availableRoles: string[]; // For UserManagement dropdowns

    // Role Config Cache (Map roleName -> config[])
    roleConfigs: Record<string, RoleConfig[]>;

    // Metadata
    rolesLastFetched: number | null;
    usersLastFetched: number | null;

    // Actions
    fetchRolesAndScreens: (force?: boolean) => Promise<void>;
    fetchUsers: (force?: boolean) => Promise<void>;
    fetchRoleConfig: (roleName: string, force?: boolean) => Promise<void>;

    // Updates
    setUsers: (users: AdminUser[]) => void;
    updateUser: (user: AdminUser) => void;
    updateRoleConfigCache: (roleName: string, config: RoleConfig[]) => void;
    createRole: (roleName: string) => Promise<void>;
    deleteRole: (roleName: string) => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
    roles: [],
    masterScreens: [],
    users: [],
    availableRoles: [],
    roleConfigs: {},
    rolesLastFetched: null,
    usersLastFetched: null,

    fetchRolesAndScreens: async (force = false) => {
        const { rolesLastFetched } = get();
        // Cache valid for 5 minutes unless forced
        if (!force && rolesLastFetched && (Date.now() - rolesLastFetched < 5 * 60 * 1000)) {
            return;
        }

        try {
            const [fetchedRoles, fetchedScreens] = await Promise.all([
                adminService.getAllRoles(),
                adminService.getMasterScreenList()
            ]);
            set({
                roles: fetchedRoles,
                masterScreens: fetchedScreens,
                rolesLastFetched: Date.now()
            });
        } catch (error) {
            console.error("Failed to fetch roles/screens", error);
            // Fallback for offline dev
            set({
                roles: ['ADMIN', 'GATE_OPERATOR', 'VIEWER'],
                masterScreens: [
                    { screenName: 'Dashboard', screenPath: '/dashboard' },
                    { screenName: 'Gate Operations', screenPath: '/gate' },
                    { screenName: 'Yard View', screenPath: '/yard' },
                    { screenName: 'User Management', screenPath: '/admin/users' },
                ],
                rolesLastFetched: Date.now()
            });
        }
    },

    fetchRoleConfig: async (roleName: string, force = false) => {
        const { roleConfigs } = get();
        // Check cache
        if (!force && roleConfigs[roleName]) {
            return;
        }

        try {
            const config = await adminService.getRoleConfig(roleName);
            set(state => ({
                roleConfigs: {
                    ...state.roleConfigs,
                    [roleName]: config
                }
            }));
        } catch (error) {
            console.error(`Failed to fetch config for ${roleName}`, error);
            // Don't set empty array unless we want to cache the failure
        }
    },

    fetchUsers: async (force = false) => {
        const { usersLastFetched } = get();
        // Cache valid for 5 minutes unless forced
        if (!force && usersLastFetched && (Date.now() - usersLastFetched < 5 * 60 * 1000)) {
            return;
        }

        try {
            const [fetchedUsers, fetchedRoles] = await Promise.all([
                adminService.getUsers(),
                adminService.getAllRoles()
            ]);

            set({
                users: fetchedUsers,
                availableRoles: fetchedRoles,
                usersLastFetched: Date.now()
            });
        } catch (error) {
            console.error("Failed to fetch users", error);
            // Fallback
            set({
                users: [
                    { USER_ID: 1, NAME: 'admin', EMAIL: 'admin@nalsoft.net', ROLES: ['ADMIN'], IS_ACTIVE: 'Y' },
                    { USER_ID: 2, NAME: 'gateop', EMAIL: 'gate@nalsoft.net', ROLES: ['GATE_OPERATOR'], IS_ACTIVE: 'Y' }
                ],
                availableRoles: ['ADMIN', 'GATE_OPERATOR'],
                usersLastFetched: Date.now()
            });
        }
    },

    setUsers: (users) => set({ users }),

    updateUser: (updatedUser) => set((state) => ({
        users: state.users.map(u => u.USER_ID === updatedUser.USER_ID ? updatedUser : u)
    })),

    updateRoleConfigCache: (roleName, config) => set(state => ({
        roleConfigs: {
            ...state.roleConfigs,
            [roleName]: config
        }
    })),

    createRole: async (roleName: string) => {
        try {
            const { masterScreens } = get();

            // Create with default 'N' permissions for all screens
            const screensPayload = masterScreens.map(s => ({
                screenName: s.screenName,
                screenPath: s.screenPath,
                isActive: false // Default denied
            }));

            await adminService.createRole({
                roleName,
                screens: screensPayload
            });

            // Optimistic Update
            set(state => ({
                roles: [...state.roles, roleName],
                availableRoles: [...state.availableRoles, roleName], // Sync availableRoles
                // Also initialize the cache for this new role
                roleConfigs: {
                    ...state.roleConfigs,
                    [roleName]: masterScreens.map(s => ({
                        ROLE: roleName,
                        SCREEN_NAME: s.screenName,
                        SCREEN_PATH: s.screenPath,
                        IS_ACTIVE: 'N'
                    }))
                }
            }));
        } catch (error) {
            console.error("Failed to create role", error);
            throw error; // Re-throw so component can show error
        }
    },

    deleteRole: async (roleName: string) => {
        try {
            await adminService.deleteRole(roleName);

            set(state => {
                const newRoleConfigs = { ...state.roleConfigs };
                delete newRoleConfigs[roleName];

                return {
                    roles: state.roles.filter(r => r !== roleName),
                    availableRoles: state.availableRoles.filter(r => r !== roleName), // Sync availableRoles
                    roleConfigs: newRoleConfigs,
                    // If we deleted the only role or current selection, that's handled by component... 
                    // But we can help by ensuring consistency? Component Effects handle selection.
                };
            });
        } catch (error) {
            console.error("Failed to delete role", error);
            throw error;
        }
    }
}));
