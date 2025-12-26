import React, { useEffect, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface PanelLayoutProps {
    title: string;
    category?: string;
    titleBadge?: React.ReactNode;
    subtitle?: React.ReactNode; // New prop for subtitle/badge below title
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    footerActions?: React.ReactNode;
    headerActions?: React.ReactNode;
    width?: string;
    allowExpansion?: boolean;
    fitContent?: boolean; // If true, panel height fits content instead of full height
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
    width = '420px',
    allowExpansion = false,
    fitContent = false
}: PanelLayoutProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 400);
            const expandTimer = setTimeout(() => setIsExpanded(false), 400); // Reset expansion on close
            return () => {
                clearTimeout(timer);
                clearTimeout(expandTimer);
            };
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: isExpanded ? '90px' : '90px',
                right: '24px',
                width: isExpanded ? '900px' : width,
                maxWidth: 'calc(100vw - 48px)', // Prevent overflow on small screens
                height: fitContent ? 'auto' : (isExpanded ? 'calc(100vh - 114px)' : 'calc(100vh - 114px)'),
                maxHeight: fitContent ? 'calc(100vh - 114px)' : undefined,
                backgroundColor: 'rgba(253, 246, 235, 0.95)',
                backdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: '24px',
                border: '1px solid rgba(75, 104, 108, 0.1)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0,0,0,0.05)',
                zIndex: 1000,
                color: '#1e293b',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isOpen ? 'translateX(0)' : 'translateX(120%)',
                opacity: isOpen ? 1 : 0,
                overflow: 'hidden',
                pointerEvents: isOpen ? 'auto' : 'none' // Prevent interaction when closing/closed
            }}
        >
            {/* Header Section */}
            <div style={{
                padding: '16px 16px 16px 16px',
                background: '#4B686C',
                position: 'relative',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
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
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e7e7e7ff', boxShadow: '0 0 6px #e7e7e7ff' }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e7e7e7ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {category}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{
                                fontSize: '24px',
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

                        {/* Expand/Collapse Button - Only shown if allowed (e.g. for ReserveContainersPanel) */}
                        {allowExpansion && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
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
                                    transition: 'all 0.2s ease',
                                    padding: '0',
                                    margin: '0',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                                }}
                                title={isExpanded ? "Restore" : "Maximize"}
                            >
                                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                        )}

                        <button
                            onClick={onClose}
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
                                transition: 'all 0.2s ease',
                                padding: '0',
                                margin: '0',
                                color: 'rgba(255, 255, 255, 0.8)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                overflowY: 'auto', // Changed to auto to enable scrolling
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
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
        </div>
    );
}
