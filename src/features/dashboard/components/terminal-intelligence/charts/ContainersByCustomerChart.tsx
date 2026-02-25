import React, { useState } from 'react';
import type { ContainerByCustomer } from '../../../types/dashboardTypes';
import MetricLoader from '../../../../../components/ui/feedback/dashboard/metrics/MetricLoader';
import { theme } from '../../../../../themes/theme';

// Darker, premium solid colors mapped into rich gradients
const PREMIUM_COLORS = [
    { id: '1', start: '#4AC2B3', end: '#24887C', bg: '#31A89A1a' },
    { id: '2', start: '#FF8D76', end: '#CA604C', bg: '#E47B651a' },
    { id: '3', start: '#73CD99', end: '#459766', bg: '#61B5841a' },
    { id: '4', start: '#62A1F4', end: '#356EB6', bg: '#4B88D61a' },
    { id: '5', start: '#A480F5', end: '#6D49B8', bg: '#8D69DA1a' },
    { id: '6', start: '#FFC859', end: '#D29424', bg: '#F0B3421a' },
    { id: '7', start: '#F57AB3', end: '#B8477B', bg: '#D9659A1a' },
    { id: '8', start: '#BA7AE0', end: '#8146A5', bg: '#A063C71a' },
    { id: '9', start: '#FF9F4A', end: '#C46B1C', bg: '#E588351a' },
    { id: '10', start: '#57BEE0', end: '#2B84A5', bg: '#42A5C91a' }
];

