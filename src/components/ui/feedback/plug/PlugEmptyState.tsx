
interface PlugEmptyStateProps {
    title?: string;
    description?: string;
}

export default function PlugEmptyState({
    title = "No Activity Yet",
    description = "Plug in or out actions will appear here"
}: PlugEmptyStateProps) {
    return (
        <div style={{
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            background: 'linear-gradient(180deg, rgba(75, 104, 108, 0.03) 0%, transparent 100%)',
            borderRadius: '16px',
            margin: '8px 0',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {/* Premium Empty State Illustration */}
            <svg
                width="120"
                height="80"
                viewBox="0 0 120 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="emptyPlugGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                    <filter id="emptyGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background Circle */}
                <circle cx="60" cy="40" r="36" fill="rgba(148, 163, 184, 0.08)" />
                <circle cx="60" cy="40" r="28" fill="rgba(148, 163, 184, 0.05)" />

                {/* Socket (Left) */}
                <g transform="translate(30, 28)">
                    <rect x="0" y="0" width="20" height="24" rx="3" fill="url(#emptyPlugGrad)" opacity="0.6" />
                    <rect x="14" y="6" width="6" height="4" rx="1" fill="#475569" />
                    <rect x="14" y="14" width="6" height="4" rx="1" fill="#475569" />
                    <rect x="-6" y="9" width="6" height="6" rx="1" fill="url(#emptyPlugGrad)" opacity="0.6" />
                </g>

                {/* Plug (Right) - Disconnected, slightly separated */}
                <g transform="translate(62, 28)" style={{ filter: 'url(#emptyGlow)' }}>
                    {/* Prongs */}
                    <rect x="0" y="6" width="8" height="4" rx="1" fill="#94a3b8" opacity="0.5" />
                    <rect x="0" y="14" width="8" height="4" rx="1" fill="#94a3b8" opacity="0.5" />
                    {/* Body */}
                    <rect x="6" y="0" width="22" height="24" rx="4" fill="url(#emptyPlugGrad)" opacity="0.6" />
                    {/* Grip lines */}
                    <line x1="14" y1="5" x2="14" y2="19" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="18" y1="5" x2="18" y2="19" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="22" y1="5" x2="22" y2="19" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Cord */}
                    <rect x="28" y="9" width="8" height="6" rx="2" fill="url(#emptyPlugGrad)" opacity="0.5" />
                </g>

                {/* Dotted line showing disconnection */}
                <line
                    x1="52" y1="40" x2="60" y2="40"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    opacity="0.6"
                >
                    <animate
                        attributeName="stroke-dashoffset"
                        values="0;6"
                        dur="1s"
                        repeatCount="indefinite"
                    />
                </line>
            </svg>

            {/* Text Content */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#475569'
                }}>
                    {title}
                </span>
                <span style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    textAlign: 'center',
                    maxWidth: '200px',
                    lineHeight: 1.5
                }}>
                    {description}
                </span>
            </div>
        </div>
    );
}
