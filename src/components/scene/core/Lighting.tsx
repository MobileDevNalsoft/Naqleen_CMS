import { useRef } from 'react';
import * as THREE from 'three';

/**
 * Lighting.tsx
 * 
 * Centralized Studio Lighting Setup for Cinematic Quality.
 * Implements a 3-Point Lighting System:
 * 1. Key Light (Sun): Strong directional light with shadows.
 * 2. Fill Light (Hemisphere): Soft ambient fill to simulate sky/ground bounce.
 * 3. Rim Light (Backlight): Adds definition to edges.
 */
export const Lighting = () => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  // Optional: Uncomment to debug shadow camera bounds
  // useHelper(directionalLightRef, THREE.DirectionalLightHelper, 10, 'red');

  return (
    <>
      {/* 1. Global Ambience - Soft Warmth (Boosted for ACESFilmic) */}
      <ambientLight intensity={3} color="#ffffff" />

      {/* 2. Hemisphere Fill - Sky Blue / Ground Green bounce */}
      <hemisphereLight
        intensity={1.0} // Boosted
        color="#b0e0e6" // Powder Blue sky
        groundColor="#c3ebc3" // Soft Green ground reflection
        position={[0, 50, 0]}
      />

      {/* 3. Key Light (Sun) - The Primary Shadow Caster */}
      <directionalLight
        ref={directionalLightRef}
        position={[100, 150, 50]} // High angle for clear shadows
        intensity={8.0} // Significantly Boosted for ToneMapping
        castShadow
        shadow-mapSize={[1024, 1024]} // Optimized: 2K -> 1K (Sufficient for industrial scenes)
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-camera-left={-400} // Expanded shadow bounds
        shadow-camera-right={400}
        shadow-camera-top={400}
        shadow-camera-bottom={-400}
        shadow-bias={-0.0001} // Fine-tune transparency artifacts
        shadow-normalBias={0.04} // Fix shadow acne on curved surfaces
      />

      {/* 4. Fill Light - Illuminates the shadow side (Studio Setup) */}
      <directionalLight
        position={[-100, 80, -50]} // Opposite to Sun
        intensity={5.0} // Strong fill
        castShadow={false} // No double shadows
      />

      {/* 5. Rim Light - Dramatic Backlight (No shadows, just highlight) */}
      <spotLight
        position={[-100, 100, -100]}
        intensity={0.8} // Boosted rim
        color="#ffd700" // Subtle gold rim
        angle={0.5}
        penumbra={1}
        distance={500}
      />
    </>
  );
};
