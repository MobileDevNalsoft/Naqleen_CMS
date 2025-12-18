import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { loginUser } from '../../api/handlers/authApi';
import ToastContainer, { showToast } from './Toast';

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

// Truck with High Cab and Grounded Wheel - Wheel moved backward
const TruckCab = ({ headlightsOn, errorMode, isLoading }: { headlightsOn: boolean; errorMode: boolean; isLoading: boolean }) => {
    // Error mode or Loading mode overrides standard headlight behavior
    const lightsActive = headlightsOn || errorMode || isLoading;

    // Dynamic Colors based on state
    // Normal/Loading: Warm Yellow (#FDE68A / #F7CF9B)
    // Error: Danger Red (#ef4444 / #b91c1c)
    const coreColor = errorMode ? "#ef4444" : "#FDE68A";
    const spreadColor = errorMode ? "#b91c1c" : "#F7CF9B";

    const windowPath = "M185 260 L230 140 L300 140 L340 140 L340 280 C280 290 220 280 185 260 Z";

    // Determine animation for the wheel
    const wheelAnimation = isLoading
        ? 'wheelSpinClockwise 0.8s linear infinite'
        : 'wheelSpin 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';

    // Determine animation for the lights
    const lightAnimation = errorMode
        ? 'errorBlink 0.5s ease-in-out 3 forwards'
        : isLoading
            ? 'loadingBlink 1s ease-in-out infinite'
            : 'none';

    return (
        <svg
            viewBox="0 0 450 540"
            preserveAspectRatio="xMidYMax meet"
            style={{
                position: 'absolute',
                right: '-1px',
                bottom: '-10px',
                width: '540px',
                height: 'auto',
                zIndex: 1,
                pointerEvents: 'none',
                // Truck drive-in is one-time on mount; doesn't need to change for loading
                animation: 'truckDriveIn 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                opacity: 0,
                overflow: 'visible',
            }}
        >
            <defs>
                <filter id="lightGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="12" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#5A7A7E" />
                    <stop offset="50%" stopColor="#3A5255" />
                    <stop offset="100%" stopColor="#2F4245" />
                </linearGradient>
                <linearGradient id="chromeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="50%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
                <linearGradient id="tireTread" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#333" />
                    <stop offset="20%" stopColor="#111" />
                    <stop offset="80%" stopColor="#000" />
                    <stop offset="100%" stopColor="#333" />
                </linearGradient>

                {/* Realistic Volumetric Beam Gradients - Dynamic Colors */}
                <radialGradient id="beamCoreGradient" cx="0%" cy="50%" r="100%" transform="rotate(0)">
                    <stop offset="0%" stopColor={coreColor} stopOpacity={lightsActive ? 0.9 : 0} />
                    <stop offset="40%" stopColor={coreColor} stopOpacity={lightsActive ? 0.3 : 0} />
                    <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
                </radialGradient>
                <linearGradient id="beamSpreadGradient" x1="100%" y1="50%" x2="0%" y2="50%">
                    <stop offset="0%" stopColor={spreadColor} stopOpacity={lightsActive ? 0.4 : 0} />
                    <stop offset="100%" stopColor={spreadColor} stopOpacity="0" />
                </linearGradient>

                <filter id="shadowBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" />
                </filter>

                {/* Clip Path for Window Slide Animation */}
                <clipPath id="windowClip">
                    <path d={windowPath} />
                </clipPath>
            </defs>

            {/* Shadow Grounding */}
            <ellipse cx="240" cy="520" rx="200" ry="12" fill="#000" opacity="0.6" filter="url(#shadowBlur)" />

            {/* === Realistic Light Beams - Extended to left edge === */}
            <g style={{
                transition: 'opacity 0.3s',
                opacity: lightsActive ? 1 : 0,
                animation: lightAnimation
            }}>
                {/* Wide Soft Spread - Ground interaction - Extended to -1000 */}
                <path d="M80 425 C-100 425, -400 480, -1000 540 L-1000 540 L80 440 Z" fill="url(#beamSpreadGradient)" opacity="0.4" />

                {/* Main Volumetric Cone - Extended to -1000 */}
                <path d="M80 427 L-1000 280 L-1000 620 Z" fill="url(#beamSpreadGradient)" opacity="0.5" filter="blur(10px)" />

                {/* Intense Core Beam - Extended to -800 */}
                <path d="M80 427 L-800 380 L-800 500 Z" fill="url(#beamCoreGradient)" opacity="0.8" />
            </g>

            {/* === Chassis / Frame === */}
            <rect x="90" y="410" width="350" height="80" fill="#111827" />
            <rect x="90" y="420" width="350" height="5" fill="#374151" opacity="0.3" />

            {/* === Connection / "White Bar" Area === */}
            <rect x="420" y="20" width="30" height="460" fill="url(#chromeGradient)" stroke="#fff" strokeOpacity="0.3" strokeWidth="1" />

            {/* === Front Wheel - Position Preserved (User Edit) === */}
            <g transform="translate(240, 490)">
                <g style={{
                    animation: wheelAnimation,
                    transformBox: 'fill-box',
                    transformOrigin: 'center'
                }}>
                    <circle cx="0" cy="0" r="50" fill="url(#tireTread)" />
                    <circle cx="0" cy="0" r="30" fill="#64748b" stroke="#334155" strokeWidth="4" />
                    <circle cx="0" cy="0" r="10" fill="#0f172a" />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map(d => (
                        <circle key={d} cx={18 * Math.cos(d * Math.PI / 180)} cy={18 * Math.sin(d * Math.PI / 180)} r="3" fill="#1e293b" />
                    ))}
                </g>
            </g>

            {/* === Cab Body === */}

            {/* Exhaust Pipe (Behind Cab) */}
            <path d="M390 400 L390 50 C390 20 410 10 425 5" fill="none" stroke="url(#chromeGradient)" strokeWidth="12" strokeLinecap="round" />
            <path d="M396 60 L396 200" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="4" />

            {/* Main Body Shape - Squared off front */}
            <path d="M100 410 L100 300 L110 280 L180 260 L240 100 C280 85 320 80 380 80 L380 410 Z"
                fill="url(#bodyGradient)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

            {/* Dark Interior (Visible when window slides down) */}
            <path d={windowPath} fill="#0f172a" stroke="none" />

            {/* Window Group with Clip and Animation */}
            <g clipPath="url(#windowClip)">
                <g style={{
                    transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: headlightsOn ? 'translateY(150px)' : 'translateY(0)'
                }}>
                    {/* Side Window - Matching new profile */}
                    <path d={windowPath}
                        fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                    {/* Window Reflection */}
                    <path d="M195 250 L235 155 L325 155 L325 260 C250 265 200 250 195 250 Z"
                        fill="rgba(255,255,255,0.08)" />
                </g>
            </g>

            {/* Door Cutline */}
            <path d="M340 140 L340 400 M185 260 L185 310 C185 350 200 400 250 400"
                fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />

            {/* Door Handle */}
            <rect x="290" y="320" width="30" height="8" rx="2" fill="#1f2937" stroke="rgba(255,255,255,0.1)" />

            {/* Side Steps */}
            <path d="M210 400 L210 450 L360 450 L360 400 Z" fill="#2F4245" stroke="rgba(255,255,255,0.1)" />
            <rect x="220" y="415" width="120" height="5" rx="2" fill="#111" />
            <rect x="220" y="435" width="120" height="5" rx="2" fill="#111" />

            {/* Bumper */}
            <path d="M70 410 C70 410 70 450 90 450 L210 450 L210 410 Z" fill="#1f2937" stroke="rgba(255,255,255,0.1)" />

            {/* Headlights Pattern */}
            <g filter={lightsActive ? "url(#lightGlow)" : undefined}>
                {/* Headlight fill color matches beam color */}
                <path d="M80 415 L100 415 L100 440 L80 440 Z" fill={lightsActive ? coreColor : "#cbd5e1"} />
            </g>

            {/* Front Grill Lines (Vertical on nose) */}
            <path d="M100 300 L100 410" stroke="nothing" /> {/* Guide only */}
            {[0, 1, 2, 3, 4].map(i => (
                <path key={i} d={`M${102} ${310 + i * 15} L${112} ${310 + i * 15}`} stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
            ))}

        </svg>
    );
};

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // State for visual error feedback (red blink)
    const [errorMode, setErrorMode] = useState(false);

    const triggerErrorFeedback = () => {
        setErrorMode(true);
        // Reset after 1.5s (match animation duration approximately: 0.5s * 3)
        setTimeout(() => setErrorMode(false), 1600);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            showToast('error', 'Please enter both email and password');
            triggerErrorFeedback();
            return;
        }

        setIsLoading(true);

        try {
            const response = await loginUser({ email, password });
            if (response.success) {
                showToast('success', 'Welcome back! Logging you in...', 2000);
                onLoginSuccess();
            } else {
                showToast('error', response.message || 'Login failed');
                triggerErrorFeedback();
            }
        } catch {
            showToast('error', 'An error occurred. Please try again.');
            triggerErrorFeedback();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            background: 'linear-gradient(135deg, #3A5255 0%, #4B686C 50%, #5A7A7E 100%)',
            overflow: 'hidden',
        }}>
            {/* Added ToastContainer here to handle toasts during login interaction */}
            <ToastContainer />

            {/* Left Panel - Text & Branding */}
            <div style={{
                flex: 1.3,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: '60px',
                zIndex: 20,
            }}>
                {/* Background Decor */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                    <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(247, 207, 155, 0.15) 0%, transparent 60%)', top: '-10%', left: '-10%', filter: 'blur(80px)' }} />
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
                </div>

                {/* Truck SVG - Passed Error Mode and IsLoading */}
                <TruckCab headlightsOn={showPassword} errorMode={errorMode} isLoading={isLoading} />

                {/* Text Content */}
                <div style={{
                    position: 'relative',
                    zIndex: 30,
                    maxWidth: '420px',
                    marginTop: '-40px',
                    animation: 'textSlideIn 1.2s ease-out 0.5s forwards', // Delay for text
                    opacity: 0
                }}>

                    <div style={{
                        width: '60px', height: '60px', marginBottom: '25px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F7CF9B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                    </div>

                    <h1 style={{
                        fontSize: '46px', fontWeight: 800, color: '#fff',
                        lineHeight: '1.1', marginBottom: '18px', letterSpacing: '-0.02em',
                        textShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }}>
                        Naqleen<br />CMS
                    </h1>

                    <p style={{
                        fontSize: '16px', color: 'rgba(255,255,255,0.85)',
                        lineHeight: '1.6', marginBottom: '35px', maxWidth: '360px',
                        textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                    }}>
                        Experience the next generation of 3D container logistics management.
                    </p>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {[
                            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7CF9B" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>, label: '3D Visualization' },
                            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7CF9B" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>, label: 'Smart Tracking' },
                            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7CF9B" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>, label: 'Real-time Updates' },
                        ].map((item, i) => (
                            <div key={i} style={{ padding: '8px 14px', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#fff', fontWeight: 500 }}>
                                {item.icon}{item.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ position: 'absolute', bottom: '30px', left: '60px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    © 2025 Nalsoft.
                </div>
            </div>

            {/* Right Panel - Container Form with Top/Bottom Margin Only */}
            <div style={{
                flex: 0.9,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '100px 40px',
                margin: '30px 0 60px 0', // Increased bottom margin for base
                background: 'linear-gradient(90deg, #5A7A7E 0%, #6B8A8E 50%, #7A9A9E 100%)',
                borderTopLeftRadius: '24px',
                borderBottomLeftRadius: '24px',
                position: 'relative',
                boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
                zIndex: 30,
                // Synchronous animation with the truck
                animation: 'truckDriveIn 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                opacity: 0,
            }}>
                {/* Visual Chassis/Base Line */}
                <div style={{
                    position: 'absolute',
                    bottom: '-25px',
                    left: '-36px', // Extend slightly left to connect with truck
                    right: '0',
                    height: '25px',
                    background: '#111827',
                    borderBottomLeftRadius: '12px',
                    zIndex: 25,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)' }} />
                </div>
                {/* Visual Connector Strip to Truck */}
                <div style={{ position: 'absolute', left: '-1px', top: '15%', bottom: '15%', width: '4px', background: '#e2e8f0', borderTopLeftRadius: '2px', borderBottomLeftRadius: '2px', opacity: 0.7 }} />

                {/* Container Texture */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }}>
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} style={{ position: 'absolute', left: `${6 + i * 7}%`, top: 0, bottom: 0, width: '2px', background: 'rgba(0,0,0,0.1)' }} />
                    ))}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)' }} />
                </div>

                {/* Centered Form */}
                <div style={{ width: '100%', maxWidth: '320px', position: 'relative', zIndex: 30 }}>
                    <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Welcome back</h2>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffffff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} color="#F7CF9B" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    // Using a class for autofill overrides (defined below)
                                    className="glass-input"
                                    style={{
                                        width: '100%',
                                        padding: '16px 16px 16px 48px',
                                        background: 'rgba(0, 0, 0, 0.2)', // Darker glass
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        fontSize: '15px',
                                        fontWeight: 500,
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#ffffffff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} color="#F7CF9B" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="glass-input"
                                    style={{
                                        width: '100%',
                                        padding: '16px 48px 16px 48px',
                                        background: 'rgba(0, 0, 0, 0.2)', // Darker glass
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        fontSize: '15px',
                                        fontWeight: 500,
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    placeholder="Enter password"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: showPassword ? '#fff' : 'rgba(255,255,255,0.5)', zIndex: 1 }}>
                                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%', padding: '16px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #F7CF9B 0%, #d4a04a 100%)',
                                border: 'none', color: '#1a202c', fontSize: '15px', fontWeight: 700,
                                cursor: isLoading ? 'wait' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                boxShadow: '0 4px 15px rgba(247, 207, 155, 0.3)'
                            }}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
                            {!isLoading && <ArrowRight size={18} />}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* Wheel Rotation: Counter-clockwise for leftward motion */
                @keyframes wheelSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }

                /* Wheel Loading: Clockwise Spin */
                @keyframes wheelSpinClockwise {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Text Animation: Slides in from Left to Right */
                @keyframes textSlideIn {
                    from { transform: translateX(-50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                /* Blink Animation for Error Mode */
                @keyframes errorBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.2; }
                }

                /* Blink Animation for Loading (Continuous) */
                @keyframes loadingBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }

                /* Truck Animation: Drives in from Right to Left */
                @keyframes truckDriveIn {
                    from { transform: translateX(150px) translateY(-50px); opacity: 0; }
                    from { transform: translateX(300px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                /* Autofill Override */
                .glass-input:-webkit-autofill,
                .glass-input:-webkit-autofill:hover, 
                .glass-input:-webkit-autofill:focus, 
                .glass-input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 30px #4B686C inset !important;
                    -webkit-text-fill-color: white !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                .glass-input::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
            `}</style>
        </div>
    );
}
