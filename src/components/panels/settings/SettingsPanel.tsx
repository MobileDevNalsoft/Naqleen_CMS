import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../../store/uiStore';
import {
    User,
    Shield,
    LogOut,
} from 'lucide-react';

import RoleManagement from './RoleManagement';
import UserManagement from './UserManagement';
import { useScreenAccess } from '../../../hooks/useScreenAccess';

type AccessControlTab = 'roles' | 'users';

export default function SettingsPanel() {
    const { activePanel, settingsTab, setSettingsTab } = useUIStore();
    const { hasAccessControl } = useScreenAccess();
    // const [activeTab, setActiveTab] = useState<SettingsTab>('profile'); // Removed in favor of global store

    // Directional Animation Logic (Render-time calculation to prevent glitches)
    const prevTabRef = React.useRef(settingsTab);
    const tabOrder = ['profile', 'accessControl'];
    const prevIndex = tabOrder.indexOf(prevTabRef.current);
    const currentIndex = tabOrder.indexOf(settingsTab);

    // Default to 'up' movement (slideInVertical) for initial load or same index
    let animationName = 'slideInVertical';

    if (currentIndex > prevIndex) {
        animationName = 'slideInVertical'; // Nav Down -> Content Slides UP
    } else if (currentIndex < prevIndex) {
        animationName = 'slideInDown';     // Nav Up -> Content Slides DOWN
    }

    // Update ref AFTER render so it's ready for next change
    useEffect(() => {
        prevTabRef.current = settingsTab;
    }, [settingsTab]);

    // Animation State checks
    const [isMounted, setIsMounted] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Effect 1: Handle activePanel changes
    useEffect(() => {
        if ((activePanel as any) === 'settings') {
            setIsMounted(true);
            setIsClosing(false);
        } else if ((activePanel as any) !== 'settings' && isMounted) {
            setIsClosing(true);
        }
    }, [activePanel]);

    // Effect 2: Handle unmount timer when closing
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (isClosing) {
            timer = setTimeout(() => {
                setIsMounted(false);
                setIsClosing(false);
            }, 900); // Sync with faster animation duration (0.9s)
        }
        return () => clearTimeout(timer);
    }, [isClosing]);

    if (!isMounted) return null;

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
            backdropFilter: isClosing ? 'blur(0px)' : 'blur(8px)',
            animation: isClosing ? 'fadeOut 0.9s ease-in-out forwards' : 'fadeIn 0.8s ease-out forwards',
            transition: 'backdrop-filter 0.9s ease',
            pointerEvents: isClosing ? 'none' : 'auto' // Allow interaction with scene while fading out
        }}>
            {/* Main Card Container */}
            <div style={{
                display: 'flex', // Restore flex layout
                position: 'absolute',
                top: '94px', // 15px (header top) + 64px (header height) + 15px (gap)
                left: '15px',
                right: '15px',
                bottom: '15px',
                width: 'auto',
                height: 'auto',
                maxWidth: 'none',
                // backgroundColor: 'var(--glass-bg)', // REMOVED to avoid patterns
                background: 'linear-gradient(135deg, rgba(75, 104, 108, 1) 0%, rgba(47, 72, 88, 1) 100%)', // Fully Opaque Premium Deep Teal Gradient
                borderRadius: '24px',
                border: '1px solid rgba(247, 207, 155, 0.15)', // Gold border accent
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                color: 'white',
                animation: isClosing
                    ? 'slideDownPremium 0.9s cubic-bezier(0.25, 1, 0.3, 1) forwards'
                    : 'slideUpPremium 1.2s cubic-bezier(0.25, 1, 0.3, 1) forwards',
                transformOrigin: 'top center'
            }}>


                {/* SIDEBAR - Cutout Implementation */}
                <div style={{
                    width: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden' // Critical for the box-shadow cutout trick
                }}>

                    {/* Sidebar Background with SVG Mask for Smooth Fillets */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        pointerEvents: 'none'
                    }}>
                        <svg width="100%" height="100%" style={{ display: 'block' }}>
                            <defs>
                                <mask id="sidebar-mask">
                                    <rect width="100%" height="100%" fill="white" />
                                    <g style={{
                                        transform: `translateY(${(settingsTab === 'profile' ? 0 : 1) * 64 + 24}px)`,
                                        transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                                        willChange: 'transform'
                                    }}>
                                        {/* 
                                            The "Hole" Shape (Black = Transparent)
                                            Tab Width: ~95% of 280px = ~266px.
                                            We'll fix it to 280 (Right) -> 14 (Left) for consistency.
                                        */}

                                        {/* Main Body: Rounded Left Side */}
                                        <path d="M 281,0 H 46 A 32,32 0 0 0 46,64 H 281 V 0 Z" fill="black" />

                                        {/* Top Fillet (Smooth curve outward) */}
                                        <path d="M 281,0 V -24 A 24,24 0 0 1 257,0 H 281 Z" fill="black" />

                                        {/* Bottom Fillet (Smooth curve outward) */}
                                        <path d="M 281,64 V 88 A 24,24 0 0 0 257,64 H 281 Z" fill="black" />
                                    </g>
                                </mask>
                            </defs>
                            {/* The Dark Overlay applying the mask */}
                            <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.25)" mask="url(#sidebar-mask)" />


                        </svg>
                    </div>

                    {/* Navigation Items */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '24px 0',
                        zIndex: 1,
                        position: 'relative',
                        // Remove border-right specifically where the sidebar meets content? 
                        // The whole sidebar container has no border now, effectively merging.
                    }}>
                        <NavButton
                            active={settingsTab === 'profile'}
                            icon={<User size={18} />}
                            label="My Profile" // "User Profile"
                            onClick={() => setSettingsTab('profile')}
                        />
                        {hasAccessControl && (
                            <NavButton
                                active={settingsTab === 'accessControl'}
                                icon={<Shield size={18} />}
                                label="Access Control"
                                onClick={() => setSettingsTab('accessControl')}
                            />
                        )}
                    </div>

                    {/* Sidebar Border - Needs to be pseudo to skip the active area? 
                        Actually, simplified approach: Just a border on the container, 
                        but we want the active item to cover it.
                        Since the active item is transparent, it can't "cover" a border behind it easily.
                        But the user asked for "Merged". "Merged" implies NO border between Active and Content.
                        So removing the right border entirely is the correct move for the "Merged" look.
                     */}

                    {/* User Footer */}
                    <div style={{
                        marginTop: 'auto',
                        padding: '16px 24px', // Added horizontal padding back
                        zIndex: 1 // Ensure above background
                    }}>
                        {/* We need to get user from store here too, or just access it since we are in same file */}
                        <UserFooter />
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                    <div
                        key={settingsTab}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden', // Ensure internal scrolling works
                            // Dynamic Animation based on Direction
                            // 'slideInVertical' moves translateY(20px -> 0) [Upward movement] for Downward Navigation
                            // 'slideInDown' moves translateY(-20px -> 0) [Downward movement] for Upward Navigation
                            animation: `${animationName} 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards`
                        }}
                    >
                        {settingsTab === 'profile' && <ProfileSection />}
                        {settingsTab === 'accessControl' && <AccessControlSection />}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; backdrop-filter: blur(0px); }
                    to { opacity: 1; backdrop-filter: blur(8px); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; backdrop-filter: blur(8px); }
                    to { opacity: 0; backdrop-filter: blur(0px); }
                }
                @keyframes slideUpPremium {
                    0% {
                        opacity: 0;
                        transform: translateY(150px) scale(0.98);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes slideDownPremium {
                    0% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(150px) scale(0.98);
                    }
                }
                @keyframes slideInVertical {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideInDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes tabContentEnter {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
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
                gap: '16px',
                width: '100%',
                height: '64px', // Fixed height matching logic
                padding: '0 32px', // Larger padding for cleaner look
                border: 'none',
                background: 'transparent', // Background handled by parent
                color: active ? 'var(--secondary-color, #F7CF9B)' : 'rgba(255, 255, 255, 0.6)',
                fontSize: '15px',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'color 0.3s ease',
                position: 'relative',
                boxShadow: 'none'
            }}
        >
            <span style={{ opacity: active ? 1 : 0.8, transition: 'all 0.3s' }}>{icon}</span>
            {label}
        </button>
    );
}

