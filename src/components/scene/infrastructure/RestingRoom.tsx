
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Edges, Text, Billboard } from '@react-three/drei';

// --- Resting Room Materials ---
const rrWallMaterial = new THREE.MeshStandardMaterial({
    color: '#71717a', // Zinc 500
    roughness: 0.6,
    metalness: 0.1
});

const rrRoofMaterial = new THREE.MeshStandardMaterial({
    color: '#3f3f46', // Zinc 700
    roughness: 0.8,
});

const rrDoorMaterial = new THREE.MeshStandardMaterial({
    color: '#18181b', // Black
    roughness: 0.4,
    metalness: 0.5
});

const rrWindowMaterial = new THREE.MeshStandardMaterial({
    color: '#93C5FD', // Blue glass
    metalness: 0.9,
    roughness: 0.1,
    emissive: '#1e3a8a',
    emissiveIntensity: 0.2
});

// --- Generator Room Materials ---
const genRedMaterial = new THREE.MeshStandardMaterial({
    color: '#dc2626', // Red 600
    roughness: 0.5,
    metalness: 0.3
});

const genGreyMaterial = new THREE.MeshStandardMaterial({
    color: '#374151', // Gray 700
    roughness: 0.6,
    metalness: 0.2
});

const genVentMaterial = new THREE.MeshStandardMaterial({
    color: '#1f2937', // Nearly black
    roughness: 0.8,
    metalness: 0.5
});

const genSteelMaterial = new THREE.MeshStandardMaterial({
    color: '#9ca3af', // Gray 400 (Steel)
    roughness: 0.3,
    metalness: 0.8
});

const genDoorMaterial = new THREE.MeshStandardMaterial({
    color: '#111827', // Black
    roughness: 0.4,
    metalness: 0.1
});


interface RestingRoomProps {
    position: [number, number, number];
    rotation?: number;
    label?: string;
}

