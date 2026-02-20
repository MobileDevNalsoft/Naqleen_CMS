import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, X } from 'lucide-react';
import { useUIStore } from '../../../store/uiStore';
import { useAuthStore } from '../../../features/auth/store/authStore';

// Mock types
interface HeaderProfileProps {
    isUnified: boolean;
    isDashboard: boolean;
    isSettings: boolean;
    hasOnlyDashboard: boolean;
    onNavChange: (nav: string) => void;
    onLogout?: () => void;
    onOpen: () => void; // Trigger to close others
}

export const HeaderProfile: React.FC<HeaderProfileProps> = ({
    isUnified,
    isDashboard,
    isSettings,
    hasOnlyDashboard,
    onNavChange,
    onLogout,
    onOpen
}) => {
    const user = useAuthStore(state => state.user);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isProfileMenuClosing, setIsProfileMenuClosing] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    const closeProfileMenu = () => {
        if (!isProfileMenuOpen || isProfileMenuClosing) return;
        setIsProfileMenuClosing(true);
        setTimeout(() => {
            setIsProfileMenuOpen(false);
            setIsProfileMenuClosing(false);
        }, 350);
    };

    const toggleProfileMenu = () => {
        if (isProfileMenuOpen) {
            closeProfileMenu();
        } else {
            setIsProfileMenuOpen(true);
            onOpen?.();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                if (isProfileMenuOpen && !isProfileMenuClosing) {
                    closeProfileMenu();
                }
            }
        };
        if (isProfileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileMenuOpen, isProfileMenuClosing]);

    // Unified logic override: If dashboard-only user, we want profile shown, close hidden
    const showCloseButton = isUnified && !(isDashboard && hasOnlyDashboard);
    const showProfileAvatar = !isUnified || (isDashboard && hasOnlyDashboard);

    return (
        <div style={{ position: 'relative', width: '40px', height: '40px' }} ref={profileDropdownRef}>
            {/* Profile Avatar - Animate Out */}
            <div
                onClick={toggleProfileMenu}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--secondary-gradient)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 4px 12px rgba(247, 207, 155, 0.3)',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--primary-color)',
                    opacity: showProfileAvatar ? 1 : 0,
                    transform: showProfileAvatar ? 'scale(1) rotate(0)' : 'scale(0.5) rotate(90deg)',
                    transition: 'all 0.6s cubic-bezier(0.25, 1, 0.3, 1)',
                    pointerEvents: showProfileAvatar ? 'auto' : 'none',
                }}
                onMouseEnter={e => {
                    if (showProfileAvatar) {
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(247, 207, 155, 0.5)';
                    }
                }}
                onMouseLeave={e => {
                    if (showProfileAvatar) {
                        e.currentTarget.style.transform = 'scale(1) rotate(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(247, 207, 155, 0.3)';
                    }
                }}
            >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Close Button - Animate In */}
            <div
                onClick={() => {
                    if (isSettings) useUIStore.getState().closePanel();
                    if (isDashboard) onNavChange('3D View');
                }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: showCloseButton ? 1 : 0,
                    transform: showCloseButton ? 'scale(1) rotate(0)' : 'scale(0.5) rotate(-90deg)',
                    transition: 'all 0.6s cubic-bezier(0.25, 1, 0.3, 1)',
                    cursor: 'pointer',
                    pointerEvents: showCloseButton ? 'auto' : 'none',
                    zIndex: 10,
                }}
            >
                <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                >
                    <X size={20} color="white" />
                </div>
            </div>

            {/* Profile Dropdown Menu */}
            {(isProfileMenuOpen || isProfileMenuClosing) && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 14px)',
                        right: 0,
                        minWidth: '240px',
                        background: 'rgba(75, 104, 108, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(247, 207, 155, 0.3)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(247, 207, 155, 0.15)',
                        overflow: 'hidden',
                        transformOrigin: 'top right',
                        animation: isProfileMenuClosing
                            ? 'collapseProfilePremium 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                            : 'expandProfilePremium 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    }}>
                    {/* User Info */}
                    <div style={{
                        padding: '12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%', background: 'var(--secondary-gradient)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '2px solid rgba(247, 207, 155, 0.4)',
                        }}>
                            <User size={24} strokeWidth={2} />
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '2px' }}>{user?.name || 'User'}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>{user?.email || ''}</div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    {!hasOnlyDashboard && (
                        <>
                            <div style={{ padding: '8px 0' }}>
                                <div
                                    onClick={() => {
                                        closeProfileMenu();
                                        useUIStore.getState().openPanel('settings');
                                    }}
                                    style={{
                                        width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                                        color: 'white', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Settings size={18} />
                                    <span>Settings</span>
                                </div>
                            </div>
                            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />
                        </>
                    )}

                    {/* Logout */}
                    <div style={{ padding: '8px 0' }}>
                        <div
                            style={{
                                width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                                color: '#ef4444', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                                setIsProfileMenuOpen(false);
                                onLogout?.();
                            }}
                        >
                            <LogOut size={18} />
                            <span>Logout</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