import { useAuthStore } from '../../../store/authStore';

function ProfileSection() {
    const user = useAuthStore(state => state.user);


    const getInitials = (name: string) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    if (!user) return <div style={{ padding: '40px', color: 'white' }}>Loading profile...</div>;

    // Filter out primary role from the roles array to avoid duplication if it's there
    const secondaryRoles = user.roles ? user.roles.filter(r => r !== user.role) : [];

    return (
        <div style={{ flex: 1, padding: '12px 16px 16px 16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative'
            }}>
                <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Profile Header: Avatar + Info */}
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            {/* Avatar */}
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '3px solid rgba(255, 255, 255, 0.1)',
                                position: 'relative',
                                overflow: 'hidden',
                                fontSize: '28px',
                                fontWeight: 700,
                                color: 'rgba(255, 255, 255, 0.8)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            }}>
                                {getInitials(user.name)}
                            </div>

                            {/* Header Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.1 }}>{user.name}</h2>
                                <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                                        background: '#10b981', boxShadow: '0 0 8px #10b981'
                                    }}></span>
                                    {user.email}
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

                        {/* Profile Details Column */}
                        <div style={{ flex: 1, maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Primary Role</span>
                            <div style={{ display: 'flex' }}>
                                <span style={{
                                    background: 'linear-gradient(90deg, rgba(247, 207, 155, 0.15), rgba(247, 207, 155, 0.05))',
                                    border: '1px solid rgba(247, 207, 155, 0.2)',
                                    color: 'var(--secondary-color, #F7CF9B)',
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}>
                                    <Shield size={16} />
                                    {user.role}
                                </span>
                            </div>
                        </div>

                        {/* Assigned Roles / Permissions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Assigned Roles</span>

                            {user.roles && user.roles.length > 0 ? (
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {secondaryRoles.length === 0 ? (
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontStyle: 'italic' }}>No additional roles assigned.</span>
                                    ) : (
                                        secondaryRoles.map((role, idx) => (
                                            <span key={idx} style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                padding: '6px 16px',
                                                borderRadius: '16px',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s',
                                                cursor: 'default'
                                            }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }}></div>
                                                {role}
                                            </span>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>No roles data available.</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AccessControlSection() {
    const [tab, setTab] = useState<AccessControlTab>('roles');

    return (
        <div style={{ flex: 1, padding: '12px 16px 16px 16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '0', // Removed gap to connect with content
                paddingTop: '12px',
                marginLeft: '0.39px'
            }}>
                <div className="folder-tabs-container">
                    <button
                        className={`folder-tab ${tab === 'roles' ? 'active' : ''}`}
                        onClick={() => setTab('roles')}
                    >
                        <span>Roles</span>
                    </button>
                    <button
                        className={`folder-tab ${tab === 'users' ? 'active' : ''}`}
                        onClick={() => setTab('users')}
                    >
                        <span>Users</span>
                    </button>
                    {/* Filler to push tabs left? No, flex-start is default. */}
                </div>
            </div>

            {/* Content Area - Styled to look like the "inside" of the folder */}
            <div style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                background: 'rgba(0, 0, 0, 0.2)', // Matches active tab
                borderRadius: '0 12px 12px 12px', // Top-left square to connect, others rounded
                border: '1px solid rgba(255,255,255,0.05)',
                borderTop: 'none', // Remove top border where tab connects
                position: 'relative'
            }}>
                <div
                    key={tab}
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        animation: 'tabContentEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}
                >
                    {tab === 'roles' ? <RoleManagement /> : <UserManagement />}
                </div>
            </div>
        </div>
    );
}

function UserFooter() {
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);

    if (!user) return null;

    return (
        <div style={{
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{user.email}</div>
            </div>

            <button
                onClick={logout}
                style={{
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
    );
}
