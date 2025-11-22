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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isViewsOpen, setIsViewsOpen] = useState(false);
    const [isOperationsOpen, setIsOperationsOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [selectedTerminal, setSelectedTerminal] = useState('');

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Searching for:', searchQuery);
        // TODO: Implement search functionality
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

                        <div className="terminal-selector">
                            <select
                                value={selectedTerminal}
                                onChange={(e) => setSelectedTerminal(e.target.value)}
                                className="terminal-select"
                                disabled={terminalsLoading || !terminals}
                            >
                                {terminalsLoading ? (
                                    <option>Loading...</option>
                                ) : terminals && terminals.length > 0 ? (
                                    terminals.map(terminal => (
                                        <option key={terminal.id} value={terminal.id}>
                                            {terminal.name}
                                        </option>
                                    ))
                                ) : (
                                    <option>No terminals available</option>
                                )}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>

                    {/* Center Section: Search */}
                    <div className="header-center">
                        <form onSubmit={handleSearch} className="search-container">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search containers, blocks, locations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="search-clear"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Views Dropdown Section */}
                    <div className="header-views">
                        <div className="dropdown-container">
                            <button
                                className="header-action-btn"
                                onClick={() => setIsViewsOpen(!isViewsOpen)}
                                title="Views"
                            >
                                <Grid3x3 size={20} />
                                <span className="btn-label">Views</span>
                                <ChevronDown size={16} />
                            </button>
                            {isViewsOpen && (
                                <>
                                    <div className="dropdown-backdrop" onClick={() => setIsViewsOpen(false)} />
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
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Section: Operations, Notifications & User */}
                    <div className="header-right">
                        {/* Container Operations */}
                        <div className="dropdown-container">
                            <button
                                className="header-action-btn"
                                onClick={() => setIsOperationsOpen(!isOperationsOpen)}
                                title="Operations"
                            >
                                <Plus size={20} />
                                <span className="btn-label">Actions</span>
                            </button>
                            {isOperationsOpen && (
                                <>
                                    <div className="dropdown-backdrop" onClick={() => setIsOperationsOpen(false)} />
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
                                </>
                            )}
                        </div>

                        {/* Notifications */}
                        <div className="dropdown-container">
                            <button
                                className="icon-btn notification-btn"
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                title="Notifications"
                            >
                                <Bell size={24} />
                                {notifications.length > 0 && (
                                    <span className="notification-badge">{notifications.length}</span>
                                )}
                            </button>
                            {isNotificationsOpen && (
                                <>
                                    <div className="dropdown-backdrop" onClick={() => setIsNotificationsOpen(false)} />
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
                                </>
                            )}
                        </div>

                        <div className="dropdown-container">
                            <button
                                className="user-btn"
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                title="User Profile"
                            >
                                <div className="user-avatar">
                                    <User size={20} />
                                </div>
                            </button>
                            {isUserMenuOpen && (
                                <>
                                    <div className="dropdown-backdrop" onClick={() => setIsUserMenuOpen(false)} />
                                    <div className="dropdown-menu user-menu">
                                        <div className="dropdown-user-info">
                                            <div className="user-avatar large">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <div className="user-name">Admin User</div>
                                                <div className="user-email">admin@naqleen.com</div>
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
                                </>
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
