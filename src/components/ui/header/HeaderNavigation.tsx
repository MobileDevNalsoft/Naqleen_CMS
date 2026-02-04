import React from 'react';

interface HeaderNavigationProps {
    activeNav: string;
    onNavChange: (nav: string) => void;
    isUnified: boolean;
    isSettings: boolean;
    isDashboard: boolean;
    settingsTab: string;
    hasBothViews: boolean;
    has3DView: boolean;
    hasDashboard: boolean;
}

export const HeaderNavigation: React.FC<HeaderNavigationProps> = ({
    activeNav,
    onNavChange,
    isUnified,
    isSettings,
    isDashboard,
    settingsTab,
    hasBothViews,
    has3DView,
    hasDashboard
}) => {
    return (
        <div style={{
            position: 'absolute',
            top: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001, // Keep interactive on top
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            // Fade out background/border using opacity or color
            background: isUnified ? 'transparent' : 'rgba(55, 75, 78, 0.8)',
            backdropFilter: isUnified ? 'none' : 'blur(20px)',
            padding: '6px',
            borderRadius: '50px',
            border: isUnified ? '1px solid transparent' : '1px solid var(--glass-border)',
            boxShadow: isUnified ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.1)',
            // Open: Instant hide (0s). Close: Smooth fade in AFTER contraction starts (0.4s delay)
            transition: isUnified
                ? 'background 0s, border 0s, box-shadow 0s, backdrop-filter 0s'
                : 'all 0.8s cubic-bezier(0.25, 1, 0.3, 1) 0.4s',
            pointerEvents: isUnified ? 'none' : 'auto',
        }}>
            {/* Navigation Items - Fade Out (Only show if user has both views) */}
            {hasBothViews && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: isUnified ? 0 : 1,
                    // Open: Instant opacity 0. Close: Smooth fade in matched with container
                    transition: isUnified ? 'opacity 0s' : 'opacity 0.8s ease 0.4s',
                }}>
                    {/* Dynamically show nav items based on screen access */}
                    {has3DView && (
                        <div
                            onClick={() => {
                                onNavChange('3D View');
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '50px',
                                background: activeNav === '3D View' ? 'rgba(197, 147, 90, 0.3)' : 'transparent',
                                color: activeNav === '3D View' ? 'var(--secondary-color)' : 'white',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                outline: 'none',
                            }}
                            onMouseEnter={e => { if (activeNav !== '3D View') e.currentTarget.style.background = 'rgba(247, 207, 155, 0.1)'; }}
                            onMouseLeave={e => { if (activeNav !== '3D View') e.currentTarget.style.background = 'transparent'; }}
                        >
                            3D View
                        </div>
                    )}
                    {hasDashboard && (
                        <div
                            onClick={() => {
                                onNavChange('Dashboard');
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '50px',
                                background: activeNav === 'Dashboard' ? 'rgba(197, 147, 90, 0.3)' : 'transparent',
                                color: activeNav === 'Dashboard' ? 'var(--secondary-color)' : 'white',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                outline: 'none',
                            }}
                            onMouseEnter={e => { if (activeNav !== 'Dashboard') e.currentTarget.style.background = 'rgba(247, 207, 155, 0.1)'; }}
                            onMouseLeave={e => { if (activeNav !== 'Dashboard') e.currentTarget.style.background = 'transparent'; }}
                        >
                            Dashboard
                        </div>
                    )}
                </div>
            )}

            {/* Dynamic Settings/Dashboard Title - Fade In Delayed on open, Instant hide on close */}
            <div style={{
                position: 'absolute',
                top: '32px', // Center vertically within 64px header
                left: '50%',
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                opacity: isUnified ? 1 : 0,
                // On open: wait 1.2s for merge, then fade in. On close: instant hide
                transition: isUnified ? 'opacity 0.6s ease-in-out 1.2s' : 'opacity 0.1s ease-out 0s',
            }}>
                {isSettings ? (settingsTab === 'profile' ? 'My Profile' : 'Access Control') : (isDashboard ? 'Dashboards' : '')}
            </div>
        </div>
    );
};
