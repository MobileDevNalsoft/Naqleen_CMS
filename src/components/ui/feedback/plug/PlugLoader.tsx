
/**
 * Premium Plug Loader Component
 * 
 * Shows a continuous animation of a plug connecting and disconnecting.
 * Used for loading states in reefer related panels.
 */
interface PlugLoaderProps {
    /** Custom message to display (default: "SYNCING MONITOR") */
    message?: string;
    /** Sub-message to display (default: "Retrieving controller data...") */
    subMessage?: string;
    /** Height of the loader container (default: 100%) */
    height?: string;
}

export default function PlugLoader({
    message = 'SYNCING MONITOR',
    subMessage = 'Retrieving controller data...',
    height = '100%'
}: PlugLoaderProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: height,
            minHeight: '200px', // Reduced min-height slightly for flexibility
            gap: '24px'
        }}>
            <style>
                {`
                    @keyframes plugCycle {
                        0% { transform: translateX(8px); } /* Unplugged */
                        20% { transform: translateX(0px); }  /* Plugged */
                        60% { transform: translateX(0px); }  /* Hold */
                        80% { transform: translateX(8px); } /* Unplug */
                        100% { transform: translateX(8px); } /* Pause */
                    }

                    @keyframes sparkPulse {
                        0%, 20% { opacity: 0; transform: scale(0.5); }
                        25% { opacity: 1; transform: scale(1.2); }
                        30% { opacity: 0.8; transform: scale(1); }
                        55% { opacity: 0.8; transform: scale(1); }
                        60% { opacity: 0; transform: scale(0.5); }
                        100% { opacity: 0; }
                    }

                    @keyframes glowColor {
                        0%, 15% { fill: #dc2626; filter: drop-shadow(0 0 2px rgba(220, 38, 38, 0.3)); }
                        20%, 60% { fill: #059669; filter: drop-shadow(0 0 8px rgba(5, 150, 105, 0.6)); }
                        65%, 100% { fill: #dc2626; filter: drop-shadow(0 0 2px rgba(220, 38, 38, 0.3)); }
                    }
                `}
            </style>

            <svg
                width="80"
                height="40"
                viewBox="0 0 60 20" // Wider viewbox for movement
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id="loaderDepth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
                    </linearGradient>
                </defs>

                {/* ===== SOCKET (Stationary) ===== */}
                <g>
                    {/* Body */}
                    <path
                        d="M4 4 C4 2.5, 5 2, 7 2 L14 2 L14 18 L7 18 C5 18, 4 17.5, 4 16 L4 4 Z"
                        style={{
                            animation: 'glowColor 2s ease-in-out infinite'
                        }}
                    />
                    {/* Holes */}
                    <rect x="9" y="5" width="5" height="3" rx="0.5" fill="rgba(0,0,0,0.4)" />
                    <rect x="9" y="12" width="5" height="3" rx="0.5" fill="rgba(0,0,0,0.4)" />

                    {/* Wire */}
                    <rect x="0" y="8.5" width="4" height="3" rx="1"
                        style={{
                            animation: 'glowColor 2s ease-in-out infinite'
                        }}
                    />
                </g>

                {/* ===== PLUG (Animated) ===== */}
                <g style={{ animation: 'plugCycle 2s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
                    {/* Prongs */}
                    <rect x="14" y="5" width="6" height="3" rx="0.5"
                        style={{ animation: 'glowColor 2s ease-in-out infinite' }}
                    />
                    <rect x="14" y="12" width="6" height="3" rx="0.5"
                        style={{ animation: 'glowColor 2s ease-in-out infinite' }}
                    />

                    {/* Face */}
                    <rect x="18" y="2" width="4" height="16" rx="1"
                        style={{ animation: 'glowColor 2s ease-in-out infinite' }}
                    />

                    {/* Plug Body */}
                    <path
                        d="M22 2 L37 2 C39 2, 40 2.5, 40 4 L40 16 C40 17.5, 39 18, 37 18 L22 18 L22 2 Z"
                        style={{ animation: 'glowColor 2s ease-in-out infinite' }}
                    />

                    {/* Depth */}
                    <path
                        d="M22 2 L37 2 C39 2, 40 2.5, 40 4 L40 16 C40 17.5, 39 18, 37 18 L22 18 L22 2 Z"
                        fill="url(#loaderDepth)"
                    />

                    {/* Grip Lines */}
                    <line x1="28" y1="5" x2="28" y2="15" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />
                    <line x1="32" y1="5" x2="32" y2="15" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />
                    <line x1="36" y1="5" x2="36" y2="15" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />

                    {/* Cord - Extended for animation */}
                    <path
                        d="M 40 8.5 L 50 8.5"
                        strokeWidth="3"
                        strokeLinecap="round"
                        style={{
                            stroke: '#dc2626', // Base red, but overwritten by animation
                            animation: 'glowColor 2s ease-in-out infinite'
                        }}
                    />
                </g>

                {/* ===== SPARK EFFECT ===== */}
                <g style={{ animation: 'sparkPulse 2s linear infinite' }}>
                    <circle cx="16" cy="10" r="4" fill="#10b981" filter="blur(2px)" />
                    <circle cx="16" cy="10" r="2" fill="#d1fae5" />
                    <path d="M16 6 L16 14 M12 10 L20 10" stroke="white" strokeWidth="1" opacity="0.8" />
                </g>

            </svg>

            {/* Loading Text */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1e293b',
                    letterSpacing: '0.5px'
                }}>
                    {message}
                </span>
                <span style={{
                    fontSize: '12px',
                    color: '#64748b'
                }}>
                    {subMessage}
                </span>
            </div>
        </div>
    );
}
