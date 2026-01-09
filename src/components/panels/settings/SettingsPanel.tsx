import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../../store/uiStore';
import {
    User,
    Shield,
    LogOut,
} from 'lucide-react';

import RoleManagement from './RoleManagement';
import UserManagement from './UserManagement';

type AccessControlTab = 'roles' | 'users';

export default function SettingsPanel() {
    const { activePanel, settingsTab, setSettingsTab } = useUIStore();
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

                    {/* Active Cutout Indicator (The Inverse Sidebar) */}
                    <div style={{
                        position: 'absolute',
                        top: '24px', // Matches padding
                        right: 0,
                        width: '95%', // Connects to right side
                        height: '64px',
                        transform: `translateY(${(settingsTab === 'profile' ? 0 : 1) * 64}px)`,
                        transition: 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)',
                        zIndex: 0,

                        // DESIGN MAGIC: 
                        // 1. Background is transparent to show the "Content" gradient underneath
                        background: 'transparent',

                        // 2. Shape
                        borderTopLeftRadius: '32px',
                        borderBottomLeftRadius: '32px',

                        // 3. The Sidebar "Background" is actually the shadow of this element!
                        // This creates the perfect "cutout" effect where the active item is light (transparent)
                        // and everything else is dark.
                        boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.25)',

                        // 4. Accent
                        borderLeft: '4px solid var(--secondary-color)'
                    }} />

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
                        <NavButton
                            active={settingsTab === 'accessControl'}
                            icon={<Shield size={18} />}
                            label="Access Control"
                            onClick={() => setSettingsTab('accessControl')}
                        />
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
                        <div style={{
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
                            animation: `${animationName} 0.5s cubic-bezier(0.2, 0, 0, 1) forwards`
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
                position: 'relative'
            }}
        >
            <span style={{ opacity: active ? 1 : 0.8, transition: 'all 0.3s' }}>{icon}</span>
            {label}
        </button>
    );
}

function ProfileSection() {
    return (
        <div style={{ padding: '40px', height: '100%', overflowY: 'auto' }}>

            <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
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
                        overflow: 'hidden',
                        fontSize: '48px',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                        {/* First Letter of Name (A for Admin) */}
                        A
                    </div>
                </div>

                {/* Info Column */}
                <div style={{ flex: 1, maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                        <span style={{ fontSize: '24px', fontWeight: 600, color: 'white' }}>Admin User</span>
                    </div>

                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                        <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)' }}>admin@nalsoft.net</span>
                    </div>

                    {/* Roles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roles Assigned</span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                                background: 'rgba(247, 207, 155, 0.15)',
                                color: 'var(--secondary-color, #F7CF9B)',
                                padding: '6px 16px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <Shield size={14} />
                                Super Administrator
                            </span>
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
        <div style={{ flex: 1, padding: '20px 40px 40px 40px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '0', // Removed gap to connect with content
                paddingTop: '12px'
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
