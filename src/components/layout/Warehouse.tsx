
import React, { useRef } from 'react';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

interface WarehouseProps {
    id: string;
    name: string;
    position: [number, number, number];
    width: number;
    depth: number;
    rotation?: number;
    isDimmed?: boolean;
}

// --- Shared Materials (Module Scope) ---
// Defined once to prevent duplication across N warehouse instances

const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#78716C', // Warm gray
    roughness: 0.8,
    metalness: 0.1,
    transparent: true
});

const roofMaterial = new THREE.MeshStandardMaterial({
    color: '#57534E', // Dark warm gray
    roughness: 0.9,
    metalness: 0.2,
    transparent: true
});

const doorMaterial = new THREE.MeshStandardMaterial({
    color: '#292524', // Almost black
    roughness: 0.4,
    metalness: 0.5,
    transparent: true
});

const stripeMaterial = new THREE.MeshStandardMaterial({
    color: '#FCD34D', // Safety yellow
    roughness: 0.6,
    transparent: true
});

const glassMaterial = new THREE.MeshStandardMaterial({
    color: '#93C5FD',
    metalness: 0.9,
    roughness: 0.1
});


// Warehouse Component with 3D name label
const Warehouse: React.FC<WarehouseProps> = ({ name, position, width, depth, rotation = 0, isDimmed = false }) => {
    const [x, y, z] = position;
    const height = 10; // Larger height for warehouses
    const groupRef = useRef<THREE.Group>(null);
    const opacityRef = useRef(1);

    // TELIA-STYLE: Animate material opacity using group.traverse
    // PERF FIX: Only traverse when opacity is actually changing
    useFrame((_, delta) => {
        const targetOpacity = isDimmed ? 0 : 1;

        // PERF FIX: Early exit if opacity is already stable
        const isStable = Math.abs(opacityRef.current - targetOpacity) < 0.001;
        if (isStable) {
            opacityRef.current = targetOpacity; // Snap to exact value
            return; // Skip expensive traverse
        }

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

    return (
        <group ref={groupRef} position={[x, y, z]} rotation={[0, rotation * Math.PI / 180, 0]}>
            {/* Main Building Structure */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={wallMaterial}>
                <boxGeometry args={[width, height, depth]} />
            </mesh>

            {/* Pitched Roof */}
            <mesh position={[0, height + 1.5, 0]} castShadow receiveShadow material={roofMaterial}>
                <boxGeometry args={[width + 1, 0.5, depth + 1]} />
            </mesh>

            {/* Roof ridge */}
            <mesh position={[0, height + 2, 0]} castShadow material={roofMaterial}>
                <boxGeometry args={[width - 2, 1, 2]} />
            </mesh>

            {/* Large Rolling Doors - front side */}
            {Array.from({ length: Math.floor(width / 15) }).map((_, i) => (
                <group key={`door-${i}`} position={[-width / 2 + 7.5 + i * 15, 3.5, depth / 2 + 0.1]}>
                    {/* Main door */}
                    <mesh material={doorMaterial}>
                        <boxGeometry args={[10, 7, 0.2]} />
                    </mesh>
                </group>
            ))}

            {/* Safety stripes at base */}
            <mesh position={[0, 0.15, depth / 2 + 0.1]} material={stripeMaterial}>
                <boxGeometry args={[width, 0.3, 0.1]} />
            </mesh>

            {/* Side windows (decorative) */}
            {Array.from({ length: Math.floor(depth / 8) }).map((_, i) => (
                <mesh
                    key={`window-${i}`}
                    position={[width / 2 + 0.1, height - 2, -depth / 2 + 4 + i * 8]}
                    material={glassMaterial}
                >
                    <boxGeometry args={[0.1, 2, 3]} />
                </mesh>
            ))}

            {/* 3D Floating Name Label */}
            <Billboard
                position={[0, height + 5, 0]}
                follow={true}
                lockX={false}
                lockY={false}
                lockZ={false}
            >
                <Text
                    fontSize={3}
                    color="#FFFFFF"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.15}
                    outlineColor="#1F2937"
                >
                    {name}
                </Text>
            </Billboard>
        </group>
    );
};

export default Warehouse;
