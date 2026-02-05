import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface HeaderNotificationsProps {
    isUnified: boolean;
    onOpen: () => void;
}

export const HeaderNotifications: React.FC<HeaderNotificationsProps> = ({ isUnified, onOpen }) => {
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [isNotificationPanelClosing, setIsNotificationPanelClosing] = useState(false);
    const notificationPanelRef = useRef<HTMLDivElement>(null);

    const closeNotificationPanel = () => {
        setIsNotificationPanelClosing(true);
        setTimeout(() => {
            setIsNotificationPanelOpen(false);
            setIsNotificationPanelClosing(false);
        }, 400);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
                closeNotificationPanel();
            }
        };
        if (isNotificationPanelOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotificationPanelOpen]);

    return (
        <>
            {/* Notifications Button */}
            <div
                onClick={() => {
                    setIsNotificationPanelOpen(!isNotificationPanelOpen);
                    onOpen?.(); // Notify parent to close search/others
                }}
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    transition: 'all 0.5s cubic-bezier(0.25, 1, 0.3, 1)',
                    padding: '0px',
                    color: 'var(--secondary-color)',
                    outline: 'none',
                    opacity: isUnified ? 0 : 1, // Hide when unified
                    transform: isUnified ? 'scale(0.8) translateY(10px)' : 'scale(1) translateY(0)',
                    pointerEvents: isUnified ? 'none' : 'auto',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <Bell size={20} strokeWidth={2} />
            </div>

            {/* Notification Panel */}
            {isNotificationPanelOpen && (
                <div
                    ref={notificationPanelRef}
                    style={{
                        position: 'fixed',
                        top: '85px',
                        right: '15px',
                        width: '380px',
                        maxHeight: 'calc(100vh - 100px)',
                        backgroundColor: 'var(--glass-bg)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        border: '1px solid var(--glass-border)',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                        zIndex: 1000,
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease',
                        transform: isNotificationPanelClosing ? 'translateX(100%)' : 'translateX(0)',
                        opacity: isNotificationPanelClosing ? 0 : 1,
                        overflow: 'hidden',
                        animation: isNotificationPanelClosing ? 'none' : 'slideInFromRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--secondary-gradient)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(247, 207, 155, 0.3)'
                            }}>
                                <Bell size={16} color="white" strokeWidth={2} />
                            </div>
                            <h2 style={{ fontSize: '25px', fontWeight: 600, color: 'white', margin: 0 }}>Notifications</h2>
                        </div>
                        <div
                            onClick={() => closeNotificationPanel()}
                            style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--secondary-color)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                        >
                            mark all as read
                        </div>
                    </div>

                    {/* Empty State */}
                    <div style={{
                        flex: 1, padding: '40px 20px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.4)', gap: '12px'
                    }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bell size={20} />
                        </div>
                        <span style={{ fontSize: '14px' }}>No new notifications</span>
                    </div>
                </div>
            )}
        </>
    );
};
