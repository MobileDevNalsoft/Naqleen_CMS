import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X, AlertTriangle, Info, Package } from 'lucide-react';
import { create } from 'zustand';

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Detail item for rich toasts
export interface ToastDetailItem {
    label: string;
    sublabel?: string;
    badge?: string;
}

export interface ToastData {
    id: string;
    type: ToastType;
    message: string;
    title?: string; // Optional header title
    details?: ToastDetailItem[]; // Optional structured details
    duration?: number;
}

// Toast Store
interface ToastStore {
    toasts: ToastData[];
    addToast: (toast: Omit<ToastData, 'id'>) => void;
    removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }]
        }));
    },
    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    }
}));

// Helper function to show simple toasts
export const showToast = (type: ToastType, message: string, duration: number = 5000) => {
    useToastStore.getState().addToast({ type, message, duration });
};

// Helper function to show rich toasts with title and details
export const showRichToast = (
    type: ToastType,
    title: string,
    message: string,
    details?: ToastDetailItem[],
    duration: number = 8000
) => {
    useToastStore.getState().addToast({ type, title, message, details, duration });
};

// Individual Toast Item Component
function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: () => void }) {
    const [isExiting, setIsExiting] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        // Auto-dismiss
        const duration = toast.duration || 5000;
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, duration);

        return () => clearTimeout(timer);
    }, [toast.duration]);

    useEffect(() => {
        if (isExiting) {
            const timer = setTimeout(onRemove, 300);
            return () => clearTimeout(timer);
        }
    }, [isExiting, onRemove]);

    const handleClose = () => {
        setIsExiting(true);
    };

    const getConfig = () => {
        switch (toast.type) {
            case 'success':
                return {
                    bg: '#f0fdf4',
                    border: '#86efac',
                    color: '#166534',
                    icon: <CheckCircle size={18} />
                };
            case 'warning':
                return {
                    bg: '#fffbeb',
                    border: '#fcd34d',
                    color: '#92400e',
                    icon: <AlertTriangle size={18} />
                };
            case 'error':
                return {
                    bg: '#fef2f2',
                    border: '#fecaca',
                    color: '#991b1b',
                    icon: <AlertCircle size={18} />
                };
            case 'info':
            default:
                return {
                    bg: '#eff6ff',
                    border: '#93c5fd',
                    color: '#1e40af',
                    icon: <Info size={18} />
                };
        }
    };

    const config = getConfig();
    const isRichToast = toast.title || toast.details;

    return (
        <div
            style={{
                padding: isRichToast ? '16px' : '14px 18px',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: isRichToast ? 'column' : 'row',
                gap: isRichToast ? '12px' : '12px',
                background: config.bg,
                border: `1px solid ${config.border}`,
                color: config.color,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
                minWidth: isRichToast ? '360px' : '300px',
                maxWidth: isRichToast ? '480px' : '420px',
                transform: isVisible && !isExiting ? 'translateX(0)' : 'translateX(120%)',
                opacity: isVisible && !isExiting ? 1 : 0,
                transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* Simple Toast Layout */}
            {!isRichToast && (
                <>
                    <div style={{ flexShrink: 0 }}>
                        {config.icon}
                    </div>
                    <span style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        flex: 1,
                        lineHeight: 1.4,
                        wordBreak: 'break-word'
                    }}>
                        {toast.message}
                    </span>
                </>
            )}

            {/* Rich Toast Layout */}
            {isRichToast && (
                <>
                    {/* Header with icon, title and close */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flexShrink: 0 }}>
                            {config.icon}
                        </div>
                        <span style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            flex: 1,
                            lineHeight: 1.3
                        }}>
                            {toast.title}
                        </span>
                        <button
                            onClick={handleClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                borderRadius: '6px',
                                color: config.color,
                                opacity: 0.7
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Message */}
                    {toast.message && (
                        <div style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            opacity: 0.8,
                            lineHeight: 1.4,
                            marginTop: '-4px'
                        }}>
                            {toast.message}
                        </div>
                    )}

                    {/* Detail Items */}
                    {toast.details && toast.details.length > 0 && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.5)',
                            borderRadius: '10px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {toast.details.map((detail, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    <Package size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {detail.label}
                                        </div>
                                        {detail.sublabel && (
                                            <div style={{
                                                fontSize: '10px',
                                                opacity: 0.7,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {detail.sublabel}
                                            </div>
                                        )}
                                    </div>
                                    {detail.badge && (
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            padding: '3px 8px',
                                            background: 'rgba(0, 0, 0, 0.08)',
                                            borderRadius: '6px',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {detail.badge}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Close button for simple toast */}
            {!isRichToast && (
                <button
                    onClick={handleClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        borderRadius: '6px',
                        color: config.color,
                        opacity: 0.7,
                        transition: 'opacity 0.2s, background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

// Toast Container Component - Renders all toasts
export default function ToastContainer() {
    const toasts = useToastStore((state) => state.toasts);
    const removeToast = useToastStore((state) => state.removeToast);

    if (toasts.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: '100px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none'
            }}
        >
            {toasts.map((toast) => (
                <div key={toast.id} style={{ pointerEvents: 'auto' }}>
                    <ToastItem
                        toast={toast}
                        onRemove={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
}
