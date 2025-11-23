import { useState, useEffect } from 'react';
import {
    Search, Menu, X, Grid3x3, MapPin, User, Settings, ChevronDown, LogOut,
    Plus, FileText, Bell, Download, Upload, Calendar,
    Truck, ClipboardList, Package, AlertTriangle
} from 'lucide-react';

import { useStore } from '../store/store';
import { useTerminalsQuery } from '../api';
import './Header.css';

interface HeaderProps {
    onViewModeChange?: (mode: 'main' | 'top') => void;
    currentViewMode?: 'main' | 'top';
}

export default function Header({ onViewModeChange, currentViewMode = 'main' }: HeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isViewsOpen, setIsViewsOpen] = useState(false);
    const [isOperationsOpen, setIsOperationsOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isTerminalMenuOpen, setIsTerminalMenuOpen] = useState(false);
    const [selectedTerminal, setSelectedTerminal] = useState('');

    // Store access
    const entities = useStore((state) => state.entities);
    const ids = useStore((state) => state.ids);
    const setSelectId = useStore((state) => state.setSelectId);

    // Fetch terminals from API
    const { data: terminals, isLoading: terminalsLoading } = useTerminalsQuery();

    // Set default terminal when data loads
    useEffect(() => {
        if (terminals && terminals.length > 0 && !selectedTerminal) {
            setSelectedTerminal(terminals[0].id);
        }
    }, [terminals, selectedTerminal]);

    const viewModes = [
        { id: 'main' as const, label: 'Main View', icon: Grid3x3 },
        { id: 'top' as const, label: 'Top View', icon: MapPin }
    ];

    const notifications = [
        { id: 1, type: 'info', message: 'Container ABC123 ready for pickup', time: '5 min ago' },
        { id: 2, type: 'warning', message: '15 containers exceeding free time', time: '1 hour ago' },
        { id: 3, type: 'success', message: 'Vessel MV STAR arrived', time: '2 hours ago' }
    ];

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length > 1) {
            const results = ids.filter(id =>
                id.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 10); // Limit to 10 results
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const handleResultClick = (containerId: string) => {
        setSelectId(containerId);
        setSearchQuery('');
        setSearchResults([]);
        // Dispatch event to focus camera if needed, though setSelectId might handle it in other components
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchResults.length > 0) {
            handleResultClick(searchResults[0]);
        }
    };

    const handleViewModeChange = (mode: 'main' | 'top') => {
        if (mode === 'top') {
            window.dispatchEvent(new CustomEvent('moveCameraToTop'));
        } else if (mode === 'main') {
            // Reset camera to initial view
            window.dispatchEvent(new CustomEvent('resetCameraToInitial'));
        }
        onViewModeChange?.(mode);
        setIsViewsOpen(false);
    };

    // Find current terminal name
    const currentTerminalName = terminals?.find(t => t.id === selectedTerminal)?.name || 'Select Terminal';

    return (
        <>
            <header className="app-header">
                <div className="header-container">
                    {/* Left Section: Logo & Terminal Selector */}
                    <div className="header-left">
                        <div className="header-logo">
                            <div className="logo-icon">
                                <Grid3x3 size={28} strokeWidth={2.5} />
                            </div>
                            <div className="logo-text">
                                <h1>Naqleen</h1>
                                <span>CMS</span>
                            </div>
                        </div>

                        <div
                            className="terminal-selector"
                            onMouseEnter={() => setIsTerminalMenuOpen(true)}
                            onMouseLeave={() => setIsTerminalMenuOpen(false)}
                        >
                            <button
                                className="terminal-dropdown-btn"
                                disabled={terminalsLoading || !terminals}
                            >
                                <span className="terminal-name">
                                    {terminalsLoading ? 'Loading...' : currentTerminalName}
                                </span>
                                <ChevronDown size={16} className={`select-icon ${isTerminalMenuOpen ? 'open' : ''}`} />
                            </button>

                            {isTerminalMenuOpen && terminals && terminals.length > 0 && (
                                <div className="dropdown-menu terminal-menu">
                                    {terminals.map(terminal => (
                                        <button
                                            key={terminal.id}
                                            className={`dropdown-item ${selectedTerminal === terminal.id ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedTerminal(terminal.id);
                                                setIsTerminalMenuOpen(false);
                                            }}
                                        >
                                            <MapPin size={16} />
                                            <span>{terminal.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center Section: Search */}
                    <div className="header-center">
                        <div className="search-container">
                            <form onSubmit={handleSearch} className="search-form">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search containers..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="search-input"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        className="search-clear"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </form>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="search-results-dropdown">
                                    {searchResults.map(id => (
                                        <button
                                            key={id}
                                            className="search-result-item"
                                            onClick={() => handleResultClick(id)}
                                        >
                                            <Package size={16} />
                                            <div className="result-info">
                                                <span className="result-id">{id}</span>
                                                {entities[id]?.blockId && (
                                                    <span className="result-location">
                                                        Block {entities[id].blockId} • Row {entities[id].row} • Tier {entities[id].tier}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Views Dropdown Section */}
                    <div className="header-views">
                        <div
                            className="dropdown-container"
                            onMouseEnter={() => setIsViewsOpen(true)}
                            onMouseLeave={() => setIsViewsOpen(false)}
                        >
                            <button
                                className="header-action-btn"
                                title="Views"
                            >
                                <Grid3x3 size={20} />
                                <span className="btn-label">Views</span>
                                <ChevronDown size={16} className={`select-icon ${isViewsOpen ? 'open' : ''}`} />
                            </button>
                            {isViewsOpen && (
                                <div className="dropdown-menu views-menu">
                                    {viewModes.map(mode => {
                                        const Icon = mode.icon;
                                        const isActive = currentViewMode === mode.id;
                                        return (
                                            <button
                                                key={mode.id}
                                                className={`dropdown-item ${isActive ? 'active' : ''}`}
                                                onClick={() => handleViewModeChange(mode.id)}
                                            >
                                                <Icon size={18} />
                                                <span>{mode.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Section: Operations, Notifications & User */}
                    <div className="header-right">
                        {/* Container Operations */}
                        <div
                            className="dropdown-container"
                            onMouseEnter={() => setIsOperationsOpen(true)}
                            onMouseLeave={() => setIsOperationsOpen(false)}
                        >
                            <button
                                className="header-action-btn"
                                title="Operations"
                            >
                                <Plus size={20} />
                                <span className="btn-label">Actions</span>
                            </button>
                            {isOperationsOpen && (
                                <div className="dropdown-menu operations-menu">
                                    <div className="dropdown-header">Container Operations</div>

                                    <button className="dropdown-item">
                                        <Truck size={18} />
                                        <span>Schedule Movement</span>
                                    </button>
                                    <button className="dropdown-item">
                                        <Package size={18} />
                                        <span>Gate In</span>
                                    </button>
                                    <button className="dropdown-item">
                                        <Package size={18} />
                                        <span>Gate Out</span>
                                    </button>
                                    <button className="dropdown-item">
                                        <ClipboardList size={18} />
                                        <span>Inspection</span>
                                    </button>

                                    <div className="dropdown-divider" />
                                    <div className="dropdown-section-title">Booking</div>

                                    <button className="dropdown-item">
                                        <Calendar size={18} />
                                        <span>New Booking</span>
                                    </button>
                                    <button className="dropdown-item">
                                        <FileText size={18} />
                                        <span>View Bookings</span>
                                    </button>

                                    <div className="dropdown-divider" />
                                    <div className="dropdown-section-title">Data</div>

                                    <button className="dropdown-item">
                                        <Upload size={18} />
                                        <span>Import Data</span>
                                    </button>
                                    <button className="dropdown-item">
                                        <Download size={18} />
                                        <span>Export Data</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        <div
                            className="dropdown-container"
                            onMouseEnter={() => setIsNotificationsOpen(true)}
                            onMouseLeave={() => setIsNotificationsOpen(false)}
                        >
                            <button
                                className="icon-btn notification-btn"
                                title="Notifications"
                            >
                                <Bell size={24} />
                                {notifications.length > 0 && (
                                    <span className="notification-badge">{notifications.length}</span>
                                )}
                            </button>
                            {isNotificationsOpen && (
                                <div className="dropdown-menu notifications-menu">
                                    <div className="dropdown-header">
                                        Notifications
                                        <button className="mark-read-btn">Mark all as read</button>
                                    </div>

                                    {notifications.map(notif => (
                                        <div key={notif.id} className={`notification-item ${notif.type}`}>
                                            <div className="notification-icon">
                                                {notif.type === 'warning' && <AlertTriangle size={16} />}
                                                {notif.type === 'success' && <Package size={16} />}
                                                {notif.type === 'info' && <Bell size={16} />}
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-message">{notif.message}</div>
                                                <div className="notification-time">{notif.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div
                            className="dropdown-container"
                            onMouseEnter={() => setIsUserMenuOpen(true)}
                            onMouseLeave={() => setIsUserMenuOpen(false)}
                        >
                            <button
                                className="user-btn"
                                title="User Profile"
                            >
                                <div className="user-avatar">
                                    <User size={20} />
                                </div>
                            </button>
                            {isUserMenuOpen && (
                                <div className="dropdown-menu user-menu">
                                    <div className="dropdown-user-info">
                                        <div className="user-avatar large">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <div className="user-name">Admin User</div>
                                            <div className="user-email">admin@nalsoft.net</div>
                                        </div>
                                    </div>

                                    <div className="dropdown-divider" />

                                    <button className="dropdown-item">
                                        <User size={18} />
                                        <span>My Profile</span>
                                    </button>

                                    <button className="dropdown-item">
                                        <Settings size={18} />
                                        <span>Preferences</span>
                                    </button>

                                    <div className="dropdown-divider" />

                                    <button className="dropdown-item danger">
                                        <LogOut size={18} />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            className="mobile-menu-toggle"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>
        </>
    );
}
