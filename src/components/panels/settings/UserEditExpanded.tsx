import { useState } from 'react';
import { User, Save, Loader2, Check, ChevronDown } from 'lucide-react';
import type { AdminUser } from '../../../api/types/adminTypes';

interface UserEditExpandedProps {
    user: AdminUser;
    availableRoles: string[];
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}

export default function UserEditExpanded({ user, availableRoles, onSave, onCancel }: UserEditExpandedProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        userId: user.USER_ID,
        name: user.NAME,
        email: user.EMAIL,
        primaryRole: user.ROLES && user.ROLES.length > 0 ? user.ROLES[0] : '',
        isActive: user.IS_ACTIVE === 'Y',
        assignedRoles: user.ROLES || []
    });

    const handleSave = async () => {
        setIsUpdating(true);
        try {
            await onSave({
                email: editFormData.email,
                new_name: editFormData.name,
                is_active: editFormData.isActive,
                primary_role: editFormData.primaryRole,
                assigned_roles: editFormData.assignedRoles
            });
        } catch (e) {
            console.error("Update failed", e);
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleEditRole = (role: string) => {
        setEditFormData(prev => {
            const hasRole = prev.assignedRoles.includes(role);
            return {
                ...prev,
                assignedRoles: hasRole
                    ? prev.assignedRoles.filter(r => r !== role)
                    : [...prev.assignedRoles, role]
            };
        });
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            // borderRadius removed to let parent container control shape (especially for sharp top-left)
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header with Actions - Cleaned for seamless blend */}
            <div style={{
                padding: '16px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '16px',
                        background: 'var(--secondary-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(247, 207, 155, 0.2)'
                    }}>
                        <User size={24} color="white" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '18px' }}>Edit User</h3>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{user.EMAIL}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel();
                        }}
                        disabled={isUpdating}
                        style={{
                            padding: '10px 20px', borderRadius: '12px', border: 'none',
                            background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer',
                            transition: 'all 0.2s', fontSize: '14px', fontWeight: 500
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSave();
                        }}
                        disabled={isUpdating}
                        style={{
                            padding: '10px 24px', borderRadius: '12px', border: 'none',
                            background: 'var(--secondary-gradient)',
                            color: '#1e293b', fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 4px 15px rgba(247, 207, 155, 0.3)',
                            opacity: isUpdating ? 0.7 : 1, fontSize: '14px'
                        }}
                    >
                        {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Split Body */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1fr' }}>

                {/* Left Column: User Details */}
                <div style={{
                    padding: '24px',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: '24px'
                }}>
                    <h4 style={{ margin: 0, color: 'var(--secondary-color)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>User Details</h4>

                    {/* Compact Status Card */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '16px 20px', borderRadius: '12px',
                        background: 'linear-gradient(to right, rgba(255,255,255,0.03), transparent)',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: editFormData.isActive ? '#4ade80' : '#ef4444',
                                boxShadow: editFormData.isActive ? '0 0 8px rgba(74, 222, 128, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)'
                            }} />
                            <span style={{ fontSize: '14px', color: 'white', fontWeight: 500 }}>
                                {editFormData.isActive ? 'Active Account' : 'Suspended Account'}
                            </span>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={editFormData.isActive}
                                onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: editFormData.isActive ? 'var(--secondary-color)' : 'rgba(255,255,255,0.1)',
                                transition: '0.4s', borderRadius: '34px'
                            }}></span>
                            <span style={{
                                position: 'absolute', content: '""', height: '16px', width: '16px', left: '3px', bottom: '3px',
                                backgroundColor: 'white', transition: '0.4s', borderRadius: '50%',
                                transform: editFormData.isActive ? 'translateX(18px)' : 'translateX(0)'
                            }}></span>
                        </label>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 600 }}>Full Name</label>
                        <input
                            className="modern-input"
                            value={editFormData.name}
                            onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                            style={{
                                width: '100%', padding: '16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--secondary-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 600 }}>Email (Read Only)</label>
                        <input
                            className="modern-input"
                            value={editFormData.email}
                            readOnly
                            style={{
                                width: '100%', padding: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                color: 'rgba(255,255,255,0.5)',
                                cursor: 'not-allowed',
                                fontSize: '15px'
                            }}
                        />
                    </div>
                </div>

                {/* Right Column: Roles List */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto'
                }}>
                    {/* Primary Role (Moved) */}
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ margin: '0 0 12px 0', color: 'var(--secondary-color)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Primary Role</h4>
                        <div style={{ position: 'relative', maxWidth: '320px' }}>
                            {/* Backdrop for closing */}
                            {isRoleDropdownOpen && (
                                <div
                                    style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                                    onClick={() => setIsRoleDropdownOpen(false)}
                                />
                            )}

                            {/* Trigger Button */}
                            <div
                                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                style={{
                                    width: '100%', padding: '16px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid',
                                    borderColor: isRoleDropdownOpen ? 'var(--secondary-color)' : 'rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    transition: 'all 0.2s',
                                    boxShadow: isRoleDropdownOpen ? '0 0 0 2px rgba(247, 207, 155, 0.1)' : 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                <span style={{ color: editFormData.primaryRole ? 'white' : 'rgba(255,255,255,0.4)' }}>
                                    {editFormData.primaryRole || "Select Primary Role"}
                                </span>
                                <ChevronDown
                                    size={16}
                                    color={isRoleDropdownOpen ? 'var(--secondary-color)' : 'rgba(255,255,255,0.4)'}
                                    style={{ transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}
                                />
                            </div>

                            {/* Dropdown Menu */}
                            {isRoleDropdownOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                                    background: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '6px',
                                    zIndex: 20,
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                    maxHeight: '240px', overflowY: 'auto'
                                }}>
                                    {availableRoles.map(role => {
                                        const isSelected = editFormData.primaryRole === role;
                                        return (
                                            <div
                                                key={role}
                                                onClick={() => {
                                                    setEditFormData({ ...editFormData, primaryRole: role });
                                                    setIsRoleDropdownOpen(false);
                                                }}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    background: isSelected ? 'rgba(var(--secondary-rgb), 0.1)' : 'transparent',
                                                    color: isSelected ? 'var(--secondary-color)' : 'rgba(255,255,255,0.8)',
                                                    fontSize: '14px',
                                                    marginBottom: '2px', // gap between items
                                                    transition: 'all 0.1s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                        e.currentTarget.style.color = 'white';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                                                    }
                                                }}
                                            >
                                                <span>{role}</span>
                                                {isSelected && <Check size={16} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <h4 style={{ margin: '0 0 16px 0', color: 'var(--secondary-color)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Assigned Roles & Access</h4>

                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px'
                    }}>
                        {availableRoles.map(role => {
                            const isAssigned = editFormData.assignedRoles.includes(role);
                            return (
                                <div
                                    key={role}
                                    onClick={() => toggleEditRole(role)}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        border: '1px solid',
                                        borderColor: isAssigned ? 'var(--secondary-color)' : 'rgba(255,255,255,0.1)',
                                        background: isAssigned ? 'rgba(var(--secondary-rgb), 0.05)' : 'transparent',
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: '10px'
                                    }}
                                >
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '5px',
                                        border: '1px solid',
                                        borderColor: isAssigned ? 'var(--secondary-color)' : 'rgba(255,255,255,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isAssigned ? 'var(--secondary-color)' : 'rgba(255,255,255,0.05)',
                                        transition: 'all 0.2s'
                                    }}>
                                        {isAssigned && <Check size={14} color="#1e293b" strokeWidth={3} />}
                                    </div>
                                    <span style={{ fontSize: '13px', color: isAssigned ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: isAssigned ? 600 : 400 }}>{role}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