/** Build an SVG arc path (for a thick stroke donut segment) */
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    const s = startDeg;
    const e = endDeg;
    if (e <= s) {
        if (endDeg - startDeg < 1) return '';
        const mid = (startDeg + endDeg) / 2;
        const rad = (mid * Math.PI) / 180;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        return `M ${x} ${y} A ${r} ${r} 0 0 1 ${x + 0.01} ${y + 0.01}`;
    }
    const startRad = (s * Math.PI) / 180;
    const endRad = (e * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = (e - s) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

interface ContainersByCustomerChartProps {
    data: ContainerByCustomer[] | undefined;
    state: 'loading' | 'error' | 'default';
}

export default function ContainersByCustomerChart({ data, state }: ContainersByCustomerChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (state === 'loading') {
        return (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <MetricLoader />
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8', fontSize: 14, width: '100%' }}>
                <span style={{ fontSize: 28 }}>⚠️</span>
                <span>Unable to load data</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8', fontSize: 14, width: '100%' }}>
                <span style={{ fontSize: 28 }}>📦</span>
                <span>No data available</span>
            </div>
        );
    }

    const chartData = data.map((item, i) => {
        const colorObj = PREMIUM_COLORS[i % PREMIUM_COLORS.length];
        return {
            label: item.customer_name,
            value: item.count,
            startColor: colorObj.start,
            endColor: colorObj.end,
            color: colorObj.start,
            bgColor: colorObj.bg,
            gradientUrl: `url(#grad-${colorObj.id}-cust)`
        };
    });

    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const size = 200;
    const strokeWidth = 26; // Thick donut band
    const radius = Math.max(0, (size - strokeWidth) / 2 - 4);
    const cx = size / 2;
    const cy = size / 2;

    // Pre-calculate arc angles
    const arcs: { startDeg: number; endDeg: number; midDeg: number }[] = [];
    let cumDeg = -90; // Start from top
    chartData.forEach((item) => {
        const sweep = total > 0 ? (item.value / total) * 360 : 0;
        arcs.push({ startDeg: cumDeg, endDeg: cumDeg + sweep, midDeg: cumDeg + sweep / 2 });
        cumDeg += sweep;
    });

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                height: '240px',
                animation: 'custFadeIn 0.5s ease-out'
            }}>
                {/* Donut Chart Wrapper */}
                <div style={{ flex: '0 0 45%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
                            <defs>
                                {PREMIUM_COLORS.map(c => (
                                    <linearGradient key={c.id} id={`grad-${c.id}-cust`} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={c.start} />
                                        <stop offset="100%" stopColor={c.end} />
                                    </linearGradient>
                                ))}
                            </defs>
                            {chartData.map((item, index) => {
                                const arc = arcs[index];
                                const isHovered = hoveredIndex === index;
                                const isAnyHovered = hoveredIndex !== null;
                                const baseOpacity = isAnyHovered && !isHovered ? 0.3 : 1;
                                const d = describeArc(cx, cy, radius, arc.startDeg, arc.endDeg);

                                return (
                                    <g
                                        key={item.label}
                                        style={{
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        {/* Seamless Stacking Arc */}
                                        <path
                                            d={d}
                                            fill="none"
                                            stroke={item.gradientUrl}
                                            strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                                            strokeLinecap="round"
                                            style={{
                                                opacity: baseOpacity,
                                                transition: 'stroke-width 0.2s ease-out, opacity 0.2s ease-out, filter 0.2s ease-out',
                                                animation: `custDrawStroke 0.8s ease-out backwards ${index * 0.15}s`,
                                                filter: `drop-shadow(0px 8px 12px rgba(0,0,0,0.15))`
                                            }}
                                        />
                                    </g>
                                );
                            })}

                            {/* Cyclic Stacking Hack: Re-render a tiny sliver of the first segment 
                                at its exact starting position, so it renders *on top* of the last segment,
                                completing the 3D loop visually. By drawing a real arc (even if 0.1 deg), 
                                the browser's gradient engine has a correct vector to follow. */}
                            {chartData.length > 1 && (() => {
                                const firstArc = arcs[0];
                                const firstItem = chartData[0];
                                const isHovered = hoveredIndex === 0;
                                const isAnyHovered = hoveredIndex !== null;
                                const baseOpacity = isAnyHovered && !isHovered ? 0.3 : 1;

                                // Draw a 1-degree slice of the first arc
                                const d = describeArc(cx, cy, radius, firstArc.startDeg, firstArc.startDeg + 1);

                                return (
                                    <path
                                        key="cyclic-cap"
                                        d={d}
                                        fill="none"
                                        stroke={firstItem.gradientUrl}
                                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                                        strokeLinecap="round"
                                        style={{
                                            opacity: baseOpacity,
                                            transition: 'stroke-width 0.2s ease-out, opacity 0.2s ease-out, filter 0.2s ease-out',
                                            animation: `custDrawStroke 0.8s ease-out backwards 0s`,
                                            filter: `drop-shadow(0px 8px 12px rgba(0,0,0,0.15))`
                                        }}
                                        onMouseEnter={() => setHoveredIndex(0)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    />
                                );
                            })()}
                        </svg>

                        {/* Center — show hovered item or TOTAL */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '55%',
                            height: '55%',
                            borderRadius: '50%',
                            background: theme.colors.background.secondary,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08), inset 0 0 10px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'custScaleIn 0.5s ease-out 0.3s backwards',
                            transition: 'all 0.2s ease-out'
                        }}>
                            {hoveredIndex !== null ? (
                                <>
                                    <span style={{ fontSize: '22px', fontWeight: '800', color: chartData[hoveredIndex].color, lineHeight: '1.1', transition: 'color 0.2s' }}>
                                        {chartData[hoveredIndex].value}
                                    </span>
                                    <span style={{
                                        fontSize: '8px', color: theme.colors.text.secondary, fontWeight: 600,
                                        letterSpacing: '0.02em', textTransform: 'uppercase', marginTop: '2px',
                                        maxWidth: '80%', textAlign: 'center', overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {chartData[hoveredIndex].label}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span style={{ fontSize: '10px', color: theme.colors.text.secondary, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total</span>
                                    <span style={{ fontSize: '22px', fontWeight: '800', color: theme.colors.text.primary, lineHeight: '1.1', marginTop: '2px' }}>{total}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div style={{
                    flex: '1 1 55%',
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    columnGap: '12px',
                    rowGap: '10px',
                    alignItems: 'center',
                    animation: 'custSlideInRight 0.5s ease-out 0.2s backwards',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    maxHeight: '240px',
                    paddingRight: '12px',
                    paddingLeft: '12px'
                }}>
                    {chartData.map((item, index) => (
                        <React.Fragment key={item.label}>
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.4 : 1,
                                    transition: 'opacity 0.2s ease-out',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div style={{
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${item.startColor}, ${item.endColor})`,
                                    boxShadow: `0 0 0 3px ${item.bgColor}, 0 2px 4px ${item.startColor}44`,
                                    flexShrink: 0
                                }} />
                                <span style={{
                                    fontSize: '13px', color: '#475569', fontWeight: 500,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }} title={item.label}>
                                    {item.label}
                                </span>
                            </div>
                            <span
                                style={{
                                    fontSize: '15px', fontWeight: '700', color: theme.colors.text.primary, textAlign: 'right',
                                    opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.4 : 1,
                                    transition: 'opacity 0.2s ease-out',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                {item.value}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                <style>
                    {`
                    @keyframes custDrawStroke {
                        from { stroke-dashoffset: 600; stroke-dasharray: 0 600; }
                        to { stroke-dashoffset: 0; }
                    }
                    @keyframes custScaleIn {
                        from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    }
                    @keyframes custSlideInRight {
                        from { transform: translateX(10px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes custFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}
                </style>
            </div>
        </>
    );
}
