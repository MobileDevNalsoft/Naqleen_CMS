import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIcdsQuery } from '../../scene/infrastructure/apis/layoutApi';

interface HeaderIcdSelectorProps {
    selectedIcdId: string;
    onIcdChange: (id: string) => void;
    isUnified: boolean;
    isSettings: boolean;
    isDashboard: boolean;
}

export const HeaderIcdSelector: React.FC<HeaderIcdSelectorProps> = ({
    selectedIcdId,
    onIcdChange,
    isUnified,
    isSettings,
    isDashboard
}) => {
    const { data: icds, isLoading } = useIcdsQuery();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentIcd = icds?.find(t => t.id === selectedIcdId);

    // Auto-select first ICD if none selected (safety)
    useEffect(() => {
        if (icds && icds.length > 0 && !selectedIcdId) {
            onIcdChange(icds[0].id);
        }
    }, [icds, selectedIcdId, onIcdChange]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleIcdSelect = (icdId: string) => {
        onIcdChange(icdId);
        setIsDropdownOpen(false);
    };

    return (
        <div style={{ position: 'relative', marginLeft: '16px' }}>
            {/* Original ICD Selector - Animate Out */}
            <div
                ref={dropdownRef}
                style={{
                    opacity: isUnified ? 0 : 1,
                    transform: isUnified ? 'translateY(20px)' : 'translateY(0)',
                    transition: 'all 0.6s cubic-bezier(0.25, 1, 0.3, 1)',
                    pointerEvents: isUnified ? 'none' : 'auto',
                }}
            >
                <div
                    onClick={() => {
                        setIsDropdownOpen(!isDropdownOpen);
                        // Access main header's search close logic via event or props if needed?
                        // For decoupled isolation, we can dispatch a custom event or ignore.
                        // Ideally props, but for now we keep it simple.
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
                <AnimatePresence>
                    {isDropdownOpen && icds && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                            animate={{ opacity: 1, y: 0, scaleY: 1 }}
                            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                position: 'absolute',
                                top: 'calc(100% + 16px)',
                                right: 0,
                                minWidth: '175px',
                                background: 'rgba(75, 104, 108, 0.98)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(247, 207, 155, 0.3)',
                                borderRadius: '16px',
                                boxShadow: '0 8px 32px rgba(247, 207, 155, 0.15)',
                                overflow: 'hidden',
                                zIndex: 1002,
                                transformOrigin: 'top',
                            }}
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Settings Title - Animate In */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingLeft: '8px',
                opacity: isSettings ? 1 : 0,
                transform: isSettings ? 'translateY(0)' : 'translateY(-20px)',
                transition: 'all 0.6s cubic-bezier(0.25, 1, 0.3, 1)',
                pointerEvents: isSettings ? 'auto' : 'none',
            }}>
                <Settings size={18} color="var(--secondary-color)" />
                <span style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'white',
                    letterSpacing: '0.01em'
                }}>
                    Settings
                </span>
            </div>

            {/* Dashboard Title - Animate In */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingLeft: '8px',
                opacity: isDashboard ? 1 : 0,
                transform: isDashboard ? 'translateY(0)' : 'translateY(-20px)',
                transition: 'all 0.6s cubic-bezier(0.25, 1, 0.3, 1)',
                pointerEvents: isDashboard ? 'auto' : 'none',
            }}>
                <div style={{ // Dashboard Icon Circle
                    width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {/* Simple Icon placeholder */}
                    <div style={{ width: '12px', height: '12px', border: '1.5px solid var(--secondary-color)', borderRadius: '2px' }} />
                </div>
                <span style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'white',
                    letterSpacing: '0.01em'
                }}>
                    Dashboards
                </span>
            </div>
        </div>
    );
};
