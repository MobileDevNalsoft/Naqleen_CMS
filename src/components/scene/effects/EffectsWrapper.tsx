import React from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface EffectsWrapperProps {
    children: React.ReactNode;
}

// React 19 Compatibility: Cast strict R3F types to 'any' to bypass 'undefined is not Element' errors.
// This is necessary because the current version of @react-three/postprocessing has strict types that conflict with React 19's JSX rules.
const EffectComposerFX = EffectComposer as any;
const BloomFX = Bloom as any;

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
            <EffectComposerFX enableNormalPass>
                {/* Bloom: Adds glow to high-intensity materials (ToneMapped) */}
                <BloomFX
                    luminanceThreshold={2} // Lowered slightly to catch bright reflections
                    mipmapBlur
                    intensity={0.6} // Slight boost
                    radius={0.7}
                />
            </EffectComposerFX>
        </>
    );
};
