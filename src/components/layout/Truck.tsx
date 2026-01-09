import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

interface TruckProps {
    position: [number, number, number];
    rotation?: number;
    containerColor?: string;
    cabColor?: string;
    isDimmed?: boolean;
}

// Realistic low-poly truck with 40FT container (matching yard container style)
const Truck: React.FC<TruckProps> = ({
    position,
    rotation = 0,
    containerColor = '#DC2626',
    cabColor = '#E8E8E8',
    isDimmed = false
}) => {
    const [x, y, z] = position;
    const groupRef = useRef<THREE.Group>(null);
    const opacityRef = useRef(1);

    // TELIA-STYLE: Animate material opacity using group.traverse
    useFrame((_, delta) => {
        const targetOpacity = isDimmed ? 0 : 1;
        const lerpSpeed = delta * 3;

        // Smoothly lerp opacity
        opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, lerpSpeed);

        // Apply to all materials in the group
        if (groupRef.current) {
            groupRef.current.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    const material = mesh.material as THREE.MeshStandardMaterial;
                    if (material && material.isMeshStandardMaterial) {
                        material.transparent = true;
                        material.opacity = opacityRef.current;
                    }
                }
            });
        }
    });

    // Container dimensions for 40ft (same as yard containers)
    const containerLength = 6.058 * 2.0125; // ~12.19m for 40ft
    const containerWidth = 2.438;
    const containerHeight = 2.591;

    // Truck cab dimensions
    const cabLength = 3.5;
    const cabWidth = 2.5;
    const cabHeight = 3.0;

    // Load container texture (same as yard containers)
    const containerTexture = useTexture('/textures/container_side.png', (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        tex.generateMipmaps = true;
    });

    // === MATERIALS ===
    const cabMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: cabColor,
        roughness: 0.35,
        metalness: 0.15
    }), [cabColor]);

    const cabLowerMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#3D4852',
        roughness: 0.6,
        metalness: 0.3
    }), []);

    const cabAccentMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1A365D',
        roughness: 0.4,
        metalness: 0.4
    }), []);

    const containerMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        map: containerTexture,
        color: containerColor,
        roughness: 0.6,
        metalness: 0.4
    }), [containerColor, containerTexture]);

    const wheelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1C1C1C',
        roughness: 0.92,
        metalness: 0.02
    }), []);

    const rimMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#A8A8A8',
        roughness: 0.25,
        metalness: 0.85
    }), []);

    const chassisMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1A1A1A',
        roughness: 0.7,
        metalness: 0.5
    }), []);

    const glassMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#0D1B2A',
        roughness: 0.02,
        metalness: 0.98,
        transparent: true,
        opacity: 0.9
    }), []);

    const chromeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#E0E0E0',
        roughness: 0.05,
        metalness: 0.98
    }), []);

    const lightMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#FFFEF0',
        emissive: '#FFFACD',
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.1
    }), []);

    const turnSignalMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#FFB300',
        emissive: '#FF8F00',
        emissiveIntensity: 0.4
    }), []);

    const tailLightMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#B91C1C',
        emissive: '#DC2626',
        emissiveIntensity: 0.4
    }), []);

    const wheelRadius = 0.52;
    const wheelWidth = 0.32;

    return (
        <group ref={groupRef} position={[x, y, z]} rotation={[0, rotation * Math.PI / 180, 0]}>
            {/* === TRUCK CAB === */}
            <group position={[0, 0, containerLength / 2 + cabLength / 2 + 0.3]}>
                {/* Upper cab body */}
                <mesh position={[0, cabHeight / 2 + 1.2, 0]} castShadow material={cabMaterial}>
                    <boxGeometry args={[cabWidth, cabHeight - 0.8, cabLength]} />
                </mesh>

                {/* Lower cab panel */}
                <mesh position={[0, 0.9, 0]} castShadow material={cabLowerMaterial}>
                    <boxGeometry args={[cabWidth, 0.8, cabLength]} />
                </mesh>

                {/* Accent stripe */}
                <mesh position={[cabWidth / 2 + 0.01, 1.4, 0]} material={cabAccentMaterial}>
                    <boxGeometry args={[0.03, 0.15, cabLength - 0.2]} />
                </mesh>
                <mesh position={[-cabWidth / 2 - 0.01, 1.4, 0]} material={cabAccentMaterial}>
                    <boxGeometry args={[0.03, 0.15, cabLength - 0.2]} />
                </mesh>

                {/* Cab roof */}
                <mesh position={[0, cabHeight + 0.9, 0]} castShadow material={cabMaterial}>
                    <boxGeometry args={[cabWidth, 0.15, cabLength]} />
                </mesh>

                {/* Sun visor */}
                <mesh position={[0, cabHeight + 1.05, cabLength / 2 - 0.2]} material={cabMaterial}>
                    <boxGeometry args={[cabWidth - 0.1, 0.25, 0.4]} />
                </mesh>

                {/* Windshield */}
                <mesh position={[0, cabHeight / 2 + 1.3, cabLength / 2 - 0.08]} rotation={[0.18, 0, 0]} material={glassMaterial}>
                    <boxGeometry args={[cabWidth - 0.25, cabHeight * 0.55, 0.06]} />
                </mesh>

                {/* Side windows */}
                <mesh position={[cabWidth / 2 + 0.02, cabHeight / 2 + 1.3, 0.2]} material={glassMaterial}>
                    <boxGeometry args={[0.06, cabHeight * 0.4, cabLength * 0.55]} />
                </mesh>
                <mesh position={[-cabWidth / 2 - 0.02, cabHeight / 2 + 1.3, 0.2]} material={glassMaterial}>
                    <boxGeometry args={[0.06, cabHeight * 0.4, cabLength * 0.55]} />
                </mesh>

                {/* Headlights */}
                <mesh position={[0.85, 1.1, cabLength / 2 + 0.02]} material={lightMaterial}>
                    <boxGeometry args={[0.45, 0.25, 0.04]} />
                </mesh>
                <mesh position={[-0.85, 1.1, cabLength / 2 + 0.02]} material={lightMaterial}>
                    <boxGeometry args={[0.45, 0.25, 0.04]} />
                </mesh>

                {/* Turn signals */}
                <mesh position={[0.85, 0.75, cabLength / 2 + 0.02]} material={turnSignalMaterial}>
                    <boxGeometry args={[0.35, 0.12, 0.04]} />
                </mesh>
                <mesh position={[-0.85, 0.75, cabLength / 2 + 0.02]} material={turnSignalMaterial}>
                    <boxGeometry args={[0.35, 0.12, 0.04]} />
                </mesh>

                {/* Chrome grille bars */}
                <mesh position={[0, 1.45, cabLength / 2 + 0.03]} material={chromeMaterial}>
                    <boxGeometry args={[1.4, 0.08, 0.04]} />
                </mesh>
                <mesh position={[0, 1.25, cabLength / 2 + 0.03]} material={chromeMaterial}>
                    <boxGeometry args={[1.4, 0.08, 0.04]} />
                </mesh>
                <mesh position={[0, 1.05, cabLength / 2 + 0.03]} material={chromeMaterial}>
                    <boxGeometry args={[1.4, 0.08, 0.04]} />
                </mesh>

                {/* Chrome bumper */}
                <mesh position={[0, 0.35, cabLength / 2 + 0.12]} material={chromeMaterial}>
                    <boxGeometry args={[cabWidth + 0.15, 0.25, 0.15]} />
                </mesh>

                {/* Side mirrors */}
                <mesh position={[cabWidth / 2 + 0.2, cabHeight / 2 + 1.4, cabLength / 3]} material={chassisMaterial}>
                    <boxGeometry args={[0.3, 0.03, 0.15]} />
                </mesh>
                <mesh position={[cabWidth / 2 + 0.4, cabHeight / 2 + 1.4, cabLength / 3]} material={chromeMaterial}>
                    <boxGeometry args={[0.12, 0.2, 0.35]} />
                </mesh>
                <mesh position={[-cabWidth / 2 - 0.2, cabHeight / 2 + 1.4, cabLength / 3]} material={chassisMaterial}>
                    <boxGeometry args={[0.3, 0.03, 0.15]} />
                </mesh>
                <mesh position={[-cabWidth / 2 - 0.4, cabHeight / 2 + 1.4, cabLength / 3]} material={chromeMaterial}>
                    <boxGeometry args={[0.12, 0.2, 0.35]} />
                </mesh>

                {/* Fuel tanks */}
                <mesh position={[cabWidth / 2 + 0.3, 0.7, -cabLength / 4]} rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
                    <cylinderGeometry args={[0.32, 0.32, 0.55, 10]} />
                </mesh>
                <mesh position={[-cabWidth / 2 - 0.3, 0.7, -cabLength / 4]} rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
                    <cylinderGeometry args={[0.32, 0.32, 0.55, 10]} />
                </mesh>

                {/* Front wheels with rims */}
                <group position={[cabWidth / 2 + wheelWidth / 2 + 0.05, wheelRadius, cabLength / 4]}>
                    <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={wheelMaterial}>
                        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
                    </mesh>
                    <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
                        <cylinderGeometry args={[wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth + 0.02, 8]} />
                    </mesh>
                </group>
                <group position={[-cabWidth / 2 - wheelWidth / 2 - 0.05, wheelRadius, cabLength / 4]}>
                    <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={wheelMaterial}>
                        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
                    </mesh>
                    <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
                        <cylinderGeometry args={[wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth + 0.02, 8]} />
                    </mesh>
                </group>
            </group>

            {/* === TRAILER CHASSIS === */}
            <mesh position={[0, 0.9, 0]} castShadow receiveShadow material={chassisMaterial}>
                <boxGeometry args={[containerWidth + 0.2, 0.25, containerLength + 1]} />
            </mesh>

            {/* Chassis frame rails */}
            <mesh position={[containerWidth / 2 - 0.15, 0.6, 0]} material={chassisMaterial}>
                <boxGeometry args={[0.15, 0.4, containerLength + 0.5]} />
            </mesh>
            <mesh position={[-containerWidth / 2 + 0.15, 0.6, 0]} material={chassisMaterial}>
                <boxGeometry args={[0.15, 0.4, containerLength + 0.5]} />
            </mesh>

            {/* === 40FT CONTAINER === */}
            <group position={[0, 1.05 + containerHeight / 2, 0]}>
                <mesh castShadow receiveShadow material={containerMaterial}>
                    <boxGeometry args={[containerWidth, containerHeight, containerLength]} />
                </mesh>

                {/* Container ribs */}
                {Array.from({ length: 18 }).map((_, i) => (
                    <mesh key={`rib-r-${i}`} position={[containerWidth / 2 + 0.02, 0, -containerLength / 2 + 0.5 + i * 0.65]} material={containerMaterial}>
                        <boxGeometry args={[0.04, containerHeight - 0.2, 0.15]} />
                    </mesh>
                ))}
                {Array.from({ length: 18 }).map((_, i) => (
                    <mesh key={`rib-l-${i}`} position={[-containerWidth / 2 - 0.02, 0, -containerLength / 2 + 0.5 + i * 0.65]} material={containerMaterial}>
                        <boxGeometry args={[0.04, containerHeight - 0.2, 0.15]} />
                    </mesh>
                ))}

                {/* Container doors */}
                <mesh position={[containerWidth / 4, 0, -containerLength / 2 - 0.03]} material={containerMaterial}>
                    <boxGeometry args={[containerWidth / 2 - 0.1, containerHeight - 0.2, 0.06]} />
                </mesh>
                <mesh position={[-containerWidth / 4, 0, -containerLength / 2 - 0.03]} material={containerMaterial}>
                    <boxGeometry args={[containerWidth / 2 - 0.1, containerHeight - 0.2, 0.06]} />
                </mesh>

                {/* Door handles */}
                <mesh position={[0.15, 0, -containerLength / 2 - 0.08]} material={chromeMaterial}>
                    <boxGeometry args={[0.08, 0.8, 0.04]} />
                </mesh>
                <mesh position={[-0.15, 0, -containerLength / 2 - 0.08]} material={chromeMaterial}>
                    <boxGeometry args={[0.08, 0.8, 0.04]} />
                </mesh>
            </group>

            {/* === TRAILER WHEELS (Dual Axle) === */}
            <group position={[containerWidth / 2 + wheelWidth, wheelRadius, -containerLength / 3]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={wheelMaterial}>
                    <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth * 2, 16]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
                    <cylinderGeometry args={[wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth * 2 + 0.02, 8]} />
                </mesh>
            </group>
            <group position={[-containerWidth / 2 - wheelWidth, wheelRadius, -containerLength / 3]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={wheelMaterial}>
                    <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth * 2, 16]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
                    <cylinderGeometry args={[wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth * 2 + 0.02, 8]} />
                </mesh>
            </group>
            <group position={[containerWidth / 2 + wheelWidth, wheelRadius, -containerLength / 3 - 1.5]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={wheelMaterial}>
                    <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth * 2, 16]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
                    <cylinderGeometry args={[wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth * 2 + 0.02, 8]} />
                </mesh>
            </group>
            <group position={[-containerWidth / 2 - wheelWidth, wheelRadius, -containerLength / 3 - 1.5]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={wheelMaterial}>
                    <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth * 2, 16]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
                    <cylinderGeometry args={[wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth * 2 + 0.02, 8]} />
                </mesh>
            </group>

            {/* Tail lights */}
            <mesh position={[containerWidth / 2 - 0.3, 1.2, -containerLength / 2 - 0.55]} material={tailLightMaterial}>
                <boxGeometry args={[0.2, 0.15, 0.05]} />
            </mesh>
            <mesh position={[-containerWidth / 2 + 0.3, 1.2, -containerLength / 2 - 0.55]} material={tailLightMaterial}>
                <boxGeometry args={[0.2, 0.15, 0.05]} />
            </mesh>

            {/* Rear underride guard */}
            <mesh position={[0, 0.5, -containerLength / 2 - 0.5]} material={chromeMaterial}>
                <boxGeometry args={[containerWidth, 0.15, 0.08]} />
            </mesh>
        </group>
    );
};

export default Truck;
