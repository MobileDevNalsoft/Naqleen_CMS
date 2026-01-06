import React, { useState } from 'react';
import { useUIStore } from '../../../store/uiStore';
import {
    User,
    Shield,
    LogOut,
    X,
    Camera,
    Save,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    Edit2
} from 'lucide-react';

type SettingsTab = 'profile' | 'accessControl';
type AccessControlTab = 'roles' | 'users';

export default function SettingsPanel() {
    const { activePanel, closePanel } = useUIStore();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    // Only render if active
    if (activePanel !== 'settings') return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            {/* Main Card Container */}
            <div style={{
                display: 'flex',
                width: '90%',
                maxWidth: '1200px',
                height: '70vh',
                backgroundColor: 'var(--glass-bg)', // Using theme logic: rgba(75, 104, 108, 0.8) usually
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                borderRadius: '24px',
                border: '1px solid rgba(247, 207, 155, 0.15)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                color: 'white',
                position: 'relative'
            }}>
                {/* Close Button Abstracted */}
                <button
                    onClick={closePanel}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <X size={24} />
                </button>

                {/* SIDEBAR */}
                <div style={{
                    width: '280px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '40px',
                        paddingLeft: '12px'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'var(--secondary-gradient, linear-gradient(135deg, #F7CF9B 0%, #E2B478 100%))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <SettingsIcon size={18} color="#1e293b" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Settings</h2>
                    </div>

                    {/* Navigation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <NavButton
                            active={activeTab === 'profile'}
                            icon={<User size={18} />}
                            label="Profile"
                            onClick={() => setActiveTab('profile')}
                        />
                        <NavButton
                            active={activeTab === 'accessControl'}
                            icon={<Shield size={18} />}
                            label="Access Control"
                            onClick={() => setActiveTab('accessControl')}
                        />
                    </div>

                    {/* User Footer */}
                    <div style={{
                        marginTop: 'auto',
                        padding: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>Admin User</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>admin@nalsoft.net</div>
                        </div>

                        <button style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '8px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}>
                            <LogOut size={14} />
                            Log out
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {activeTab === 'profile' && <ProfileSection />}
                    {activeTab === 'accessControl' && <AccessControlSection />}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

// --- Sub-Components ---

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                background: active ? 'rgba(247, 207, 155, 0.15)' : 'transparent',
                color: active ? 'var(--secondary-color, #F7CF9B)' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
            }}
        >
            {icon}
            {label}
        </button>
    );
}

function ProfileSection() {
    return (
        <div style={{ padding: '40px', height: '100%', overflowY: 'auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '32px' }}>My Profile</h1>

            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                {/* Avatar Column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '4px solid rgba(255, 255, 255, 0.1)',
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden'
                    }}>
                        <User size={48} color="rgba(255,255,255,0.5)" />

                        {/* Hover Overlay */}
                        <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.2s',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        >
                            <Camera size={24} color="white" />
                        </div>
                    </div>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Allowed *.jpeg, *.jpg, *.png</span>
                </div>

                {/* Form Column */}
                <div style={{ flex: 1, maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <FormInput label="First Name" defaultValue="Admin" />
                        <FormInput label="Last Name" defaultValue="User" />
                    </div>

                    <FormInput label="Email Address" defaultValue="admin@nalsoft.net" readOnly />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <FormInput label="Role" defaultValue="Super Administrator" readOnly
                            icon={<Shield size={14} color="var(--secondary-color)" />}
                        />
                        <FormInput label="Phone Number" defaultValue="+1 (555) 123-4567" />
                    </div>

                    <div style={{ paddingTop: '20px', display: 'flex', gap: '12px' }}>
                        <button style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--secondary-color, #F7CF9B)',
                            color: '#1e293b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Save size={16} />
                            Save Changes
                        </button>
                        <button style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'transparent',
                            color: 'white',
                            cursor: 'pointer'
                        }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AccessControlSection() {
    const [tab, setTab] = useState<AccessControlTab>('roles');

    return (
        <div style={{ padding: '40px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '24px' }}>Access Control</h1>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '32px'
            }}>
                <TabButton
                    active={tab === 'roles'}
                    label="Roles"
                    onClick={() => setTab('roles')}
                />
                <TabButton
                    active={tab === 'users'}
                    label="Users"
                    onClick={() => setTab('users')}
                />
            </div>

            {/* Content Table */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                        <input
                            placeholder={`Search ${tab}...`}
                            style={{
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '8px 12px 8px 36px',
                                color: 'white',
                                outline: 'none',
                                width: '240px',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                    <button style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'rgba(247, 207, 155, 0.1)',
                        color: 'var(--secondary-color, #F7CF9B)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px'
                    }}>
                        <Plus size={16} />
                        Add {tab === 'roles' ? 'Role' : 'User'}
                    </button>
                </div>

                {tab === 'roles' ? <RolesTable /> : <UsersTable />}
            </div>
        </div>
    );
}

// --- Helper Components ---

function SettingsIcon({ size, color }: { size: number, color: string }) {
    // Custom SVG or lucide wrapper
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    )
}

function FormInput({ label, defaultValue, readOnly, icon }: { label: string, defaultValue?: string, readOnly?: boolean, icon?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    defaultValue={defaultValue}
                    readOnly={readOnly}
                    style={{
                        width: '100%',
                        padding: '12px',
                        paddingRight: icon ? '36px' : '12px',
                        background: readOnly ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        cursor: readOnly ? 'default' : 'text'
                    }}
                    onFocus={e => !readOnly && (e.currentTarget.style.borderColor = 'var(--secondary-color)')}
                    onBlur={e => !readOnly && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                {icon && <div style={{ position: 'absolute', right: '12px' }}>{icon}</div>}
            </div>
        </div>
    )
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0 4px 12px 4px',
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--secondary-color)' : '2px solid transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.5)',
                fontSize: '15px',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            {label}
        </button>
    )
}

function RolesTable() {
    const roles = [
        { id: 1, name: 'Super Administrator', users: 2, desc: 'Full access to all system features' },
        { id: 2, name: 'Terminal Manager', users: 5, desc: 'Can manage yard operations and containers' },
        { id: 3, name: 'Gate Operator', users: 12, desc: 'Restricted to Gate In/Out operations' },
        { id: 4, name: 'Viewer', users: 8, desc: 'Read-only access to dashboard' }
    ];

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                    <th style={{ padding: '12px', fontWeight: 500 }}>Role Name</th>
                    <th style={{ padding: '12px', fontWeight: 500 }}>Description</th>
                    <th style={{ padding: '12px', fontWeight: 500 }}>Users</th>
                    <th style={{ padding: '12px', fontWeight: 500 }}></th>
                </tr>
            </thead>
            <tbody>
                {roles.map(role => (
                    <tr key={role.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <td style={{ padding: '16px 12px', color: 'white', fontWeight: 500 }}>{role.name}</td>
                        <td style={{ padding: '16px 12px', color: 'rgba(255,255,255,0.7)' }}>{role.desc}</td>
                        <td style={{ padding: '16px 12px' }}>
                            <span style={{
                                background: 'rgba(255,255,255,0.1)',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px'
                            }}>{role.users} Users</span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                            <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                <MoreHorizontal size={18} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function UsersTable() {
    const users = [
        { id: 1, name: 'Admin User', email: 'admin@nalsoft.net', role: 'Super Admin', status: 'Active' },
        { id: 2, name: 'John Doe', email: 'john.d@nalsoft.net', role: 'Terminal Manager', status: 'Active' },
        { id: 3, name: 'Sarah Smith', email: 'sarah.s@nalsoft.net', role: 'Gate Operator', status: 'Inactive' },
        { id: 4, name: 'Mike Johnson', email: 'mike.j@nalsoft.net', role: 'Gate Operator', status: 'Active' },
    ];

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                    <th style={{ padding: '12px', fontWeight: 500 }}>User</th>
                    <th style={{ padding: '12px', fontWeight: 500 }}>Role</th>
                    <th style={{ padding: '12px', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '12px', fontWeight: 500 }}></th>
                </tr>
            </thead>
            <tbody>
                {users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <td style={{ padding: '16px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ color: 'white', fontWeight: 500 }}>{user.name}</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td style={{ padding: '16px 12px', color: 'rgba(255,255,255,0.8)' }}>{user.role}</td>
                        <td style={{ padding: '16px 12px' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: user.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.2)',
                                color: user.status === 'Active' ? '#4ade80' : '#94a3b8',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 500
                            }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                {user.status}
                            </span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

