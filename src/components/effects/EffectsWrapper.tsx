import React from 'react';
import { EffectComposer, SSAO, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface EffectsWrapperProps {
    children: React.ReactNode;
}

// React 19 Compatibility: Cast strict R3F types to 'any' to bypass 'undefined is not Element' errors.
// This is necessary because the current version of @react-three/postprocessing has strict types that conflict with React 19's JSX rules.
const EffectComposerFX = EffectComposer as any;
const SSAOFX = SSAO as any;
const BloomFX = Bloom as any;
const VignetteFX = Vignette as any;

/**
 * EffectsWrapper - Cinematic Post-Processing Pipeline
 * 
 * Implements:
 * 1. SSAO: Realistic contact shadows (critical for stacked containers)
 * 2. Bloom: Subtle glow for active elements (threshold > 1)
 * 3. Vignette: Focuses attention on center
 * 4. ToneMapping: Ensures HDR dynamic range
 */
export const EffectsWrapper: React.FC<EffectsWrapperProps> = ({ children }) => {
    return (
        <>
            {children}
            <EffectComposerFX disableNormalPass={false}>
                {/* SSAO: Adds depth and contact shadows */}
                <SSAOFX
                    radius={0.05} // Slightly relaxed radius for softer contact
                    intensity={25} // Compensate for fewer samples with intensity
                    luminanceInfluence={0.5}
                    color="black"
                    worldDistanceThreshold={90} // Aggressive cull distance
                    worldDistanceFalloff={15}
                    rings={4} // Optimized: 7 -> 4 (Human eye can't distinguish >4 usually in complex scenes)
                    samples={16} // Optimized: 30 -> 16 (Massive GPU save)
                />

                {/* Bloom: Adds glow to high-intensity materials (ToneMapped) */}
                <BloomFX
                    luminanceThreshold={1.2} // Lowered slightly to catch bright reflections
                    mipmapBlur
                    intensity={0.6} // Slight boost
                    radius={0.7}
                />

                {/* Vignette: Cinematic focus */}
                <VignetteFX
                    offset={0.5} // Push to corners
                    darkness={0.3} // Subtle darkening
                    eskil={false}
                    blendFunction={BlendFunction.NORMAL}
                />
            </EffectComposerFX>
        </>
    );
};
