import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useScreenAccess } from '../../hooks/useScreenAccess';
import { HeaderLogo } from './header/HeaderLogo';
import { HeaderIcdSelector } from './header/HeaderIcdSelector';
import { HeaderNavigation } from './header/HeaderNavigation';
import { HeaderSearch } from './header/HeaderSearch';
import { HeaderNotifications } from './header/HeaderNotifications';
import { HeaderProfile } from './header/HeaderProfile';

interface ModernHeaderProps {
    activeNav: string;
    onNavChange: (nav: string) => void;
    isSearchVisible?: boolean;
    isUIVisible?: boolean;
    selectedIcdId: string;
    onIcdChange: (id: string) => void;
    onLogout?: () => void;
}

export default function ModernHeader({
    activeNav,
    onNavChange,
    isSearchVisible = true,
    isUIVisible = true,
    selectedIcdId,
    onIcdChange,
    onLogout
}: ModernHeaderProps) {
    const { has3DView, hasDashboard, hasBothViews, hasOnlyDashboard } = useScreenAccess();

    // Store access
    const activePanel = useUIStore(state => state.activePanel);
    const settingsTab = useUIStore(state => state.settingsTab);
    const isSettings = activePanel === 'settings';

    // UI Logic
    const isDashboard = activeNav === 'Dashboard';
    const isUnified = isSettings || isDashboard;

    // Coordination State
    // We use a counter to signal "force close" events to the Search component
    // whenever another dropdown is opened.
    const [searchCloseSignal, setSearchCloseSignal] = useState(false);

    const handleOtherInteraction = () => {
        setSearchCloseSignal(prev => !prev);
    };

    // Transition Constants (Preserved from original)
    const transitionStyle = isUnified
        ? 'all 1.2s cubic-bezier(0.25, 1, 0.3, 1)'
        : 'all 0.9s cubic-bezier(0.25, 1, 0.3, 1) 0s';

    const backgroundTransition = isUnified
        ? 'background 0.5s ease-in-out 0.8s, backdrop-filter 0.5s ease-in-out 0.8s, border-color 0.5s ease-in-out 0.8s, box-shadow 0.5s ease-in-out 0.8s'
        : 'background 0s linear 0s, backdrop-filter 0s linear 0s, border-color 0.2s linear 0.1s, box-shadow 0.2s linear 0.1s';

    return (
        <>
            {/* Unified Background Layer */}
            <div style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                width: 'calc(100% - 30px)',
                height: '64px',
                borderRadius: '50px',
                background: isUnified
                    ? 'linear-gradient(135deg, rgba(56, 78, 81, 0.95) 0%, rgba(35, 54, 66, 0.95) 100%)'
                    : 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                zIndex: 990,
                opacity: isUnified ? 1 : 0,
                transition: isUnified ? 'opacity 0.5s ease-in-out 0.8s' : 'opacity 0s linear 0s',
                pointerEvents: 'none',
            }} />

            {/* Left Header: Branding & Icd Selector */}
            <div style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                background: isUnified ? 'transparent' : 'rgba(55, 75, 78, 0.8)',
                backdropFilter: isUnified ? 'none' : 'blur(20px)',
                padding: '0 20px',
                height: '64px',
                boxSizing: 'border-box',
                width: 'auto',
                minWidth: isUnified ? 'calc(50% - 13px)' : '0px',
                borderRadius: isUnified ? '50px 0 0 50px' : '50px',
                border: '1px solid var(--glass-border)',
                borderColor: isUnified ? 'transparent' : 'var(--glass-border)',
                boxShadow: isUnified ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.1)',
                transition: `${transitionStyle}, ${backgroundTransition}`,
            }}>
                <HeaderLogo />

                {/* Divider & Selector */}
                {activeNav !== 'Dashboard' && isUIVisible && (
                    <>
                        <div style={{
                            width: '1px',
                            height: '28px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            marginLeft: '16px',
                        }} />

                        <HeaderIcdSelector
                            selectedIcdId={selectedIcdId}
                            onIcdChange={onIcdChange}
                            isUnified={isUnified}
                            isSettings={isSettings}
                            isDashboard={isDashboard}
                        />
                    </>
                )}
            </div>

            {/* Center Navigation */}
            {isUIVisible && (hasBothViews || isUnified) && (
                <HeaderNavigation
                    activeNav={activeNav}
                    onNavChange={onNavChange}
                    isUnified={isUnified}
                    isSettings={isSettings}
                    isDashboard={isDashboard}
                    settingsTab={settingsTab}
                    hasBothViews={hasBothViews}
                    has3DView={has3DView}
                    hasDashboard={hasDashboard}
                />
            )}

            {/* Right Header: Search, Notifications, Profile */}
            <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                background: isUnified ? 'transparent' : 'rgba(55, 75, 78, 0.8)',
                backdropFilter: isUnified ? 'none' : 'blur(20px)',
                padding: '0 16px',
                height: '64px',
                boxSizing: 'border-box',
                width: 'auto',
                minWidth: isUnified ? 'calc(50% - 13px)' : '0px',
                borderRadius: isUnified ? '0 50px 50px 0' : '50px',
                border: '1px solid var(--glass-border)',
                borderColor: isUnified ? 'transparent' : 'var(--glass-border)',
                boxShadow: isUnified ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.1)',
                transition: `${transitionStyle}, ${backgroundTransition}`,
            }}>
                {/* Search */}
                {activeNav !== 'Dashboard' && isSearchVisible && isUIVisible && (
                    <>
                        <HeaderSearch
                            isVisible={true}
                            isUnified={isUnified}

                            shouldClose={searchCloseSignal}
                        />
                        {/* Divider - Hidden for cleaner look as it was dynamic */}
                        <div style={{
                            width: '1px',
                            height: '28px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            display: 'none'
                        }} />
                    </>
                )}

                {/* Notifications */}
                <HeaderNotifications
                    isUnified={isUnified}
                    onOpen={handleOtherInteraction}
                />

                {/* Divider - Always visible unless unified */}
                <div style={{
                    width: '1px',
                    height: '28px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    opacity: isUnified ? 0 : 1,
                    transition: 'opacity 0.2s',
                }} />

                {/* Profile */}
                <HeaderProfile
                    isUnified={isUnified}
                    isDashboard={isDashboard}
                    isSettings={isSettings}
                    hasOnlyDashboard={hasOnlyDashboard}
                    onNavChange={onNavChange}
                    onLogout={onLogout}
                    onOpen={handleOtherInteraction}
                />
            </div>

            {/* Global Styles for Animations (Preserved) */}
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes expandProfilePremium {
                    0% { opacity: 0; transform: scale(0.85) translateY(-15px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes collapseProfilePremium {
                    0% { opacity: 1; transform: scale(1) translateY(0); }
                    100% { opacity: 0; transform: scale(0.85) translateY(-15px); }
                }
                @keyframes expandSearch {
                    from { opacity: 0; width: 40px; }
                    to { opacity: 1; width: 320px; }
                }
                @keyframes collapseSearch {
                    from { opacity: 1; width: 320px; transform: scale(1); }
                    to { opacity: 0; width: 40px; transform: scale(0.95); }
                }
                @keyframes slideInFromRight {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </>
    );
}
