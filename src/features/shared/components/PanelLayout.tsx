import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { theme } from '../../../themes/theme';

interface PanelLayoutProps {
    title: React.ReactNode;
    category?: string;
    titleBadge?: React.ReactNode;
    subtitle?: React.ReactNode; // New prop for subtitle/badge below title
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    footerActions?: React.ReactNode;
    headerActions?: React.ReactNode;
    tabsContent?: React.ReactNode; // Fixed content between header and scrollable area (e.g., tabs)
    width?: string;
    top?: string;
    height?: string;
    zIndex?: number;
    allowExpansion?: boolean;
    fitContent?: boolean; // If true, panel height fits content instead of full height
    headerColor?: string; // Optional custom background color/gradient for the header
}

export default function PanelLayout({
    title,
    category = 'ACTION',
    titleBadge,
    subtitle,
    isOpen,
    onClose,
    children,
    footerActions,
    headerActions,
    tabsContent,
    width = '420px',
    top = '90px',
    height,
    zIndex = 1000,
    allowExpansion = false,
    fitContent = false,
    headerColor = theme.colors.primary // Default to theme primary
}: PanelLayoutProps) {
    // --- Animation Logic (Framer Motion) ---
    // We no longer need manual isVisible/setTimeout logic because AnimatePresence handles it.
    const [isExpanded, setIsExpanded] = useState(false);

    // Reset expansion if not allowed
    useEffect(() => {
        if (!allowExpansion) {
            setIsExpanded(false);
        }
    }, [allowExpansion]);

    const defaultHeight = isExpanded ? 'calc(100vh - 114px)' : 'calc(100vh - 114px)';
    const calculatedHeight = height || defaultHeight;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    layout
                    initial={{ x: '120%', opacity: 0.5, width: width }}
                    animate={{
                        x: 0,
                        opacity: 1,
                        width: isExpanded ? '900px' : width
                    }}
                    exit={{ x: '120%', opacity: 0 }}
                    transition={{
                        type: 'tween',
                        duration: 0.8,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                    style={{
                        position: 'fixed',
                        top: top,
                        right: '24px',
                        maxWidth: 'calc(100vw - 48px)', // Prevent overflow on small screens
                        height: fitContent ? 'auto' : calculatedHeight,
                        maxHeight: fitContent ? calculatedHeight : undefined,
                        backgroundColor: theme.colors.glass.bg,
                        backdropFilter: 'blur(24px) saturate(180%)',
                        borderRadius: '24px',
                        border: `1px solid ${theme.colors.glass.border}`,
                        boxShadow: theme.shadows.floating,
                        zIndex: zIndex,
                        color: theme.colors.text.primary,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        pointerEvents: 'auto'
                    }}
                >
                    {/* Header Section */}
                    <div style={{
                        padding: '16px 16px 16px 16px',
                        background: headerColor,
                        position: 'relative',
                        boxShadow: theme.shadows.header,
                        zIndex: 10
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0px' }}>
                            <div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    background: 'rgba(243, 239, 239, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '20px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.colors.text.light, boxShadow: `0 0 6px ${theme.colors.text.light}` }} />
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: theme.colors.text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {category}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h2 style={{
                                        fontSize: '18px',
                                        fontWeight: 800,
                                        margin: 0,
                                        background: 'white',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        textTransform: 'uppercase',
                                        letterSpacing: '-0.5px',
                                        lineHeight: 1.1
                                    }}>
                                        {title}
                                    </h2>
                                    {titleBadge}
                                </div>
                                {subtitle && (
                                    <div style={{ marginTop: '8px' }}>
                                        {subtitle}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {headerActions}

                                {/* Expand/Collapse Button */}
                                {allowExpansion && (
                                    <motion.button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                                        whileTap={{ scale: 0.95 }}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            borderRadius: '50%',
                                            width: '36px',
                                            height: '36px',
                                            minWidth: '36px',
                                            minHeight: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            padding: '0',
                                            margin: '0',
                                            color: 'rgba(255, 255, 255, 0.8)'
                                        }}
                                        title={isExpanded ? "Restore" : "Maximize"}
                                    >
                                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                    </motion.button>
                                )}

                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        minWidth: '36px',
                                        minHeight: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        padding: '0',
                                        margin: '0',
                                        color: 'rgba(255, 255, 255, 0.8)'
                                    }}
                                >
                                    <X size={18} />
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Content (fixed, non-scrolling) */}
                    {tabsContent && (
                        <div style={{
                            padding: '0 24px',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                        }}>
                            {tabsContent}
                        </div>
                    )}

                    {/* Content */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto', // Changed to auto to enable scrolling
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }} className="custom-scrollbar">
                        {children}
                    </div>

                    {/* Footer */}
                    {footerActions && (
                        <div style={{
                            padding: '24px',
                            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                            background: 'rgba(0,0,0,0.02)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            {footerActions}
                        </div>
                    )}

                    <style>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 3px;
                            height: 3px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: rgba(0, 0, 0, 0.05);
                            border-radius: 4px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 4px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
