import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Package, User, MapPin, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../../store/store';
import { useUIStore } from '../../../store/uiStore';

// Type definitions
type SearchMode = 'Container' | 'Customer' | 'Position';

interface HeaderSearchProps {
    isVisible: boolean;
    isUnified: boolean;

    // External signal to close search (e.g. from Nav or Profile)
    shouldClose?: boolean;
}

export const HeaderSearch: React.FC<HeaderSearchProps> = ({
    isVisible,
    isUnified,

    shouldClose
}) => {
    // Custom Scrollbar CSS
    const scrollbarStyles = `
        #search-results-dropdown::-webkit-scrollbar {
            width: 6px;
        }
        #search-results-dropdown::-webkit-scrollbar-track {
            background: transparent;
            margin: 10px;
        }
        #search-results-dropdown::-webkit-scrollbar-thumb {
            background: rgba(247, 207, 155, 0.3);
            border-radius: 10px;
        }
        #search-results-dropdown::-webkit-scrollbar-thumb:hover {
            background: rgba(247, 207, 155, 0.5);
        }
    `;

    // Store access
    const entities = useStore((state) => state.entities);
    const ids = useStore((state) => state.ids);
    const setSelectId = useStore((state) => state.setSelectId);
    const setSelectedCustomer = useStore((state) => state.setSelectedCustomer);
    const selectId = useStore((state) => state.selectId);
    const selectedCustomer = useStore((state) => state.selectedCustomer);
    const setSearchFocused = useUIStore((state) => state.setSearchFocused);

    // Local State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearchClosing, setIsSearchClosing] = useState(false);
    const [searchMode, setSearchMode] = useState<SearchMode>('Container');
    const [isSearchModeDropdownOpen, setIsSearchModeDropdownOpen] = useState(false);

    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Effect to handle external close signal
    useEffect(() => {
        if (shouldClose && isSearchOpen) {
            handleSearchClose();
        }
    }, [shouldClose]);

    // Handle search close with animation
    const handleSearchClose = () => {
        if (!isSearchOpen || isSearchClosing) return;

        setIsSearchClosing(true);
        setTimeout(() => {
            setIsSearchOpen(false);
            setIsSearchClosing(false);
            setSearchQuery('');
            setSearchResults([]);
        }, 200);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                // If in Customer mode and a customer is selected, don't close on outside clicks
                if (searchMode === 'Customer' && selectedCustomer) {
                    return;
                }
                handleSearchClose();
            }
        };

        if (isSearchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSearchOpen, searchMode, selectedCustomer]);

    // Auto-focus search input when opened
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Helper: Get unique customers
    const getUniqueCustomers = (query: string) => {
        const uniqueCustomers = new Set<string>();
        const lowerQuery = query.toLowerCase();
        Object.values(entities).forEach(entity => {
            if (entity.customerName && entity.customerName.toLowerCase().includes(lowerQuery)) {
                uniqueCustomers.add(entity.customerName);
            }
        });
        return Array.from(uniqueCustomers).sort();
    };

    // Handle search query changes
    const handleSearchChange = (query: string) => {
        setSearchQuery(query);

        if (query.length === 0) {
            setSearchResults([]);
            setSelectId(null);
            setSelectedCustomer(null);
            return;
        }

        const lowerQuery = query.toLowerCase();

        if (searchMode === 'Container') {
            if (query.length > 2) {
                const results = ids.filter(id => id.toLowerCase().includes(lowerQuery));
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        }
        else if (searchMode === 'Customer') {
            if (query.length > 1) {
                const results = getUniqueCustomers(query);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        }
        else if (searchMode === 'Position') {
            if (query.length > 2) {
                const results = ids.filter(id => {
                    const entity = entities[id];
                    if (!entity) return false;
                    const rowLabel = entity.row as unknown as string; // Casting based on known structure
                    const strictFormat = `${entity.terminal}-${entity.block}-${entity.lot}-${rowLabel}-${entity.level}`;
                    const naturalFormat = `Block ${entity.block} Row ${rowLabel} Lot ${entity.lot}`;
                    return strictFormat.toLowerCase().includes(lowerQuery) || naturalFormat.toLowerCase().includes(lowerQuery);
                });
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        }
    };

    // Handle search result selection
    const handleResultClick = (result: string) => {
        setSelectId(null);
        setSelectedCustomer(null);

        if (searchMode === 'Customer') {
            setSelectedCustomer(result);
            setSearchQuery(result);
            setSearchResults([]);

            // [NEW] Reset camera to main view for better visibility of filtered scene
            window.dispatchEvent(new CustomEvent('resetCameraToInitial'));

            handleSearchClose();
        } else {
            setSelectId(result);
            handleSearchClose();
        }
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            opacity: isUnified ? 0 : 1, // Hide when unified
            transform: isUnified ? 'scale(0.8) translateY(10px)' : 'scale(1) translateY(0)',
            pointerEvents: isUnified ? 'none' : 'auto',
            transition: 'all 0.5s cubic-bezier(0.25, 1, 0.3, 1)',
        }} ref={searchContainerRef}>
            <style>{scrollbarStyles}</style>
            {/* Search Icon Button */}
            {!isSearchOpen && !isSearchClosing && (
                <div
                    onClick={() => {
                        setIsSearchOpen(true);
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
                    width: '320px',
                    height: '40px',
                    boxSizing: 'border-box',
                    animation: isSearchClosing
                        ? 'collapseSearch 0.25s cubic-bezier(0.4, 0, 1, 1) forwards'
                        : 'expandSearch 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 8px 24px rgba(247, 207, 155, 0.2)',
                }}>
                    {/* Search Icon (Prefix) */}
                    <Search size={18} color="var(--secondary-color)" strokeWidth={2} style={{ pointerEvents: 'none' }} />

                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={
                            searchMode === 'Container' ? "Container Number..." :
                                searchMode === 'Customer' ? "Customer Name..." :
                                    "Terminal-Block-Lot-Row-Level..."
                        }
                        value={searchQuery}
                        onChange={(e) => {
                            let val = e.target.value;
                            if (searchMode === 'Position') {
                                val = val.toUpperCase();
                                // Basic formatting logic simplified for brevity/maintenance
                                const raw = val.replace(/-/g, '');
                                let formatted = '';
                                if (raw.length > 0) {
                                    formatted = raw.substring(0, 3);
                                    if (raw.length >= 3) formatted += '-';
                                    if (raw.length > 3) {
                                        formatted += raw.substring(3, 4);
                                        if (raw.length >= 4) formatted += '-';
                                    }
                                    if (raw.length > 4) {
                                        const remaining = raw.substring(4);
                                        const rowMatch = remaining.match(/([0-9]+)([A-Z].*)/);
                                        if (rowMatch) {
                                            formatted += rowMatch[1] + '-' + rowMatch[2].substring(0, 1);
                                            if (rowMatch[2].length >= 1) formatted += '-';
                                            if (rowMatch[2].length > 1) formatted += rowMatch[2].substring(1, 2);
                                        } else {
                                            formatted += remaining;
                                        }
                                    }
                                }
                                // Segment-based Backspace handling
                                if (val.length < searchQuery.length) {
                                    const charDeleted = searchQuery.charAt(val.length);
                                    if (charDeleted === '-') {
                                        const lastHyphen = val.lastIndexOf('-');
                                        val = lastHyphen >= 0 ? val.substring(0, lastHyphen + 1) : '';
                                    }
                                    handleSearchChange(val);
                                    return;
                                }
                                val = formatted;
                            }
                            handleSearchChange(val);
                        }}
                        onFocus={() => {
                            setIsSearchModeDropdownOpen(false);
                            setSearchFocused(true);
                        }}
                        onBlur={() => setSearchFocused(false)}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 400,
                            padding: '4px 8px',
                            minWidth: '0'
                        }}
                    />

                    {/* Right Actions Group */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Clear Button */}
                        {searchQuery && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setSelectId(null);
                                    setSelectedCustomer(null);
                                    searchInputRef.current?.focus();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                }}
                            >
                                <X size={14} />
                            </div>
                        )}

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.15)' }} />

                        {/* Mode Selector */}
                        <div style={{ position: 'relative' }}>
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSearchModeDropdownOpen(!isSearchModeDropdownOpen);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    background: isSearchModeDropdownOpen ? 'rgba(247, 207, 155, 0.2)' : 'transparent',
                                    color: searchMode === 'Container' ? 'var(--secondary-color)' : 'white'
                                }}
                                title={`Search Mode: ${searchMode}`}
                            >
                                {searchMode === 'Container' && <Package size={16} />}
                                {searchMode === 'Customer' && <User size={16} />}
                                {searchMode === 'Position' && <MapPin size={16} />}
                            </div>

                            {/* Mode Dropdown */}
                            {isSearchModeDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 21px)',
                                    right: -8,
                                    minWidth: '140px',
                                    background: 'rgba(75, 104, 108, 0.98)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(247, 207, 155, 0.3)',
                                    borderRadius: '12px',
                                    zIndex: 1100,
                                }}>
                                    {[
                                        { id: 'Container', icon: <Package size={14} />, label: 'Container' },
                                        { id: 'Customer', icon: <User size={14} />, label: 'Customer' },
                                        { id: 'Position', icon: <MapPin size={14} />, label: 'Position' },
                                    ].map((mode) => (
                                        <div
                                            key={mode.id}
                                            onClick={() => {
                                                setSearchMode(mode.id as SearchMode);
                                                setIsSearchModeDropdownOpen(false);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                                searchInputRef.current?.focus();
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                color: searchMode === mode.id ? 'var(--secondary-color)' : 'white',
                                                background: searchMode === mode.id ? 'rgba(247, 207, 155, 0.1)' : 'transparent',
                                            }}
                                        >
                                            {mode.icon}
                                            {mode.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                        {(searchResults.length > 0 || (searchQuery.length > (searchMode === 'Customer' ? 1 : 2))) && (!selectedCustomer && !selectId) && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 15px)',
                                    left: 0,
                                    right: 0,
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    background: 'rgba(75, 104, 108, 0.98)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(247, 207, 155, 0.3)',
                                    borderRadius: '16px',
                                    zIndex: 1000,
                                    transformOrigin: 'top',
                                }} id="search-results-dropdown"
                            >
                                {searchResults.length === 0 ? (
                                    <div style={{
                                        padding: '24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        gap: '8px'
                                    }}>
                                        <AlertCircle size={24} />
                                        <span style={{ fontSize: '13px' }}>No matches found</span>
                                    </div>
                                ) : (
                                    searchMode === 'Customer' ? (
                                        searchResults.map((customerName) => (
                                            <div
                                                key={customerName}
                                                onClick={() => handleResultClick(customerName)}
                                                style={{
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(247, 207, 155, 0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', minWidth: 0 }}>
                                                    <User size={16} color="var(--secondary-color)" style={{ flexShrink: 0 }} />
                                                    <span style={{
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        flex: 1,
                                                        maxWidth: '220px',
                                                        minWidth: 0
                                                    }} title={customerName}>{customerName}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        searchResults.map((id) => {
                                            const entity = entities[id];
                                            const rowLabel = entity ? (entity.row as unknown as string) : '?';
                                            return (
                                                <div
                                                    key={id}
                                                    onClick={() => handleResultClick(id)}
                                                    style={{
                                                        padding: '12px 16px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(247, 207, 155, 0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <Package size={16} color="var(--secondary-color)" />
                                                        <div style={{ flex: 1, color: 'white' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, gap: '12px' }}>
                                                                <span style={{ flexShrink: 0 }}>{id}</span>
                                                                {entity?.customerName && (
                                                                    <span style={{
                                                                        fontSize: '11px',
                                                                        color: 'var(--secondary-color)',
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        textAlign: 'right',
                                                                        maxWidth: '140px',
                                                                        flex: 1,
                                                                        minWidth: 0
                                                                    }} title={entity.customerName}>{entity.customerName}</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                {entity?.terminal}-{entity?.block}-{entity?.lot}-{rowLabel}-{entity?.level}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
