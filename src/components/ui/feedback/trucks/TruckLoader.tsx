


interface TruckLoaderProps {
    /** Custom message to display (default: "LOADING TRUCKS") */
    message?: string;
    /** Sub-message to display (default: "Please wait...") */
    subMessage?: string;
    /** Height of the loader container (default: 230px to match previous) */
    height?: string;
}

/**
 * A Premium 2D Animated Truck Loader.
 * Features a stylized generic truck driving on a moving road.
 */
export default function TruckLoader({
    message = 'LOADING TRUCKS',
    subMessage = 'Please wait...',
    height = '230px'
}: TruckLoaderProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: height,
            gap: '24px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Animation Stage */}
            <div className="truck-stage">

                {/* Speed Lines (Background) */}
                <div className="speed-line line-1"></div>
                <div className="speed-line line-2"></div>
                <div className="speed-line line-3"></div>

                {/* The Truck */}
                <div className="truck-body">
                    {/* Cabin */}
                    <div className="cabin">
                        <div className="window"></div>
                    </div>
                    {/* Trailer */}
                    <div className="trailer">
                        <div className="trailer-logo"></div>
                    </div>
                    {/* Wheels */}
                    <div className="wheel front-wheel">
                        <div className="rim"></div>
                    </div>
                    <div className="wheel back-wheel">
                        <div className="rim"></div>
                    </div>
                    <div className="wheel mid-wheel">
                        <div className="rim"></div>
                    </div>
                    {/* Underbody Shadow */}
                    <div className="shadow"></div>
                </div>

                {/* The Road */}
                <div className="road"></div>
            </div>

            {/* Text Content */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 2
            }}>
                <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--primary-color)',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    {message}
                </span>
                <span style={{
                    fontSize: '11px',
                    color: '#8CA3A5',
                    fontWeight: 500
                }}>
                    {subMessage}
                </span>
            </div>

            <style>{`
                .truck-stage {
                    position: relative;
                    width: 200px;
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* --- TRUCK ASSEMBLY --- */
                .truck-body {
                    position: relative;
                    width: 140px;
                    height: 60px;
                    animation: bounce 0.6s infinite ease-in-out alternate;
                    z-index: 10;
                }

                .cabin {
                    position: absolute;
                    right: 0;
                    bottom: 15px; /* Above wheels */
                    width: 35px;
                    height: 35px;
                    background: var(--primary-color, #4B686C);
                    border-radius: 4px 8px 4px 4px;
                }
                
                .cabin::after {
                    /* Small nose/bumper */
                    content: '';
                    position: absolute;
                    right: -2px;
                    bottom: 0;
                    width: 4px;
                    height: 12px;
                    background: #33455F;
                    border-radius: 0 4px 4px 0;
                }

                .window {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 16px;
                    height: 12px;
                    background: #DCEEF2;
                    border-radius: 0 4px 0 0;
                }

                .trailer {
                    position: absolute;
                    left: 0;
                    bottom: 15px;
                    width: 100px;
                    height: 45px;
                    background: #F5F7F7;
                    border: 2px solid var(--primary-color, #4B686C);
                    border-radius: 6px;
                    box-sizing: border-box;
                    /* Subtle corrugated pattern */
                    background-image: repeating-linear-gradient(
                        90deg,
                        transparent,
                        transparent 14px,
                        rgba(75, 104, 108, 0.05) 14px,
                        rgba(75, 104, 108, 0.05) 16px
                    );
                }

                .trailer-logo {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 40px;
                    height: 4px;
                    background: #E8EBEB;
                    border-radius: 2px;
                }

                /* Connection between trailer and cab */
                .truck-body::before {
                    content: '';
                    position: absolute;
                    bottom: 25px;
                    right: 32px; /* Between trailer end and cab */
                    width: 8px;
                    height: 4px;
                    background: #5A6C7D;
                    z-index: -1;
                }

                /* --- WHEELS --- */
                .wheel {
                    position: absolute;
                    bottom: 0;
                    width: 16px;
                    height: 16px;
                    background: #33455F;
                    border-radius: 50%;
                    animation: spin 0.8s infinite linear;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .rim {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 6px;
                    height: 6px;
                    background: #8b9bb4;
                    border-radius: 50%;
                }
                
                .wheel::after {
                    /* Spoke highlight for rotation visibility */
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 50%;
                    width: 2px;
                    height: 4px;
                    background: #5A6C7D;
                    transform: translateX(-50%);
                }

                .front-wheel { right: 4px; }
                .mid-wheel   { left: 75px; } /* Under drag axle */
                .back-wheel  { left: 10px; }

                /* --- ROAD & SHADOW --- */
                .shadow {
                    position: absolute;
                    bottom: -2px;
                    left: 5px;
                    width: 130px;
                    height: 6px;
                    background: rgba(0,0,0,0.1);
                    border-radius: 50%;
                    filter: blur(2px);
                    animation: shadow-pulse 0.6s infinite ease-in-out alternate;
                }

                .road {
                    position: absolute;
                    bottom: 0;
                    left: -20%;
                    width: 140%;
                    height: 2px;
                    background: #E0E4E4;
                    z-index: 1;
                }

                /* --- SPEED LINES --- */
                .speed-line {
                    position: absolute;
                    height: 2px;
                    background: #E0E4E4;
                    border-radius: 2px;
                    animation: rush 1.5s infinite linear;
                    z-index: 0;
                    opacity: 0.6;
                }

                .line-1 { top: 20px; left: 120%; width: 40px; animation-delay: 0s; }
                .line-2 { top: 45px; left: 120%; width: 25px; animation-delay: 0.5s; }
                .line-3 { top: 70px; left: 120%; width: 60px; animation-delay: 0.2s; }

                /* --- ANIMATIONS --- */
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes bounce {
                    from { transform: translateY(0); }
                    to { transform: translateY(-2px); }
                }
                
                @keyframes shadow-pulse {
                    from { transform: scaleX(1); opacity: 0.1; }
                    to { transform: scaleX(0.95); opacity: 0.05; }
                }

                @keyframes rush {
                    0% { left: 120%; }
                    100% { left: -20%; }
                }
            `}</style>
        </div>
    );
}
