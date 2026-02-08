import React from 'react';
import {
    AlertTriangle,
    SearchX,
    HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PremiumStateViewProps {
    type?: 'default' | 'empty' | 'error' | 'loading';
    graphic?: React.ReactNode; // The primary visual (Icon, Loader, Image). Overrides default icon.
    icon?: React.ComponentType<any>; // Overrides the icon SVG but keeps the color/bg of the type
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary' | 'outline';
    };
    height?: string | number;
}

export default function PremiumStateView({
    type = 'default',
    graphic,
    icon,
    title,
    description,
    action,
    height = '100%'
}: PremiumStateViewProps) {

    // Resolve Default Icon/Graphic based on Type
    // If 'graphic' is provided, it takes precedence.
    // Otherwise, use a default icon.
    let contentGraphic = graphic;

    if (!contentGraphic) {
        let Icon = icon || HelpCircle; // Default to prop or HelpCircle
        let iconColor = '#94A3B8'; // Default Slate
        let bgColor = '#F1F5F9';   // Default Slate Light

        switch (type) {
            case 'loading':
                // Minimal default loader if no specific graphic provided
                contentGraphic = (
                    <div className="animate-spin" style={{
                        width: '32px', height: '32px',
                        border: '3px solid rgba(75, 104, 108, 0.1)',
                        borderTopColor: 'var(--primary-color)',
                        borderRadius: '50%'
                    }} />
                );
                break;
            case 'empty':
                if (!icon) Icon = SearchX;
                iconColor = '#94A3B8'; // Slate-400
                bgColor = '#F1F5F9';   // Slate-100
                break;
            case 'error':
                if (!icon) Icon = AlertTriangle;
                iconColor = '#EF4444'; // Red-500
                bgColor = '#FEE2E2';   // Red-100
                break;
            default:
                // Default 'info' state
                if (!icon) Icon = HelpCircle;
                break;
        }

        // If we established an Icon (and not a custom loader graphic), wrap it
        if (!contentGraphic) {
            contentGraphic = (
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 0 8px ${bgColor}40`
                }}>
                    <Icon size={32} color={iconColor} strokeWidth={1.5} />
                </div>
            );
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
                height: height,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box',
                textAlign: 'center'
            }}
        >
            {/* Graphic / Icon */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                {contentGraphic}
            </div>

            {/* Title */}
            {title && (
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: type === 'error' ? '#EF4444' : 'var(--primary-color)',
                    marginBottom: description ? '6px' : '0'
                }}>
                    {title}
                </h3>
            )}

            {/* Description */}
            {description && (
                <p style={{
                    fontSize: '13px',
                    color: 'var(--text-color)',
                    opacity: 0.6,
                    maxWidth: '280px',
                    lineHeight: '1.5',
                    margin: 0
                }}>
                    {description}
                </p>
            )}

            {/* Action Button */}
            {action && (
                <button
                    onClick={action.onClick}
                    style={{
                        marginTop: '20px',
                        padding: '8px 20px',
                        background: action.variant === 'secondary' || action.variant === 'outline'
                            ? 'transparent'
                            : 'var(--secondary-gradient)',
                        border: action.variant === 'outline'
                            ? '1px solid var(--border-color)'
                            : 'none',
                        borderRadius: '8px',
                        color: action.variant === 'secondary' || action.variant === 'outline'
                            ? 'var(--text-color)'
                            : 'var(--primary-color)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        boxShadow: action.variant !== 'outline' && action.variant !== 'secondary'
                            ? '0 4px 12px rgba(247, 207, 155, 0.2)'
                            : 'none'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        if (action.variant !== 'outline' && action.variant !== 'secondary') {
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(247, 207, 155, 0.3)';
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        if (action.variant !== 'outline' && action.variant !== 'secondary') {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(247, 207, 155, 0.2)';
                        }
                    }}
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
}
