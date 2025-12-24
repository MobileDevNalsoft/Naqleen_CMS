import React, { useRef, useEffect, useState } from 'react';

interface TemperatureScaleProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    label: string;
    step?: number;
}

export default function TemperatureScale({
    value,
    onChange,
    min = -30,
    max = 30,
    label
}: TemperatureScaleProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startScrollLeft, setStartScrollLeft] = useState(0);
    const lastEmittedValue = useRef<number | null>(null);
    const isScrolling = useRef(false);
    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Configuration
    const PIXELS_PER_UNIT = 10; // Space between tick marks
    const MAJOR_TICK_INTERVAL = 5; // Number label every 5 degrees

    // Calculate total width based on range
    const range = max - min;
    const totalContentWidth = range * PIXELS_PER_UNIT;

    // Padding to allow scrolling to ends (center alignment)
    // We'll calculate this dynamically or use a safe estimate (half container width)
    const PAD = 200;

    // Sync scroll when value changes externally (or initial load)
    useEffect(() => {
        if (scrollRef.current && !isDragging) {
            // Skip sync if user is actively scrolling
            if (isScrolling.current) return;

            // Prevent fighting with scroll: if the new value matches what we just emitted 
            // via scroll/drag, don't force-reset the scroll position.
            if (lastEmittedValue.current !== null && lastEmittedValue.current === value) {
                return;
            }

            const containerWidth = scrollRef.current.clientWidth;
            const valueOffset = (value - min) * PIXELS_PER_UNIT;
            // Center the value: scrollLeft = valueOffset - halfContainer
            scrollRef.current.scrollLeft = valueOffset - (containerWidth / 2) + PAD;

            // clear the ref as we have synced
            lastEmittedValue.current = null;
        }
    }, [value, min, isDragging]);

    // Add wheel event listener for horizontal scrolling
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            if (e.deltaY === 0 && e.deltaX === 0) return;
            e.preventDefault();
            // Reduce sensitivity by factor of 0.2
            el.scrollLeft += (e.deltaY + e.deltaX) * 0.2;
        };

        el.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            el.removeEventListener('wheel', onWheel);
        };
    }, []);

    const handleScroll = () => {
        // Mark as scrolling to suppress value sync
        isScrolling.current = true;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            isScrolling.current = false;
        }, 150);

        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            // Center point in scroll content
            const centerPos = scrollLeft + (clientWidth / 2) - PAD;

            // Convert pixels back to value
            let newValue = min + (centerPos / PIXELS_PER_UNIT);

            // Clamping
            newValue = Math.max(min, Math.min(max, newValue));

            // Rounding to step/integer for display stability if needed, 
            // but for "scrolling" feel, maybe keep one decimal or round to step?
            // User inputs were showing "0.0", implying decimal support? 
            // The previous code had parseFloats. Let's stick to 1 decimal for smoothness or integer?
            // Ticks usually imply integers. Let's round to nearest integer for the snap feel, or 0.1?
            // "decrease or increase the temperature" -> typically integers in reefers or 0.5.
            // Let's go with Math.round(newValue) for now to match the "scale" visualization which usually has integer ticks.

            // Actually, let's allow 0.5 precision if needed, but standard reefers are often 1 deg steps.
            // Let's round to nearest integer for clean UX first.
            const rounded = Math.round(newValue);

            if (rounded !== value) {
                lastEmittedValue.current = rounded;
                onChange(rounded);
            }
        }
    };

    // Drag implementation for mouse interactions (desktop)
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.pageX);
        if (scrollRef.current) {
            setStartScrollLeft(scrollRef.current.scrollLeft);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX;
        const walk = (x - startX) * 1.5; // Scroll-fast multiplier
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = startScrollLeft - walk;
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

            {/* Restored Header Label */}
            <div style={{ marginBottom: '15px', paddingLeft: '2px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </label>
            </div>

            <div style={{ position: 'relative' }}>
                {/* The Bump (Value Display) */}
                <div style={{
                    position: 'absolute',
                    top: '-32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '64px',
                    height: '64px',
                    background: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    zIndex: 20,
                    boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05), 0 -2px 4px -1px rgba(0, 0, 0, 0.03)', // Shadow only on top effectively
                    border: '1px solid #e2e8f0',
                    borderBottom: 'none' // Merge with container
                }}>
                    <div style={{
                        position: 'absolute',
                        bottom: '-10px',
                        left: '0',
                        right: '0',
                        height: '20px',
                        background: 'white',
                        zIndex: 21
                    }} /> {/* Filler to hide bottom curve/border */}

                    <span style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--primary-color)',
                        zIndex: 22,
                        marginTop: '2px'
                    }}>
                        {value}°
                    </span>
                </div>

                {/* Ruler Container */}
                <div
                    style={{
                        position: 'relative',
                        height: '80px',
                        background: 'white',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        userSelect: 'none',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                    onMouseLeave={handleMouseUp}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {/* Center Indicator (The "Needle") */}
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '24px', // Push down below where the bump merges
                        bottom: '0',
                        width: '2px',
                        background: 'var(--secondary-gradient)',
                        zIndex: 10,
                        transform: 'translateX(-50%)',
                        pointerEvents: 'none',
                        boxShadow: '0 0 10px rgba(247, 207, 155, 0.6)'
                    }}>
                        {/* Top Triangle/Arrow */}
                        <div style={{
                            position: 'absolute',
                            top: '0',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '0',
                            height: '0',
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '8px solid #F7CF9B'
                        }} />
                    </div>

                    {/* Left/Right Fade Gradients */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', background: 'linear-gradient(to right, white, transparent)', zIndex: 5, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40px', background: 'linear-gradient(to left, white, transparent)', zIndex: 5, pointerEvents: 'none' }} />

                    {/* Scrollable Track */}
                    <div
                        ref={scrollRef}
                        // ... rest remains roughly same, just updating bg to white in gradient if needed (already done above)
                        onScroll={handleScroll}
                        onMouseDown={handleMouseDown}
                        style={{
                            overflowX: 'scroll',
                            overflowY: 'hidden',
                            height: '100%',
                            width: '100%',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }}
                        className="no-scrollbar"
                    >
                        <div style={{
                            width: `${totalContentWidth + (PAD * 2)}px`,
                            height: '100%',
                            position: 'relative',
                            pointerEvents: 'none'
                        }}>
                            {/* Render Ticks */}
                            {Array.from({ length: range + 1 }).map((_, i) => {
                                const tickValue = min + i;
                                const leftPos = PAD + (i * PIXELS_PER_UNIT);
                                const isMajor = tickValue % MAJOR_TICK_INTERVAL === 0;

                                return (
                                    <div
                                        key={tickValue}
                                        style={{
                                            position: 'absolute',
                                            left: `${leftPos}px`,
                                            bottom: '0',
                                            height: isMajor ? '40%' : '25%',
                                            width: isMajor ? '2px' : '1px',
                                            background: isMajor ? '#cbd5e1' : '#e2e8f0',
                                            transform: 'translateX(-50%)'
                                        }}
                                    >
                                        {isMajor && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-24px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#94a3b8'
                                            }}>
                                                {tickValue}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
