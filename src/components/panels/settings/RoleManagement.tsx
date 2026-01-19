import { useState, useEffect } from 'react';
import { adminService } from '../../../api/handlers/adminApi';
import type { RoleConfig } from '../../../api/types/adminTypes';


import { Check, X, Loader2, Shield, Trash2, AlertTriangle, Plus } from 'lucide-react';

import { useAdminStore } from '../../../store/adminStore';
import { useAuthStore } from '../../../store/authStore';

export default function RoleManagement() {
    const {
        roles,
        masterScreens,
        roleConfigs, // CACHED CONFIGS
        fetchRolesAndScreens,
        fetchRoleConfig,
        updateRoleConfigCache,

        createRole,
        deleteRole // ACTION
    } = useAdminStore();

    const { user } = useAuthStore();

    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<string | null>(null); // screenPath being saved

    // Add Role Modal State
    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');

    // Delete Role Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddRole = async () => {
        if (!newRoleName.trim()) return;

        try {
            await createRole(newRoleName);
            setSelectedRole(newRoleName); // Select the new role
            setIsAddRoleModalOpen(false);
            setNewRoleName('');
        } catch (e) {
            // Error handled by store/service logs
            alert("Failed to create role. It might already exist.");
        }
    };

    const confirmDeleteRole = async () => {
        if (!roleToDelete) return;
        setIsDeleting(true);
        try {
            await deleteRole(roleToDelete);

            // If we deleted the currently selected role, select another one
            if (selectedRole === roleToDelete) {
                const remainingRoles = roles.filter(r => r !== roleToDelete);
                setSelectedRole(remainingRoles.length > 0 ? remainingRoles[0] : null);
            }

            setIsDeleteModalOpen(false);
            setRoleToDelete(null);
        } catch (e) {
            alert("Failed to delete role.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Derived loading state for initial data (only if empty)
    const isLoadingRoles = roles.length === 0;

    // Derived active config
    const currentRoleConfig = selectedRole ? (roleConfigs[selectedRole] || []) : [];
    // Loading if selected but no config yet (roleConfigs entry doesn't exist)
    const isLoadingConfig = selectedRole ? !roleConfigs[selectedRole] : false;

    // Fetch Roles and Master Screens on mount (cached)
    useEffect(() => {
        fetchRolesAndScreens();
    }, []);

    // Effect to select first role when roles become available
    useEffect(() => {
        if (!selectedRole && roles.length > 0) {
            setSelectedRole(roles[0]);
        }
    }, [roles, selectedRole]);

    // Fetch Role Config when a role is selected (cached)
    useEffect(() => {
        if (selectedRole) {
            fetchRoleConfig(selectedRole);
        }
    }, [selectedRole]);

    const handleTogglePermission = async (screen: { screenName: string, screenPath: string }, currentStatus: boolean) => {
        if (!selectedRole) return;

        setIsSaving(screen.screenPath);
        const newStatus = !currentStatus;

        try {
            await adminService.updateRolePermission({
                roleName: selectedRole,
                screenName: screen.screenName,
                screenPath: screen.screenPath,
                isActive: newStatus
            });

            // Optimistic update via STORE
            const prevConfig = currentRoleConfig;
            const existingIndex = prevConfig.findIndex(item => item.SCREEN_PATH === screen.screenPath);

            let newConfig: RoleConfig[];
            if (existingIndex >= 0) {
                newConfig = [...prevConfig];
                newConfig[existingIndex] = { ...newConfig[existingIndex], IS_ACTIVE: (newStatus ? 'Y' : 'N') as 'Y' | 'N' };
            } else {
                // Item didn't exist in config (implicit 'N'), add it
                newConfig = [...prevConfig, {
                    ROLE: selectedRole,
                    SCREEN_NAME: screen.screenName,
                    SCREEN_PATH: screen.screenPath,
                    IS_ACTIVE: (newStatus ? 'Y' : 'N') as 'Y' | 'N'
                }];
            }

            updateRoleConfigCache(selectedRole, newConfig);

        } catch (error) {
            console.error("Failed to update permission", error);
        } finally {
            setIsSaving(null);
        }
    };

    // Helper to check access
    const hasAccess = (screenPath: string) => {
        const configItem = currentRoleConfig.find(item => item.SCREEN_PATH === screenPath);
        return configItem?.IS_ACTIVE === 'Y';
    };

    return (
        <div style={{ padding: '24px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
                {/* Roles List */}
                <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {user?.role === 'DEVELOPER' && (
                        <button
                            onClick={() => {
                                setNewRoleName('');
                                setIsAddRoleModalOpen(true);
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px dashed rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                padding: '12px',
                                cursor: 'pointer',
                                color: 'var(--secondary-color)',
                                fontSize: '14px',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.borderColor = 'var(--secondary-color)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                            }}
                        >
                            <Plus size={16} />
                            Add New Role
                        </button>
                    )}

                    {isLoadingRoles ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="dark-shimmer" style={{
                                    height: '44px',
                                    borderRadius: '8px',
                                    width: '100%'
                                }} />
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                            {roles.map(role => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid',
                                        borderColor: selectedRole === role ? 'var(--secondary-color)' : 'transparent',
                                        background: selectedRole === role ? 'rgba(247, 207, 155, 0.1)' : 'rgba(255,255,255,0.05)',
                                        color: selectedRole === role ? 'var(--secondary-color)' : 'rgba(255,255,255,0.7)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between', // Changed to space-between
                                        gap: '10px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Shield size={16} />
                                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{role}</span>
                                    </div>

                                    {/* Delete Button (Only on Active) */}
                                    {selectedRole === role && user?.role === 'DEVELOPER' && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent selection trigger
                                                setRoleToDelete(role);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            style={{
                                                padding: '4px',
                                                borderRadius: '4px',
                                                color: 'rgba(239, 68, 68, 0.8)', // Red
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Delete Role"
                                        >
                                            <Trash2 size={14} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Role List & Permissions */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selectedRole && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{selectedRole}</span>}
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'white' }}>Permissions</h3>
                    </div>

                    {isLoadingConfig ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="dark-shimmer" style={{ height: '48px', borderRadius: '8px', width: '100%' }} />
                            ))}
                        </div>
                    ) : (
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '0 12px 16px 12px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <span>Screen Name</span>
                                <span style={{ textAlign: 'right', paddingRight: '16px' }}>Access</span>
                            </div>
                            {[...masterScreens].sort((a, b) => {
                                const activeA = hasAccess(a.screenPath);
                                const activeB = hasAccess(b.screenPath);
                                if (activeA === activeB) return a.screenName.localeCompare(b.screenName); // Secondary active active first
                                return activeA ? -1 : 1;
                            }).map(screen => {
                                const active = hasAccess(screen.screenPath);
                                const savingThis = isSaving === screen.screenPath;

                                return (
                                    <div key={screen.screenPath} className="permission-row" style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1fr',
                                        padding: '16px',
                                        alignItems: 'center',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '12px',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: active ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '15px' }}>
                                                    {screen.screenName}
                                                </span>
                                                {active && (
                                                    <div style={{
                                                        width: '6px', height: '6px', borderRadius: '50%',
                                                        background: '#4ade80',
                                                        boxShadow: '0 0 8px #4ade80'
                                                    }} />
                                                )}
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                                                {screen.screenPath}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleTogglePermission(screen, active)}
                                                disabled={savingThis}
                                                className={`toggle-btn ${active ? 'allowed' : 'denied'}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 16px',
                                                    borderRadius: '30px',
                                                    border: '1px solid',
                                                    borderColor: active ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255,255,255,0.1)',
                                                    background: active ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                                                    color: active ? '#4ade80' : 'rgba(255,255,255,0.4)',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    minWidth: '110px',
                                                    justifyContent: 'center',
                                                    letterSpacing: '0.5px'
                                                }}
                                            >
                                                {savingThis ? <Loader2 size={14} className="animate-spin" /> : (
                                                    active ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />
                                                )}
                                                {active ? 'ALLOWED' : 'DENIED'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {masterScreens.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                    No screens defined in Master List.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Role Modal */}
            {isAddRoleModalOpen && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
                        onClick={() => setIsAddRoleModalOpen(false)}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '400px',
                        zIndex: 101,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '18px' }}>Add New Role</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Role Name</label>
                            <input
                                autoFocus
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value.toUpperCase())}
                                placeholder="e.g. SUPERVISOR"
                                style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    color: 'white',
                                    outline: 'none',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddRole();
                                    if (e.key === 'Escape') setIsAddRoleModalOpen(false);
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setIsAddRoleModalOpen(false)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent',
                                    color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddRole}
                                disabled={!newRoleName.trim()}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--secondary-color)',
                                    color: '#1e293b',
                                    fontWeight: 600,
                                    cursor: newRoleName.trim() ? 'pointer' : 'not-allowed',
                                    opacity: newRoleName.trim() ? 1 : 0.5
                                }}
                            >
                                Create Role
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* DELETE ROLE MODAL */}
            {isDeleteModalOpen && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
                        onClick={() => setIsDeleteModalOpen(false)}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.95) 0%, rgba(58, 82, 85, 0.95) 100%)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(239, 68, 68, 0.3)', // Red border
                        borderRadius: '16px',
                        padding: '24px',
                        width: '400px',
                        zIndex: 101,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#ef4444'
                            }}>
                                <AlertTriangle size={24} />
                            </div>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '18px' }}>Delete Role?</h3>
                        </div>

                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
                            Are you sure you want to delete the role <strong style={{ color: 'white' }}>{roleToDelete}</strong>?
                            <br /><br />
                            This action cannot be undone. Users assigned to this role may lose access to associated screens.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent',
                                    color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteRole}
                                disabled={isDeleting}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isDeleting && <Loader2 size={14} className="animate-spin" />}
                                Delete Role
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
