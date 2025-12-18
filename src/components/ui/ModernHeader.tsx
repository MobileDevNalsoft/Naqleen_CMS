import { useState, useEffect, useRef } from 'react';
import { ChevronDown, MapPin, Bell, User, Settings, LogOut, X, Package, Search, Truck, AlertCircle, Check, Info } from 'lucide-react';
import { useIcdsQuery } from '../../api';
import { useStore } from '../../store/store';

interface ModernHeaderProps {
    activeNav: string;
    onNavChange: (nav: string) => void;
    isSearchVisible?: boolean;
    isUIVisible?: boolean; // Controls ICD dropdown, center nav, and search visibility
    selectedIcdId: string;
    onIcdChange: (id: string) => void;
    onLogout?: () => void;
}

export default function ModernHeader({ activeNav, onNavChange, isSearchVisible = true, isUIVisible = true, selectedIcdId, onIcdChange, onLogout }: ModernHeaderProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // Removed local selectedIcdId state in favor of parent state
    const [notificationCount] = useState(3); // Mock notification count
    // Local state removed in favor of props
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [isNotificationPanelClosing, setIsNotificationPanelClosing] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearchClosing, setIsSearchClosing] = useState(false);

    const { data: icds, isLoading } = useIcdsQuery();

    // Auto-select first ICD if none selected found in list (optional, but good for safety)
    useEffect(() => {
        if (icds && icds.length > 0 && !selectedIcdId) {
            onIcdChange(icds[0].id);
        }
    }, [icds, selectedIcdId, onIcdChange]);

    // Store access for container search
    const entities = useStore((state) => state.entities);
    const ids = useStore((state) => state.ids);
    const setSelectId = useStore((state) => state.setSelectId);

    // Refs for dropdown containers
    const icdDropdownRef = useRef<HTMLDivElement>(null);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const notificationPanelRef = useRef<HTMLDivElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Handle search close with animation
    const handleSearchClose = () => {
        // Only close if search is open and not already closing
        if (!isSearchOpen || isSearchClosing) return;

        setIsSearchClosing(true);
        setTimeout(() => {
            setIsSearchOpen(false);
            setIsSearchClosing(false);
            setSearchQuery('');
            setSearchResults([]);
        }, 200); // Match collapse animation duration
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Close icd dropdown if clicking outside
            if (icdDropdownRef.current && !icdDropdownRef.current.contains(target)) {
                setIsDropdownOpen(false);
            }

            // Close profile dropdown if clicking outside
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
                setIsProfileMenuOpen(false);
            }

            // Close notification panel if clicking outside
            if (notificationPanelRef.current && !notificationPanelRef.current.contains(target)) {
                closeNotificationPanel();
            }

            // Close search if clicking outside
            if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
                handleSearchClose();
            }
        };

        // Add event listener when any dropdown/panel is open
        if (isDropdownOpen || isProfileMenuOpen || isNotificationPanelOpen || isSearchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen, isProfileMenuOpen, isNotificationPanelOpen, isSearchOpen]);

    // Auto-focus search input when opened
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Handle search query changes
    const handleSearchChange = (query: string) => {
        setSearchQuery(query);

        if (query.length > 1) {
            const results = ids.filter(id =>
                id.toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    // Handle search result selection
    const handleResultClick = (containerId: string) => {
        setSelectId(containerId);
        handleSearchClose();
    };

    // Handle notification panel close with animation
    const closeNotificationPanel = () => {
        setIsNotificationPanelClosing(true);
        setTimeout(() => {
            setIsNotificationPanelOpen(false);
            setIsNotificationPanelClosing(false);
        }, 400); // Match opening animation timing
    };

    const currentIcd = icds?.find(t => t.id === selectedIcdId);

    const handleIcdSelect = (icdId: string) => {
        onIcdChange(icdId);
        setIsDropdownOpen(false);
    };

    return (
        <>

            {/* Left Header: Branding & Icd Selector */}
            <div style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                padding: '12px 20px',
                borderRadius: '50px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}>
                {/* Left Section: Branding */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: 'white',
                        letterSpacing: '-0.02em',
                    }}>
                        Nalsoft
                    </span>
                </div>

                {/* Divider */}
                {activeNav !== 'Dashboard' && isUIVisible && (
                    <>
                        <div style={{
                            width: '1px',
                            height: '28px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            marginLeft: '16px',
                        }} />

                        {/* Icd Selector */}
                        <div style={{ position: 'relative', marginLeft: '16px' }} ref={icdDropdownRef}>
                            <div
                                onClick={() => {
                                    setIsDropdownOpen(!isDropdownOpen);
                                    // Close search when opening icd dropdown
                                    if (isSearchOpen) {
                                        handleSearchClose();
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    borderRadius: '30px',
                                    padding: '8px 12px',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    outline: 'none',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <MapPin size={16} color="var(--secondary-color)" />
                                <div style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                                    {isLoading ? 'Loading...' : currentIcd?.name || 'Select Icd'}
                                </div>
                                <ChevronDown
                                    size={16}
                                    style={{
                                        transition: 'transform 0.2s',
                                        transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}
                                />
                            </div>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && icds && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 14px)',
                                    right: 0,
                                    minWidth: '175px',
                                    background: 'rgba(75, 104, 108, 0.98)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(247, 207, 155, 0.3)',
                                    borderRadius: '16px',
                                    boxShadow: '0 8px 32px rgba(247, 207, 155, 0.15)',
                                    overflow: 'hidden',
                                    animation: 'slideDown 0.2s ease-out',
                                }}>
                                    {icds.map((icd) => (
                                        <div
                                            key={icd.id}
                                            onClick={() => handleIcdSelect(icd.id)}
                                            style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                background: icd.id === selectedIcdId ? 'rgba(247, 207, 155, 0.1)' : 'transparent',
                                                borderLeft: icd.id === selectedIcdId ? '3px solid var(--secondary-color)' : '3px solid transparent',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => {
                                                if (icd.id !== selectedIcdId) {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (icd.id !== selectedIcdId) {
                                                    e.currentTarget.style.background = 'transparent';
                                                }
                                            }}
                                        >
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: 'white',
                                                marginBottom: '4px'
                                            }}>
                                                {icd.name}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <MapPin size={12} />
                                                {icd.location}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Center Navigation */}
            {isUIVisible && (
                <div style={{
                    position: 'absolute',
                    top: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    padding: '6px',
                    borderRadius: '50px',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}>
                    {['3D View', 'Dashboard'].map((item) => (
                        <div
                            key={item}
                            onClick={() => {
                                onNavChange(item);
                                // Close search when switching navigation
                                if (isSearchOpen) {
                                    handleSearchClose();
                                }
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '50px',
                                background: activeNav === item ? 'rgba(197, 147, 90, 0.3)' : 'transparent',
                                color: activeNav === item ? 'var(--secondary-color)' : 'white',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                outline: 'none',
                            }}
                            onMouseEnter={e => {
                                if (activeNav !== item) {
                                    e.currentTarget.style.background = 'rgba(247, 207, 155, 0.1)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (activeNav !== item) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            )}

            {/* Right Header: Notifications & Profile */}
            <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                padding: '12px 16px',
                borderRadius: '50px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}>
                {/* Search Button & Expandable Field */}
                {isSearchVisible && isUIVisible && (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={searchContainerRef}>
                        {/* Search Icon Button */}
                        {!isSearchOpen && !isSearchClosing && (
                            <div
                                onClick={() => setIsSearchOpen(true)}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    padding: '0px',
                                    color: 'var(--secondary-color)',
                                    outline: 'none',
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
                                <Search size={20} strokeWidth={2} />
                            </div>
                        )}


                        {/* Expandable Search Field */}
                        {(isSearchOpen || isSearchClosing) && (
                            <div style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(75, 104, 108, 0.98)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(247, 207, 155, 0.3)',
                                borderRadius: '50px',
                                padding: '6px 12px',
                                width: '300px',
                                animation: isSearchClosing
                                    ? 'collapseSearch 0.25s cubic-bezier(0.4, 0, 1, 1) forwards'
                                    : 'expandSearch 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                boxShadow: '0 8px 24px rgba(247, 207, 155, 0.2)',
                            }}>
                                <Search size={18} color="var(--secondary-color)" strokeWidth={2} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search containers..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: 400,
                                        padding: '4px 0',
                                    }}
                                />
                                {searchQuery && (
                                    <div
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                                        }}
                                    >
                                        <X size={14} />
                                    </div>
                                )}

                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 15px)',
                                        left: 0,
                                        right: 0,
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        background: 'rgba(75, 104, 108, 0.98)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(247, 207, 155, 0.3)',
                                        borderRadius: '16px',
                                        boxShadow: '0 8px 32px rgba(247, 207, 155, 0.15)',
                                        animation: 'fadeIn 0.2s ease-out',
                                        zIndex: 1000,
                                    }}>
                                        {searchResults.map((id) => (
                                            <div
                                                key={id}
                                                onClick={() => handleResultClick(id)}
                                                style={{
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(247, 207, 155, 0.1)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                }}>
                                                    <Package size={16} color="var(--secondary-color)" />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            color: 'white',
                                                            marginBottom: '2px',
                                                        }}>
                                                            {id}
                                                        </div>
                                                        {entities[id]?.blockId && (
                                                            <div style={{
                                                                fontSize: '12px',
                                                                color: 'rgba(255, 255, 255, 0.6)',
                                                            }}>
                                                                Block {entities[id].blockId} • Row {entities[id].row} • Level {entities[id].level}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Divider */}
                {isSearchOpen && (
                    <div style={{
                        width: '1px',
                        height: '28px',
                        background: 'rgba(255, 255, 255, 0.2)',
                    }} />
                )}

                {/* Notifications Button */}
                <div
                    onClick={() => {
                        setIsNotificationPanelOpen(!isNotificationPanelOpen);
                        // Close search when opening notifications
                        if (isSearchOpen) {
                            handleSearchClose();
                        }
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
                        transition: 'all 0.2s',
                        padding: '0px',
                        color: 'var(--secondary-color)',
                        outline: 'none',
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
                    {notificationCount > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '0px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            border: '2px solid var(--glass-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: 'white',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                        }}>
                            {notificationCount}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div style={{
                    width: '1px',
                    height: '28px',
                    background: 'rgba(255, 255, 255, 0.2)',
                }} />

                {/* Profile Button */}
                <div style={{ position: 'relative' }} ref={profileDropdownRef}>
                    <div
                        onClick={() => {
                            setIsProfileMenuOpen(!isProfileMenuOpen);
                            // Close search when opening profile menu
                            if (isSearchOpen) {
                                handleSearchClose();
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--secondary-gradient)',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            outline: 'none',
                            boxSizing: 'border-box',
                            boxShadow: '0 4px 12px rgba(247, 207, 155, 0.3)',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: 'var(--primary-color)',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(247, 207, 155, 0.5)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(247, 207, 155, 0.3)';
                        }}
                    >
                        A
                    </div>

                    {/* Profile Dropdown Menu */}
                    {isProfileMenuOpen && (
                        <div style={{
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
                            animation: 'slideDown 0.2s ease-out',
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
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'var(--secondary-gradient)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    border: '2px solid rgba(247, 207, 155, 0.4)',
                                }}>
                                    <User size={24} strokeWidth={2} />
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: 'white',
                                        marginBottom: '2px',
                                    }}>
                                        Admin User
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    }}>
                                        admin@nalsoft.net
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div style={{ padding: '8px 0' }}>
                                <div
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        color: 'white',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        outline: 'none',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <User size={18} />
                                    <span>My Profile</span>
                                </div>

                                <div
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        color: 'white',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        outline: 'none',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Settings size={18} />
                                    <span>Preferences</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{
                                height: '1px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                margin: '4px 0',
                            }} />

                            {/* Logout */}
                            <div style={{ padding: '8px 0' }}>
                                <div
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        color: '#ef4444',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        outline: 'none',
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
            </div >

            {/* Animation for dropdown */}
            < style > {`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes slideFromEye {
                    from {
                        opacity: 0;
                        transform: translateX(-40px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes expandSearch {
                    from {
                        opacity: 0;
                        width: 40px;
                    }
                    to {
                        opacity: 1;
                        width: 300px;
                    }
                }
                @keyframes collapseSearch {
                    from {
                        opacity: 1;
                        width: 300px;
                        transform: scale(1);
                    }
                    to {
                        opacity: 0;
                        width: 40px;
                        transform: scale(0.95);
                    }
                }
                @keyframes slideInFromRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
            `}</style >

            {/* Notification Panel */}
            {
                isNotificationPanelOpen && (
                    <div
                        ref={notificationPanelRef}
                        style={{
                            position: 'fixed',
                            top: '85px', // Below header
                            right: '15px',
                            width: '380px',
                            maxHeight: 'calc(100vh - 100px)',
                            backgroundColor: 'var(--glass-bg)', // Dark glass
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
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flex: 1,
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--secondary-gradient)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(247, 207, 155, 0.3)',
                                }}>
                                    <Bell size={16} color="white" strokeWidth={2} />
                                </div>
                                <div>
                                    <h2 style={{
                                        fontSize: '25px',
                                        fontWeight: 600,
                                        color: 'white',
                                        margin: 0,
                                    }}>Notifications</h2>
                                </div>
                            </div>
                            <div
                                onClick={() => closeNotificationPanel()}
                                style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'color 0.2s',
                                    padding: 0,
                                    outline: 'none',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.color = 'var(--secondary-color)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                                }}
                            >
                                mark all as read
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}>
                            {/* Notification Item 1 - Container Arrival */}
                            <div style={{
                                background: 'rgba(247, 207, 155, 0.08)',
                                border: '1px solid rgba(247, 207, 155, 0.15)',
                                borderRadius: '12px',
                                padding: '12px',
                                animation: 'fadeIn 0.3s ease-out 0.1s both',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(247, 207, 155, 0.12)';
                                    e.currentTarget.style.borderColor = 'rgba(247, 207, 155, 0.25)';
                                    e.currentTarget.style.transform = 'translateX(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(247, 207, 155, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(247, 207, 155, 0.15)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'var(--secondary-gradient)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(247, 207, 155, 0.3)',
                                    }}>
                                        <Truck size={16} color="white" strokeWidth={2} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'white',
                                            marginBottom: '4px',
                                            lineHeight: 1.4,
                                        }}>
                                            Container Arrival
                                        </div>
                                        <div style={{
                                            fontSize: '13px',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            marginBottom: '8px',
                                            lineHeight: 1.4,
                                        }}>
                                            Container #CN-4521 has arrived at Lot A-12 and is ready for processing.
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            <span>2 minutes ago</span>
                                            <span>•</span>
                                            <span style={{ color: 'var(--secondary-color)' }}>High Priority</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notification Item 2 - System Alert */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '12px',
                                animation: 'fadeIn 0.3s ease-out 0.2s both',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.transform = 'translateX(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                    }}>
                                        <AlertCircle size={16} color="#ef4444" strokeWidth={2} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'white',
                                            marginBottom: '4px',
                                            lineHeight: 1.4,
                                        }}>
                                            Storage Capacity Alert
                                        </div>
                                        <div style={{
                                            fontSize: '13px',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            marginBottom: '8px',
                                            lineHeight: 1.4,
                                        }}>
                                            Block C is at 95% capacity. Consider redistributing containers to avoid overflow.
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            <span>15 minutes ago</span>
                                            <span>•</span>
                                            <span style={{ color: '#ef4444' }}>Urgent</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notification Item 3 - Success */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '12px',
                                animation: 'fadeIn 0.3s ease-out 0.3s both',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.transform = 'translateX(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                    }}>
                                        <Check size={16} color="#22c55e" strokeWidth={2} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'white',
                                            marginBottom: '4px',
                                            lineHeight: 1.4,
                                        }}>
                                            Processing Complete
                                        </div>
                                        <div style={{
                                            fontSize: '13px',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            marginBottom: '8px',
                                            lineHeight: 1.4,
                                        }}>
                                            Container #CN-3892 has been successfully processed and moved to storage.
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            <span>1 hour ago</span>
                                            <span>•</span>
                                            <span style={{ color: '#22c55e' }}>Completed</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notification Item 4 - Info */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '12px',
                                animation: 'fadeIn 0.3s ease-out 0.4s both',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.transform = 'translateX(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                    }}>
                                        <Info size={16} color="#3b82f6" strokeWidth={2} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'white',
                                            marginBottom: '4px',
                                            lineHeight: 1.4,
                                        }}>
                                            System Update
                                        </div>
                                        <div style={{
                                            fontSize: '13px',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            marginBottom: '8px',
                                            lineHeight: 1.4,
                                        }}>
                                            Container management system has been updated to version 2.4.1 with performance improvements.
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            <span>2 hours ago</span>
                                            <span>•</span>
                                            <span style={{ color: '#3b82f6' }}>Information</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
