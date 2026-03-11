import React from 'react';
import * as THREE from 'three';
import { Edges, Text, Billboard } from '@react-three/drei';

// --- Shared Materials ---
const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#e4e4e7', // Light zinc / pristine white
    roughness: 0.8,
});

const accentMaterial = new THREE.MeshStandardMaterial({
    color: '#8b5a2b', // Warm wood tone for deck and slats
    roughness: 0.9,
});

const roofMaterial = new THREE.MeshStandardMaterial({
    color: '#27272a', // Dark slate for modern contrast
    roughness: 0.7,
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#bfdbfe', // Light translucent blue
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.9,
    transparent: true,
    opacity: 0.7,
});

const frameMaterial = new THREE.MeshStandardMaterial({
    color: '#18181b', // Almost black frame
    roughness: 0.5,
});

const bollardMaterial = new THREE.MeshStandardMaterial({
    color: '#eab308', // Vibrant safety yellow
    roughness: 0.5,
});

const acMaterial = new THREE.MeshStandardMaterial({
    color: '#d4d4d8', // AC unit gray
    roughness: 0.5,
    metalness: 0.3
});

export interface CabinOfficeProps {
    position: [number, number, number];
    rotation?: number;
    label?: string;
    width?: number;
    depth?: number;
    height?: number;
    doorPosition?: 'front' | 'back';
}

export const CabinOffice: React.FC<CabinOfficeProps> = ({
    position,
    rotation = 0,
    label = "CABIN OFFICE",
    width = 6,
    depth = 4,
    height = 3,
    doorPosition = 'front'
}) => {
    const isDoorFront = doorPosition === 'front';
    const windowWidth = isDoorFront ? width - 2.8 : width - 1.0;

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Main Concrete/White Body */}
            <mesh position={[0, height / 2, 0]} material={wallMaterial} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <Edges threshold={15} color="#a1a1aa" />
            </mesh>

            {/* Modern Overhanging Flat Roof */}
            <mesh position={[0, height + 0.1, 0.5]} material={roofMaterial} castShadow>
                {/* Overhangs notably on the front facing (+Z) */}
                <boxGeometry args={[width + 1.2, 0.2, depth + 1.5]} />
                <Edges threshold={15} color="#000000" />
            </mesh>

            {/* Rooftop AC Unit */}
            <group position={[-width / 4, height + 0.5, -depth / 4]}>
                <mesh material={acMaterial} castShadow position={[0, 0, 0]}>
                    <boxGeometry args={[1.5, 0.8, 1.5]} />
                    <Edges threshold={15} color="#71717a" />
                </mesh>
                {/* Dark Vent Circle */}
                <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]} material={roofMaterial}>
                    <circleGeometry args={[0.5, 16]} />
                </mesh>
            </group>

            {/* Warm Wooden Front Deck / Step */}
            <mesh position={[0, 0.1, isDoorFront ? depth / 2 + 0.75 : -depth / 2 - 0.75]} material={accentMaterial} receiveShadow>
                <boxGeometry args={[width, 0.2, 1.5]} />
                <Edges threshold={15} color="#5c3a21" />
            </mesh>

            {/* Safety Bollards */}
            <group position={[0, 0.4, isDoorFront ? depth / 2 + 1.4 : -depth / 2 - 1.4]}>
                {[-width / 2 + 1, width / 2 - 1].map((x, i) => (
                    <mesh key={`bollard-${i}`} position={[x, 0, 0]} material={bollardMaterial} castShadow>
                        <cylinderGeometry args={[0.12, 0.12, 0.8, 12]} />
                    </mesh>
                ))}
            </group>

            {/* Front Panoramic Glass Window */}
            {/* Height is height-1.2. Centers at exactly (height-1.2)/2 + 0.6 from the floor to leave a low wall */}
            <group position={[0, (height - 1.2) / 2 + 0.6, depth / 2 + 0.05]}>
                {/* Aluminum/Dark Window Frame */}
                <mesh material={frameMaterial}>
                    <boxGeometry args={[windowWidth, height - 1.2, 0.1]} />
                </mesh>
                {/* Translucent Glass Pane */}
                <mesh position={[0, 0, 0.06]} material={glassMaterial}>
                    <planeGeometry args={[windowWidth - 0.2, height - 1.4]} />
                </mesh>
            </group>

            {/* Architectural Slats (Right Side Accent) */}
            <group position={[width / 2 + 0.05, height / 2, 0]}>
                {[...Array(9)].map((_, i) => (
                    <mesh key={i} position={[0, 0, -1.6 + i * 0.4]} material={accentMaterial}>
                        <boxGeometry args={[0.1, height, 0.2]} />
                    </mesh>
                ))}
            </group>

            {/* Solid Wood Door */}
            {/* Door sits exactly on the floor, height=2.2 */}
            <group
                position={[-width / 2 + 0.8, 1.1, isDoorFront ? depth / 2 + 0.05 : -depth / 2 - 0.05]}
                rotation={[0, isDoorFront ? 0 : Math.PI, 0]}
            >
                <mesh material={frameMaterial}>
                    <boxGeometry args={[1.2, 2.2, 0.08]} />
                </mesh>
                <mesh position={[0, 0, 0.05]} material={accentMaterial}>
                    <boxGeometry args={[1.0, 2.0, 0.05]} />
                </mesh>
            </group>



            {/* Floating Clean Typography Label */}
            {label && (
                <Billboard position={[0, height + 1.8, 0]}>
                    <Text
                        fontSize={width > 6 ? 1.6 : 1.2}
                        color="#ffffff"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.08}
                        outlineColor="#000000"
                    >
                        {label}
                    </Text>
                </Billboard>
            )}
        </group>
    );
};
