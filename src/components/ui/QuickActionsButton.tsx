import { useState, useEffect, useRef } from 'react';
import { Zap, Eye, X, MoreHorizontal, Grid3x3, MapPin, ClipboardList, PackageOpen, Truck, Power, ArrowRightLeft } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

interface QuickActionsButtonProps { }

export default function QuickActionsButton({ }: QuickActionsButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isViewSelectorOpen, setIsViewSelectorOpen] = useState(false);
    const [isActionSelectorOpen, setIsActionSelectorOpen] = useState(false);
    const [currentViewMode, setCurrentViewMode] = useState<'main' | 'top'>('main');
    const lastModeChangeTime = useRef(0);

    const openPanel = useUIStore((state) => state.openPanel);

    const handleToggleQuickActions = () => {
        if (isOpen) {
            // If open, close panels first then close quick actions
            setIsViewSelectorOpen(false);
            setIsActionSelectorOpen(false);
            setIsOpen(false);
        } else {
            // If closed, open quick actions
            setIsOpen(true);
        }
    };

    const handleViewModeChange = (mode: 'main' | 'top') => {
        lastModeChangeTime.current = Date.now();
        if (mode === 'top') {
            window.dispatchEvent(new CustomEvent('moveCameraToTop'));
        } else if (mode === 'main') {
            window.dispatchEvent(new CustomEvent('resetCameraToInitial'));
        }
        setCurrentViewMode(mode);
    };

    // Separate function to only update UI without camera animation
    const handleViewModeChangeUIOnly = (mode: 'main' | 'top') => {
        setCurrentViewMode(mode);
    };

    // Listen for camera disturbance events when in top view
    useEffect(() => {
        const handleCameraDisturbance = () => {
            // Ignore disturbances during the animation window (2 seconds)
            if (Date.now() - lastModeChangeTime.current < 2000) return;

            if (currentViewMode === 'top') {
                // Switch back to main view when camera is disturbed
                handleViewModeChangeUIOnly('main');
            }
        };

        // Listen for OrbitControls change events (this covers rotation, pan, and zoom)
        window.addEventListener('controlsChanged', handleCameraDisturbance);

        return () => {
            window.removeEventListener('controlsChanged', handleCameraDisturbance);
        };
    }, [currentViewMode]);

    // Handle click outside to close Quick Actions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;

            // Check if click is outside the Quick Actions component
            const quickActionsElement = document.getElementById('quick-actions-container');
            if (quickActionsElement && !quickActionsElement.contains(target)) {
                // Close panels first then close quick actions
                setIsViewSelectorOpen(false);
                setIsActionSelectorOpen(false);
                setIsOpen(false);
            }
        };

        // Add event listener only when quick actions is open
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const viewModes = [
        { id: 'main' as const, label: 'Main View', icon: Grid3x3 },
        { id: 'top' as const, label: 'Top View', icon: Eye }
    ];

    const actionModes = [
        { id: 'position', label: 'Position Container', icon: MapPin },
        { id: 'gateIn', label: 'Gate In Entry', icon: Truck },
        { id: 'gateOut', label: 'Gate Out Entry', icon: ArrowRightLeft },
        { id: 'stuffing', label: 'Assign Stuffing', icon: PackageOpen },
        { id: 'destuffing', label: 'Assign Destuffing', icon: PackageOpen },
        { id: 'plugInOut', label: 'Plug In / Out', icon: Power },
        { id: 'cfsTask', label: 'CFS Task Assignment', icon: ClipboardList },
        { id: 'customerInventory', label: 'Customer Inventory', icon: ClipboardList },
    ];

    // Store icon components instead of pre-rendered JSX so we can control size centrally
    const quickActions = [
        {
            Icon: MoreHorizontal,
            label: 'Actions',
            action: () => {
                setIsActionSelectorOpen(!isActionSelectorOpen);
                setIsViewSelectorOpen(false);
            }
        },
        {
            Icon: Eye,
            label: 'Views',
            action: () => {
                setIsViewSelectorOpen(!isViewSelectorOpen);
                setIsActionSelectorOpen(false);
            }
        },
    ];

    return (
        <div id="quick-actions-container" style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 1000,
            width: '64px',
            height: '64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Expanding Vertical Bar */}
            <div style={{
                position: 'absolute',
                bottom: '0',
                left: '-4px', // Centered relative to 64px parent (72-64)/2 = 4px offset
                width: '72px',
                height: isOpen ? `${72 + 12 + (quickActions.length * 60)}px` : '72px',
                opacity: isOpen ? 1 : 0,
                background: 'linear-gradient(135deg, rgba(247, 207, 155, 0.15) 0%, rgba(244, 184, 115, 0.08) 100%)',
                backdropFilter: 'blur(16px) saturate(180%)',
                borderRadius: '36px',
                border: '1px solid rgba(247, 207, 155, 0.3)',
                boxShadow: isOpen
                    ? '0 12px 32px rgba(247, 207, 155, 0.15), 0 4px 12px rgba(244, 184, 115, 0.1)'
                    : 'none',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring-like ease
                zIndex: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column-reverse',
                paddingBottom: isOpen ? '72px' : '72px', // Space for button
                boxSizing: 'border-box',
                alignItems: 'center',
                justifyContent: 'flex-start'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    gap: '12px',
                    width: '100%',
                    alignItems: 'center',
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.3s ease 0.1s',
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}>
                    {quickActions.map(({ Icon, label, action }) => (
                        <button
                            key={label}
                            onClick={action}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.85) 0%, rgba(75, 104, 108, 0.75) 100%)',
                                border: '1px solid rgba(75, 104, 108, 0.3)',
                                color: 'rgba(247, 207, 155, 0.95)',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.1)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(75, 104, 108, 0.3)';
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(75, 104, 108, 0.95) 0%, rgba(75, 104, 108, 0.85) 100%)';
                                e.currentTarget.style.color = '#F7CF9B';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(75, 104, 108, 0.85) 0%, rgba(75, 104, 108, 0.75) 100%)';
                                e.currentTarget.style.color = 'rgba(247, 207, 155, 0.95)';
                            }}
                            title={label}
                        >
                            <Icon size={36} strokeWidth={2.5} />
                        </button>
                    ))}
                </div>
            </div>

            {/* View Selector Panel */}
            <div style={{
                position: 'absolute',
                bottom: '160px', // Position at Eye button center
                left: '70px', // Start from Eye button center
                width: '150px',
                background: 'rgba(253, 246, 235, 0.95)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(75, 104, 108, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                opacity: isViewSelectorOpen ? 1 : 0,
                transform: isViewSelectorOpen ? 'scale(1) translate(0, 0)' : 'scale(0.9) translate(-10px, 10px)',
                transformOrigin: 'bottom left', // Animate from bottom left
                pointerEvents: isViewSelectorOpen ? 'auto' : 'none',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Views
                    </span>
                    <button
                        onClick={() => setIsViewSelectorOpen(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                            e.currentTarget.style.color = '#64748b';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
                <div style={{
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {viewModes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => {
                                handleViewModeChange(mode.id);
                                setIsViewSelectorOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '2px solid rgba(3, 97, 109, 0.1)',
                                background: currentViewMode === mode.id ? 'var(--secondary-gradient)' : 'transparent',
                                color: currentViewMode === mode.id ? 'var(--primary-color)' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '13px',
                                fontWeight: 600
                            }}
                            onMouseEnter={(e) => {
                                if (currentViewMode !== mode.id) {
                                    e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentViewMode !== mode.id) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <mode.icon size={16} />
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Selector Panel */}
            <div style={{
                position: 'absolute',
                bottom: '100px', // Position at Actions button center
                left: '70px', // Start from Actions button center
                width: '240px',
                height: isActionSelectorOpen ? '418px' : '0px', // Adjusted height to fit all items
                background: 'rgba(253, 246, 235, 0.95)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: isActionSelectorOpen ? '1px solid rgba(75, 104, 108, 0.1)' : 'none',
                boxShadow: isActionSelectorOpen ? '0 8px 32px rgba(0, 0, 0, 0.1)' : 'none',
                opacity: isActionSelectorOpen ? 1 : 0,
                transform: isActionSelectorOpen ? 'scale(1) translate(0, 0)' : 'scale(0.9) translate(-10px, 10px)',
                transformOrigin: 'bottom left', // Animate from bottom left
                pointerEvents: isActionSelectorOpen ? 'auto' : 'none',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Actions
                    </span>
                    <button
                        onClick={() => setIsActionSelectorOpen(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                            e.currentTarget.style.color = '#64748b';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
                <div style={{ padding: '8px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                    {actionModes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => {
                                // Open the corresponding panel via store
                                openPanel(mode.id as any);
                                // Close quick actions after selection
                                setIsActionSelectorOpen(false);
                                setIsOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '2px solid rgba(75, 104, 108, 0.1)',
                                background: 'transparent',
                                color: '#1e293b',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '13px',
                                fontWeight: 500,
                                width: '100%',
                                textAlign: 'left',
                                marginBottom: '4px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(75, 104, 108, 0.05)';
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                        >
                            <mode.icon size={16} style={{ color: '#4B686C' }} />
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={handleToggleQuickActions}
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: isOpen ? '#1e293b' : 'var(--secondary-gradient)',
                    border: 'none',
                    outline: 'none',
                    color: isOpen ? '#F7CF9B' : 'var(--primary-color)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
                }}
                onMouseDown={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.border = 'none';
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = isOpen ? 'rotate(45deg) scale(1.05)' : 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(247, 207, 155, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = isOpen ? 'rotate(45deg) scale(1)' : 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
                }}
            >
                <Zap size={28} fill="none" />
            </button>
        </div>
    );
}