export const RestingRoom: React.FC<RestingRoomProps> = ({ position, rotation = 0, label = "RESTING ROOM" }) => {
    // Dimensions
    const totalWidth = 28.5;
    const totalDepth = 23.42;

    // Layout Logic - Refactored to use totalWidth/totalDepth
    const parts = useMemo(() => {
        const colW = totalWidth / 3;

        // Calculations based on 23.42m depth
        // Back Edge: -11.71, Front Edge: +11.71

        // 1. Top Block (Horiz): Center = -9
        const topZ = -totalDepth * 0.28;
        const topH = 4;

        // 2. Bottom Block (Horiz): Center = 8.2 approx
        const botZ = totalDepth * 0.39;
        const botH = 5;

        // 3. Middle Blocks (Vert): 
        const midZ = 1.8;
        const midH = totalDepth * 0.35;

        // Right Col: Almost full depth.
        const rightH = totalDepth * 0.9;
        const rightZ = totalDepth / 2 - rightH / 2;

        // Left Col (Bottom):
        const leftH = totalDepth * 0.45;
        const leftZ = totalDepth / 2 - leftH / 2;

        return [
            // 0: Right Column (Long)
            { pos: [colW, 0, rightZ], size: [colW * 0.7, 4, rightH], type: 'right' },

            // 1: Mid Top (Horiz)
            { pos: [0, 0, topZ], size: [colW * 0.95, 3.5, topH], type: 'mid-top' },

            // 2: Mid Left (Vert)
            { pos: [-colW * 0.27, 0, midZ], size: [colW * 0.4, 3.5, midH], type: 'mid-vert' },
            // 3: Mid Right (Vert)
            { pos: [colW * 0.27, 0, midZ], size: [colW * 0.4, 3.5, midH], type: 'mid-vert' },

            // 4: Mid Bottom (Horiz)
            { pos: [0, 0, botZ], size: [colW * 0.95, 3.5, botH], type: 'mid-bot' },

            // 5: Left Column (Bottom)
            { pos: [-colW, 0, leftZ], size: [colW * 0.8, 3, leftH], type: 'left' },
        ];
    }, [totalWidth, totalDepth]);

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {parts.map((part, idx) => (
                <group key={idx} position={[part.pos[0], part.pos[1] + part.size[1] / 2, part.pos[2]]}>
                    <mesh material={rrWallMaterial} castShadow receiveShadow>
                        <boxGeometry args={[part.size[0], part.size[1], part.size[2]]} />
                    </mesh>
                    <mesh position={[0, part.size[1] / 2 + 0.1, 0]} material={rrRoofMaterial} castShadow>
                        <boxGeometry args={[part.size[0] + 0.4, 0.2, part.size[2] + 0.4]} />
                    </mesh>

                    {(part.type === 'mid-bot' || part.type === 'left' || part.type === 'right') && (
                        <mesh position={[0, -part.size[1] / 2 + 1.25, part.size[2] / 2 + 0.05]} material={rrDoorMaterial}>
                            <boxGeometry args={[2, 2.5, 0.1]} />
                        </mesh>
                    )}

                    {(part.type === 'mid-top' || part.type === 'mid-vert') && (
                        <mesh position={[0, -part.size[1] / 2 + 1.25, -part.size[2] / 2 - 0.05]} material={rrDoorMaterial}>
                            <boxGeometry args={[2, 2.5, 0.1]} />
                        </mesh>
                    )}

                    {(part.type === 'mid-top' || part.type === 'mid-vert') && (
                        <mesh position={[0, 0, part.size[2] / 2 + 0.05]} material={rrWindowMaterial}>
                            <boxGeometry args={[part.size[0] * 0.6, 1.5, 0.1]} />
                        </mesh>
                    )}

                    {part.type === 'right' && (
                        <>
                            {[0, 1, 2].map(i => (
                                <mesh key={i} position={[part.size[0] / 2 + 0.05, 0, (i - 1) * 6]} rotation={[0, Math.PI / 2, 0]} material={rrWindowMaterial}>
                                    <boxGeometry args={[3, 1.5, 0.1]} />
                                </mesh>
                            ))}
                        </>
                    )}

                    <Edges threshold={15} color="#3f3f46" />
                </group>
            ))}

            <Billboard position={[0, 8, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
                <Text fontSize={2.5} color="#FFFFFF" anchorX="center" anchorY="middle" outlineWidth={0.2} outlineColor="#000000" maxWidth={totalWidth} textAlign="center">
                    {label}
                </Text>
            </Billboard>
        </group>
    );
};

interface GeneratorRoomProps {
    position: [number, number, number];
    rotation?: number;
}

export const GeneratorRoom: React.FC<GeneratorRoomProps> = ({ position, rotation = 0 }) => {
    // Dimensions from USER (Step 2530)
    const width = 6;
    const depth = 8;
    const height = 3.5;

    const annexWidth = 6;
    const annexDepth = 6;
    const annexHeight = 3.5;
    const gap = 1.5;

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* --- Main Red Generator Room --- */}
            <group position={[0, height / 2, 0]}>
                <mesh material={genRedMaterial} castShadow receiveShadow>
                    <boxGeometry args={[width, height, depth]} />
                </mesh>

                {/* Vents on Side (X faces) */}
                <mesh position={[width / 2 + 0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={genVentMaterial}>
                    <boxGeometry args={[depth * 0.6, height * 0.5, 0.1]} />
                </mesh>
                <mesh position={[-width / 2 - 0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={genVentMaterial}>
                    <boxGeometry args={[depth * 0.6, height * 0.5, 0.1]} />
                </mesh>

                {/* Maintenance Door on Front (+Z) */}
                <mesh position={[0, -height / 2 + 1.2, depth / 2 + 0.05]} material={genDoorMaterial}>
                    <boxGeometry args={[2, 2.4, 0.1]} />
                </mesh>

                {/* Exhaust Pipes on Roof */}
                <group position={[width / 4, height / 2, -depth / 4]}>
                    <mesh material={genSteelMaterial} position={[0, 0.5, 0]}>
                        <cylinderGeometry args={[0.3, 0.3, 1, 16]} />
                    </mesh>
                </group>
                <group position={[-width / 4, height / 2, -depth / 4]}>
                    <mesh material={genSteelMaterial} position={[0, 0.5, 0]}>
                        <cylinderGeometry args={[0.3, 0.3, 1, 16]} />
                    </mesh>
                </group>

                <Edges color="#991b1b" />
            </group>

            {/* --- Grey Annex Room (Controls/Switchgear) --- */}
            <group position={[0, annexHeight / 2, -depth / 2 - annexDepth / 2 - gap]}>
                <mesh material={genGreyMaterial} castShadow receiveShadow>
                    <boxGeometry args={[annexWidth, annexHeight, annexDepth]} />
                </mesh>

                {/* Door on Side (+X) */}
                <mesh position={[annexWidth / 2 + 0.05, -annexHeight / 2 + 1.2, 0]} rotation={[0, Math.PI / 2, 0]} material={genDoorMaterial}>
                    <boxGeometry args={[1.5, 2.4, 0.1]} />
                </mesh>

                {/* Control Panel / Electric Box on Front (+Z relative to this block) */}
                <mesh position={[0, 0, annexDepth / 2 + 0.05]} material={genSteelMaterial}>
                    <boxGeometry args={[annexWidth * 0.5, 1.5, 0.1]} />
                </mesh>

                <Edges color="#1f2937" />
            </group>

            {/* Pipes connecting the two? Optional but adds realism */}
            <group position={[0, height / 2, -depth / 2 - gap / 2]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={genSteelMaterial}>
                    <cylinderGeometry args={[0.2, 0.2, gap, 8]} />
                </mesh>
            </group>

            {/* Generator Label */}
            <Billboard position={[0, height + 2, -0.5]}>
                <Text
                    fontSize={1.5}
                    color="#FFFFFF"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.1}
                    outlineColor="#000000"
                >
                    GENERATOR
                </Text>
            </Billboard>
        </group>
    );
};
