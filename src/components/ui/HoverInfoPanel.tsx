import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useStore } from '../../store/store';
import { useUIStore } from '../../store/uiStore';
import { Package } from 'lucide-react';

export default function HoverInfoPanel() {
    const hoverId = useStore(state => state.hoverId);
    const activePanel = useUIStore(state => state.activePanel);
    const panelRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    useEffect(() => {
        const source = useStore.getState().hoverSource;

        // Hide hover info if ANY action panel is open
        if (hoverId && source !== 'panel' && !activePanel) {
            // Kill existing animation if any
            if (timelineRef.current) timelineRef.current.kill();

            // Set initial state
            gsap.set(panelRef.current, {
                autoAlpha: 0, // opacity + visibility
                x: 50 // Start slightly from right
            });

            // Animate In
            timelineRef.current = gsap.timeline();
            timelineRef.current.to(panelRef.current, {
                duration: 0.4,
                autoAlpha: 1,
                x: 0,
                ease: "power2.out"
            });
        } else {
            // Animate Out
            if (timelineRef.current) timelineRef.current.kill();

            timelineRef.current = gsap.timeline();
            timelineRef.current.to(panelRef.current, {
                duration: 0.3,
                autoAlpha: 0,
                x: 20, // Slide out slightly to right
                ease: "power2.in",
                onComplete: () => {
                    // Ensure it stays hidden
                    if (!useStore.getState().hoverId) { // Double check consistency
                        gsap.set(panelRef.current, { autoAlpha: 0 });
                    }
                }
            });
        }
    }, [hoverId, activePanel]);

    // Don't render null to keep ref alive for GSAP, but control visibility via CSS/GSAP
    // Ideally we always render and just hide it.

    return (
        <div
            ref={panelRef}
            style={{
                position: 'absolute',
                top: '120px', // Below the top-right header (approx 66px + spacing)
                right: '20px', // Aligned with header right padding
                zIndex: 1000,
                pointerEvents: 'none', // Let clicks pass through
                visibility: 'hidden', // Initial state
                opacity: 0
            }}
        >
            <div style={{
                background: 'rgba(15, 23, 42, 0.4)', // Dark slate background
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '12px 12px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                border: '2px solid rgba(255, 255, 255, 0.6)', // Light border for highlighting
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '200px',
                justifyContent: 'center'
            }}>
                <div style={{
                    background: 'var(--primary-gradient)', // Match app theme
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(75, 104, 108, 0.4)'
                }}>
                    <Package size={20} color="white" strokeWidth={2.5} />
                </div>

                <span style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#ffffff', // White text
                    fontFamily: "'Outfit', sans-serif", // Assuming standard fonts available
                    lineHeight: '1.2'
                }}>
                    {hoverId || '...'}
                </span>
            </div>
        </div>
    );
}
