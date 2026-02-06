import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../../store/uiStore';
import { Bell } from 'lucide-react';

interface HeaderNotificationsProps {
    isUnified: boolean;
    onOpen: () => void;
}

// Native time ago formatter
const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
};

export const HeaderNotifications: React.FC<HeaderNotificationsProps> = ({ isUnified, onOpen }) => {
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [isNotificationPanelClosing, setIsNotificationPanelClosing] = useState(false);
    const notificationPanelRef = useRef<HTMLDivElement>(null);

    // Global Notifications
    const notifications = useUIStore(state => state.notifications);
    const clearNotifications = useUIStore(state => state.clearNotifications);

    // Filter only unread or recent? For now show all in store (capped at 50)
    const hasNotifications = notifications.length > 0;

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

                {/* Notification Indicator - Moved Inside for Correct Positioning */}
                {hasNotifications && (
                    <span style={{
                        position: 'absolute',
                        top: '6px',
                        right: '8px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FF4D4D',
                        border: '2px solid rgba(55, 75, 78, 0.8)',
                        boxSizing: 'content-box',
                    }} />
                )}
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
                        marginBottom: '20px' // [ADDED] Bottom spacing
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
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Decouple from event loop to avoid extension conflicts
                                setTimeout(() => clearNotifications(), 0);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.6)', // Muted white for elegance
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                outline: 'none'
                                // Zero elevation implied by no box-shadow
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Notification List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                        {notifications.length === 0 ? (
                            <div style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.4)',
                                flexDirection: 'column',
                                gap: '10px',
                                padding: '40px 0'
                            }}>
                                <Bell size={32} opacity={0.3} />
                                <span style={{ fontSize: '14px' }}>No new notifications</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                {notifications.map(notification => {
                                    const isAdd = notification.type === 'ADD';
                                    const isDelete = notification.type === 'DELETE';

                                    // Pastel Colors
                                    const bgColor = isAdd ? '#dcfce7' : (isDelete ? '#fee2e2' : 'rgba(255,255,255,0.05)');
                                    const borderColor = isAdd ? '#86efac' : (isDelete ? '#fca5a5' : 'rgba(255,255,255,0.1)');
                                    const textColor = isAdd ? '#15803d' : (isDelete ? '#b91c1c' : 'rgba(255,255,255,0.8)');

                                    // Info Icon Color
                                    const iconColor = isAdd ? '#22c55e' : (isDelete ? '#ef4444' : '#64B5F6');

                                    return (
                                        <div key={notification.id} style={{
                                            background: bgColor,
                                            borderLeft: `4px solid ${borderColor}`,
                                            borderRadius: '6px',
                                            padding: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, fontSize: '14px', color: textColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: iconColor }}></span>
                                                    {isAdd ? 'Container Added' : (isDelete ? 'Container Removed' : 'Info')}
                                                </span>
                                                <span style={{ fontSize: '10px', color: textColor, opacity: 0.8 }}>
                                                    {formatTimeAgo(notification.timestamp)}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '13px', color: textColor, opacity: 0.9, paddingLeft: '14px' }}>
                                                {notification.message}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
