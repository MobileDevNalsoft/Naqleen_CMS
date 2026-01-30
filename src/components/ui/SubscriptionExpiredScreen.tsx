import { motion } from 'framer-motion';
import { BiLockAlt, BiSupport, BiLogOut } from 'react-icons/bi';
import { useAuthStore } from '../../store/authStore';

const SubscriptionExpiredScreen = () => {
    const logout = useAuthStore(state => state.logout);

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                background: '#0a0c10', // Deep dark background
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                zIndex: 9999
            }}
        >
            {/* Background Ambience */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60vw',
                    height: '60vw',
                    background: 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, rgba(0,0,0,0) 70%)',
                    pointerEvents: 'none'
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    background: 'rgba(25, 25, 30, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    padding: '48px',
                    maxWidth: '480px',
                    width: '90%',
                    textAlign: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px'
                }}
            >
                {/* Icon */}
                <div
                    style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(153, 27, 27, 0.1))',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        boxShadow: '0 0 30px rgba(220, 38, 38, 0.2)'
                    }}
                >
                    <BiLockAlt size={40} color="#ef4444" />
                </div>

                {/* Text Content */}
                <div>
                    <h1 style={{
                        color: '#fff',
                        fontSize: '28px',
                        fontWeight: '600',
                        margin: '0 0 12px 0',
                        letterSpacing: '-0.5px'
                    }}>
                        Subscription Expired
                    </h1>
                    <p style={{
                        color: '#a1a1aa',
                        fontSize: '16px',
                        lineHeight: '1.6',
                        margin: 0
                    }}>
                        Your access to the OTM Platform has been temporarily suspended due to subscription expiry. Please contact your administrator to renew your access.
                    </p>
                </div>

                {/* Divider */}
                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.08)' }} />

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button
                        onClick={() => window.location.href = "mailto:support@naqleen.sa"}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <BiSupport size={18} />
                        Contact Support
                    </button>

                    <button
                        onClick={logout}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                        <BiLogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SubscriptionExpiredScreen;
