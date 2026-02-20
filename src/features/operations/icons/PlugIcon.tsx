import React from 'react';

interface PlugIconProps {
    status: 'Plugged' | 'Unplugged';
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Premium Plug Icon - "Power Flow" Design
 * 
 * A clean, iconic representation of a power connection.
 * The socket and plug halves slide together with a satisfying animation.
 */
export default function PlugIcon({ status, onClick, className, style }: PlugIconProps) {
    const isPlugged = status === 'Plugged';

    // Premium color system
    const theme = {
        active: {
            fill: '#059669',      // Emerald 600 - Deep, confident green
            glow: '#10b981',      // Emerald 500 - Lighter for glow
            shadow: 'rgba(5, 150, 105, 0.4)'
        },
        inactive: {
            fill: '#dc2626',      // Red 600 - Clear warning red
            glow: '#ef4444',      // Red 500
            shadow: 'rgba(220, 38, 38, 0.3)'
        }
    };

    const current = isPlugged ? theme.active : theme.inactive;

    return (
        <div
            onClick={onClick}
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: isPlugged ? '6px 10px 6px 10px' : '6px 18px 6px 10px',
                borderRadius: '20px',
                background: isPlugged
                    ? 'rgba(5, 150, 105, 0.08)'
                    : 'rgba(220, 38, 38, 0.08)',
                transition: 'all 0.3s ease',
                ...style
            }}
        >
            <svg
                width="44"
                height="20"
                viewBox="0 0 44 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* Subtle 3D effect gradient for depth */}
                    <linearGradient id="plugDepth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
                    </linearGradient>

                    {/* Soft glow filter */}
                    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* ===== SOCKET (Left Side - Female) ===== */}
                <g
                    style={{
                        filter: isPlugged ? 'url(#softGlow)' : 'none',
                        transition: 'filter 0.3s ease'
                    }}
                >
                    {/* Main Socket Body */}
                    <path
                        d="M4 4 C4 2.5, 5 2, 7 2 L14 2 L14 18 L7 18 C5 18, 4 17.5, 4 16 L4 4 Z"
                        fill={current.fill}
                    />
                    {/* Socket Holes (Two slots) */}
                    <rect x="9" y="5" width="5" height="3" rx="0.5" fill="rgba(0,0,0,0.4)" />
                    <rect x="9" y="12" width="5" height="3" rx="0.5" fill="rgba(0,0,0,0.4)" />

                    {/* Depth overlay */}
                    <path
                        d="M4 4 C4 2.5, 5 2, 7 2 L14 2 L14 18 L7 18 C5 18, 4 17.5, 4 16 L4 4 Z"
                        fill="url(#plugDepth)"
                    />

                    {/* Left Wire */}
                    <rect x="0" y="8.5" width="4" height="3" rx="1" fill={current.fill} />
                </g>

                {/* ===== PLUG (Right Side - Male) - Animates ===== */}
                <g
                    style={{
                        transform: isPlugged ? 'translateX(0px)' : 'translateX(8px)',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        filter: isPlugged ? 'url(#softGlow)' : 'none'
                    }}
                >
                    {/* Prongs (The parts that go into the socket) */}
                    <rect x="14" y="5" width="6" height="3" rx="0.5" fill={current.fill} />
                    <rect x="14" y="12" width="6" height="3" rx="0.5" fill={current.fill} />

                    {/* Plug Face (Where prongs emerge) */}
                    <rect x="18" y="2" width="4" height="16" rx="1" fill={current.fill} />

                    {/* Main Plug Body */}
                    <path
                        d="M22 2 L37 2 C39 2, 40 2.5, 40 4 L40 16 C40 17.5, 39 18, 37 18 L22 18 L22 2 Z"
                        fill={current.fill}
                    />

                    {/* Plug Body Depth Overlay */}
                    <path
                        d="M22 2 L37 2 C39 2, 40 2.5, 40 4 L40 16 C40 17.5, 39 18, 37 18 L22 18 L22 2 Z"
                        fill="url(#plugDepth)"
                    />

                    {/* Grip Lines (Subtle texture) */}
                    <line x1="28" y1="5" x2="28" y2="15" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />
                    <line x1="32" y1="5" x2="32" y2="15" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />
                    <line x1="36" y1="5" x2="36" y2="15" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />

                    {/* Right Wire / Cord */}
                    <rect x="40" y="8.5" width="4" height="3" rx="1" fill={current.fill} />
                </g>

                {/* ===== CONNECTION SPARK (Only when plugged) ===== */}
                {isPlugged && (
                    <g>
                        <circle cx="16" cy="10" r="2" fill={current.glow} opacity="0.8">
                            <animate
                                attributeName="opacity"
                                values="0.8;0.3;0.8"
                                dur="2s"
                                repeatCount="indefinite"
                            />
                        </circle>
                    </g>
                )}
            </svg>
        </div>
    );
}
