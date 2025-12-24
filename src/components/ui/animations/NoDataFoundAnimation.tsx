


interface NoDataFoundAnimationProps {
    title?: string;
    message?: string;
}

const NoDataFoundAnimation = ({
    title = "No Data Found",
    message = "No records match your current criteria."
}: NoDataFoundAnimationProps) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 40px',
            color: '#64748b',
            position: 'relative',
        }}>
            {/* Stage */}
            <div style={{ position: 'relative', width: '240px', height: '160px', marginBottom: '16px' }}>
                <svg width="100%" height="100%" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="craneGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4B686C" />
                            <stop offset="100%" stopColor="#2c3e50" />
                        </linearGradient>
                        <linearGradient id="goldBeam" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#F7CF9B" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#F7CF9B" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Floor Line */}
                    <path d="M20 130 L220 130" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />

                    {/* Shadow on Floor (Moves with Crane) */}
                    <g style={{ animation: 'trolleyMove 6s ease-in-out infinite' }}>
                        <ellipse cx="120" cy="130" rx="20" ry="3" fill="#d8d8d8ff" />
                    </g>

                    {/* --- THE GANTRY CRANE STRUCTURE --- */}

                    {/* Legs (Static Background) */}
                    <path d="M40 130 L50 20 L190 20 L200 130" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Top Rail */}
                    <rect x="40" y="20" width="160" height="8" rx="2" fill="#94a3b8" />

                    {/* --- MOVING TROLLEY & HOIST --- */}
                    <g style={{ animation: 'trolleyMove 6s ease-in-out infinite' }}>

                        {/* The Cabin/Motor */}
                        <g transform="translate(110, 16)">
                            <rect x="0" y="0" width="20" height="14" rx="2" fill="url(#craneGradient)" />
                            {/* Wheel details */}
                            <circle cx="4" cy="14" r="2" fill="#475569" />
                            <circle cx="16" cy="14" r="2" fill="#475569" />
                        </g>

                        {/* The Cable (Extends/Retracts) using ScaleY for performance/sync */}
                        {/* Base length = 12 (from 28 to 40). We need it to grow to 62 (28 to 90). Max Scale = 62/12 ≈ 5.16 */}
                        <rect
                            x="119.25"
                            y="28"
                            width="1.5"
                            height="12"
                            fill="#64748b"
                            style={{
                                animation: 'cableExtend 6s ease-in-out infinite',
                                transformOrigin: 'top center',
                                transformBox: 'fill-box'
                            }}
                        />

                        {/* The Spreader (Grabbing Part) */}
                        <g style={{ animation: 'spreaderMove 6s ease-in-out infinite' }}>
                            <g transform="translate(100, 80)">
                                {/* Spreader Body */}
                                <rect x="0" y="0" width="40" height="6" fill="#F7CF9B" stroke="#b45309" strokeWidth="1" />
                                {/* Hooks */}
                                <path d="M4 6 L4 12" stroke="#b45309" strokeWidth="2" />
                                <path d="M36 6 L36 12" stroke="#b45309" strokeWidth="2" />

                                {/* Scanning Beam (Only appears when low) */}
                                <path d="M2 12 L-10 50 L50 50 L38 12 Z" fill="url(#goldBeam)" style={{ animation: 'scanFlash 6s ease-in-out infinite' }} />
                            </g>
                        </g>

                    </g>
                </svg>
            </div>

            <h3 style={{
                margin: '0 0 6px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {title}
            </h3>

            <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#94a3b8',
                maxWidth: '260px',
                textAlign: 'center',
                lineHeight: '1.5'
            }}>
                {message}
            </p>

            <style>{`
                @keyframes trolleyMove {
                    0% { transform: translateX(0); }
                    15% { transform: translateX(-40px); }
                    30% { transform: translateX(40px); }
                    45% { transform: translateX(0); }
                    100% { transform: translateX(0); } /* Stay at Center for the rest */
                }
                @keyframes cableExtend {
                    0% { transform: scaleY(1); }
                    50% { transform: scaleY(1); } /* Wait until center */
                    60% { transform: scaleY(5.16); } /* Dropped */
                    75% { transform: scaleY(5.16); } /* Hold */
                    85% { transform: scaleY(1); } /* Lift */
                    100% { transform: scaleY(1); }
                }
                @keyframes spreaderMove {
                    0% { transform: translate(0, -40px); }
                    50% { transform: translate(0, -40px); } /* Wait until center */
                    60% { transform: translate(0, 10px); } /* Dropped */
                    75% { transform: translate(0, 10px); } /* Hold */
                    85% { transform: translate(0, -40px); } /* Lift */
                    100% { transform: translate(0, -40px); }
                }
                @keyframes scanFlash {
                    0%, 60% { opacity: 0; }
                    62% { opacity: 1; }
                    70% { opacity: 1; } /* Longer scan */
                    75% { opacity: 0; }
                    100% { opacity: 0; }
                }
                @keyframes shadowPulse {
                    0%, 50% { rx: 20; opacity: 0.1; }
                    60% { rx: 15; opacity: 0.3; } /* Impact */
                    75% { rx: 15; opacity: 0.3; }
                    85% { rx: 20; opacity: 0.1; }
                    100% { rx: 20; opacity: 0.1; }
                }
                @keyframes textFade {
                    0%, 60% { opacity: 0; }
                    62% { opacity: 1; }
                    75% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default NoDataFoundAnimation;
