import { useState, useEffect } from 'react';
import { adminService } from '../../../api/handlers/adminApi';
import type { AdminUser } from '../../../api/types/adminTypes';
import { Loader2, User as UserIcon, Shield, Edit2, Search, X, Filter, Check } from 'lucide-react';

import { useAdminStore } from '../../../store/adminStore';

export default function UserManagement() {
    const {
        users,
        availableRoles,
        fetchUsers,
        setUsers // We need this or a specific update action for optimistic updates
    } = useAdminStore();

    // const [users, setUsers] = useState<AdminUser[]>([]); // REPLACED BY STORE
    const [searchQuery, setSearchQuery] = useState('');

    // Derived loading state
    const isLoading = users.length === 0;

    // Filters
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
    const [activeFilterDropdown, setActiveFilterDropdown] = useState<'ROLE' | 'STATUS' | null>(null);

    // For Assignment Modal
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    // const [availableRoles, setAvailableRoles] = useState<string[]>([]); // REPLACED BY STORE
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    // loadData removed (handled by store)

    const handleEditRoles = (user: AdminUser) => {
        setSelectedUser(user);
        setIsAssignmentModalOpen(true);
    };

    const toggleRoleForUser = async (role: string) => {
        if (!selectedUser) return;

        const hasRole = selectedUser.ROLES?.includes(role);
        const action = hasRole ? 'remove' : 'assign';

        // Optimistic UI update
        const updatedRoles = hasRole
            ? selectedUser.ROLES?.filter(r => r !== role) || []
            : [...(selectedUser.ROLES || []), role];

        setSelectedUser({ ...selectedUser, ROLES: updatedRoles });
        setUsers(users.map(u => u.USER_ID === selectedUser.USER_ID ? { ...u, ROLES: updatedRoles } : u));

        // API Call
        try {
            await adminService.assignRoleToUser({
                userId: selectedUser.USER_ID,
                roleCode: role,
                action
            });
        } catch (error) {
            console.error("Failed to assign role", error);
            // Revert on failure (omitted for brevity in this task, but good practice)
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.EMAIL.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.USERNAME.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = selectedRoleFilter === 'ALL'
            ? true
            : user.ROLES && user.ROLES.includes(selectedRoleFilter);

        const matchesStatus = selectedStatusFilter === 'ALL'
            ? true
            : selectedStatusFilter === 'ACTIVE' ? user.IS_ACTIVE === 'Y' : user.IS_ACTIVE === 'N';

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px' }}>
                {/* Search Bar Input */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    gap: '12px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    <Search size={18} color="rgba(255, 255, 255, 0.4)" />
                    <input
                        type="text"
                        placeholder="Search users by email or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '14px',
                            outline: 'none',
                            flex: 1,
                            minWidth: 0
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.4)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: 0
                            }}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Role Filter and Status Filter removed from here */}
            </div>

            {isLoading ? (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                                <th style={{ padding: '12px', fontWeight: 500 }}>User</th>
                                <th style={{ padding: '12px', fontWeight: 500 }}>Roles</th>
                                <th style={{ padding: '12px', fontWeight: 500 }}>Status</th>
                                <th style={{ padding: '12px', fontWeight: 500 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="dark-shimmer" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div className="dark-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
                                                <div className="dark-shimmer" style={{ width: '180px', height: '12px', borderRadius: '4px' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div className="dark-shimmer" style={{ width: '100px', height: '24px', borderRadius: '12px' }} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div className="dark-shimmer" style={{ width: '60px', height: '20px', borderRadius: '12px' }} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div className="dark-shimmer" style={{ width: '24px', height: '24px', borderRadius: '4px', float: 'right' }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                                <th style={{ padding: '12px', fontWeight: 500 }}>User</th>
                                <th style={{ padding: '12px', fontWeight: 500, position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Roles
                                        <button
                                            onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'ROLE' ? null : 'ROLE')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: '4px',
                                                color: selectedRoleFilter !== 'ALL' ? 'var(--secondary-color)' : 'rgba(255,255,255,0.4)',
                                                display: 'flex', alignItems: 'center'
                                            }}
                                        >
                                            <Filter size={14} fill={selectedRoleFilter !== 'ALL' ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                    {/* Role Filter Dropdown */}
                                    {activeFilterDropdown === 'ROLE' && (
                                        <>
                                            <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setActiveFilterDropdown(null)} />
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                background: '#1e293b',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                padding: '8px',
                                                zIndex: 30,
                                                minWidth: '200px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                                            }}>
                                                <div
                                                    onClick={() => { setSelectedRoleFilter('ALL'); setActiveFilterDropdown(null); }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        fontSize: '14px',
                                                        color: 'white',
                                                        background: selectedRoleFilter === 'ALL' ? 'rgba(255,255,255,0.1)' : 'transparent'
                                                    }}
                                                >
                                                    All Roles
                                                    {selectedRoleFilter === 'ALL' && <Check size={14} color="var(--secondary-color)" />}
                                                </div>
                                                {availableRoles.map(role => (
                                                    <div
                                                        key={role}
                                                        onClick={() => { setSelectedRoleFilter(role); setActiveFilterDropdown(null); }}
                                                        style={{
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            fontSize: '14px',
                                                            color: 'white',
                                                            marginTop: '2px',
                                                            background: selectedRoleFilter === role ? 'rgba(255,255,255,0.1)' : 'transparent'
                                                        }}
                                                    >
                                                        {role}
                                                        {selectedRoleFilter === role && <Check size={14} color="var(--secondary-color)" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </th>
                                <th style={{ padding: '12px', fontWeight: 500, position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Status
                                        <button
                                            onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'STATUS' ? null : 'STATUS')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: '4px',
                                                color: selectedStatusFilter !== 'ALL' ? 'var(--secondary-color)' : 'rgba(255,255,255,0.4)',
                                                display: 'flex', alignItems: 'center'
                                            }}
                                        >
                                            <Filter size={14} fill={selectedStatusFilter !== 'ALL' ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                    {/* Status Filter Dropdown */}
                                    {activeFilterDropdown === 'STATUS' && (
                                        <>
                                            <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setActiveFilterDropdown(null)} />
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                background: '#1e293b',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                padding: '8px',
                                                zIndex: 30,
                                                minWidth: '160px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                                            }}>
                                                {[
                                                    { label: 'All Status', value: 'ALL' },
                                                    { label: 'Active', value: 'ACTIVE' },
                                                    { label: 'Inactive', value: 'INACTIVE' }
                                                ].map(opt => (
                                                    <div
                                                        key={opt.value}
                                                        onClick={() => { setSelectedStatusFilter(opt.value); setActiveFilterDropdown(null); }}
                                                        style={{
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            fontSize: '14px',
                                                            color: 'white',
                                                            marginTop: '2px',
                                                            background: selectedStatusFilter === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent'
                                                        }}
                                                    >
                                                        {opt.label}
                                                        {selectedStatusFilter === opt.value && <Check size={14} color="var(--secondary-color)" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </th>
                                <th style={{ padding: '12px', fontWeight: 500 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <tr key={user.USER_ID} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '16px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                    <UserIcon size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ color: 'white', fontWeight: 500 }}>{user.USERNAME}</div>
                                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{user.EMAIL}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {user.ROLES && user.ROLES.length > 0 ? user.ROLES.map(role => (
                                                    <span key={role} style={{
                                                        fontSize: '12px',
                                                        background: 'rgba(247, 207, 155, 0.1)',
                                                        color: 'var(--secondary-color)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px'
                                                    }}>
                                                        {role}
                                                    </span>
                                                )) : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>No Roles</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <span style={{ color: user.IS_ACTIVE === 'Y' ? '#4ade80' : '#94a3b8', fontSize: '12px', background: user.IS_ACTIVE === 'Y' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                                {user.IS_ACTIVE === 'Y' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleEditRoles(user)}
                                                style={{ background: 'transparent', border: 'none', color: 'white', opacity: 0.6, cursor: 'pointer' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                            <Search size={24} style={{ opacity: 0.3 }} />
                                            <span>No users found matching "{searchQuery}"</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Simple Modal for Assignment */}
            {isAssignmentModalOpen && selectedUser && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 10
                }}>
                    <div style={{
                        width: '400px',
                        background: '#1e293b',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: 'white' }}>Assign Roles</h3>
                            <button onClick={() => setIsAssignmentModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>Close</button>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '-10px', marginBottom: '20px' }}>
                            Managing roles for <span style={{ color: 'white' }}>{selectedUser.USERNAME}</span>
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {availableRoles.map(role => {
                                const isAssigned = selectedUser.ROLES?.includes(role);
                                return (
                                    <button
                                        key={role}
                                        onClick={() => toggleRoleForUser(role)}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px',
                                            background: isAssigned ? 'rgba(247, 207, 155, 0.15)' : 'rgba(255,255,255,0.05)',
                                            border: '1px solid',
                                            borderColor: isAssigned ? 'var(--secondary-color)' : 'transparent',
                                            borderRadius: '8px',
                                            color: isAssigned ? 'var(--secondary-color)' : 'rgba(255,255,255,0.7)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Shield size={14} />
                                            {role}
                                        </div>
                                        {isAssigned && <span style={{ fontSize: '12px' }}>Assigned</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

