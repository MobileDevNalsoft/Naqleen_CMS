

interface ContainerLoaderProps {
    /** Custom message to display (default: "RETRIEVING DATA") */
    message?: string;
    /** Sub-message to display (default: "Please wait...") */
    subMessage?: string;
    /** Height of the loader container (default: 240px) */
    height?: string;
}

/**
 * A 3D CSS Shipping Container Loader Animation.
 * Displays a rotating 3D container with corrugated metal texture.
 */
export default function ContainerLoader({
    message = 'RETRIEVING DATA',
    subMessage = 'Please wait...',
    height = '240px'
}: ContainerLoaderProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: height,
            gap: '24px',
            perspective: '1000px'
        }}>
            {/* 3D Container Loader */}
            <div className="container-loader-3d">
                <div className="face-3d front-3d"></div>
                <div className="face-3d back-3d"></div>
                <div className="face-3d right-3d"></div>
                <div className="face-3d left-3d"></div>
                <div className="face-3d top-3d"></div>
                <div className="face-3d bottom-3d"></div>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--secondary-color)',
                    letterSpacing: '0.5px'
                }}>
                    {message}
                </span>
                <span style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.4)'
                }}>
                    {subMessage}
                </span>
            </div>

            <style>{`
                .container-loader-3d {
                    width: 80px;
                    height: 34px;
                    position: relative;
                    transform-style: preserve-3d;
                    animation: spinContainer3D 4s infinite linear;
                }
                
                .face-3d {
                    position: absolute;
                    box-sizing: border-box;
                    background-color: var(--secondary-color);
                    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);
                    left: 50%;
                    top: 50%;
                }

                /* Corrugation Effect on Long Sides */
                .front-3d, .back-3d, .top-3d, .bottom-3d {
                    background-image: repeating-linear-gradient(
                        90deg,
                        transparent,
                        transparent 6px,
                        rgba(0,0,0,0.1) 6px,
                        rgba(0,0,0,0.1) 8px
                    );
                }
                
                /* Door Details on Right Face */
                .right-3d {
                    background-image: linear-gradient(90deg, 
                        rgba(0,0,0,0.1) 45%, 
                        rgba(0,0,0,0.2) 50%, 
                        rgba(0,0,0,0.1) 55%
                    );
                }
                .right-3d::after {
                    content: '';
                    position: absolute;
                    width: 4px;
                    height: 16px;
                    background: rgba(0,0,0,0.25);
                    border-radius: 2px;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                }

                /* 
                   Dimensions: W=80, H=34, D=34 
                   Faces are centered at parent center via left/top 50%
                   Then translated in 3D. Negative margins center the face itself.
                */

                .front-3d  { 
                    width: 80px; height: 34px; 
                    margin-left: -40px; margin-top: -17px;
                    transform: translateZ(17px); 
                }
                .back-3d   { 
                    width: 80px; height: 34px; 
                    margin-left: -40px; margin-top: -17px;
                    transform: rotateY(180deg) translateZ(17px); 
                }
                
                .right-3d  { 
                    width: 34px; height: 34px; 
                    margin-left: -17px; margin-top: -17px;
                    transform: rotateY(90deg) translateZ(40px); 
                }
                .left-3d   { 
                    width: 34px; height: 34px; 
                    margin-left: -17px; margin-top: -17px;
                    transform: rotateY(-90deg) translateZ(40px); 
                }
                
                .top-3d    { 
                    width: 80px; height: 34px; 
                    margin-left: -40px; margin-top: -17px;
                    transform: rotateX(90deg) translateZ(17px); 
                }
                .bottom-3d { 
                    width: 80px; height: 34px; 
                    margin-left: -40px; margin-top: -17px;
                    transform: rotateX(-90deg) translateZ(17px); 
                    background-color: rgba(0,0,0,0.3);
                    box-shadow: 0 0 30px rgba(247, 207, 155, 0.4); 
                }

                @keyframes spinContainer3D {
                    0% { transform: rotateX(-20deg) rotateY(0deg); }
                    100% { transform: rotateX(-20deg) rotateY(360deg); }
                }
            `}</style>
        </div>
    );
}
