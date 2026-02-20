
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Edges, Text, Billboard } from '@react-three/drei';

// --- Shared Materials (Module Scope) ---
// Defined once, reused by all instances.
const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#52525b', // Zinc 600
    roughness: 0.7,
    metalness: 0.1
});

const roofMaterial = new THREE.MeshStandardMaterial({
    color: '#3f3f46', // Zinc 700
    roughness: 0.8,
});

const doorMaterial = new THREE.MeshStandardMaterial({
    color: '#18181b', // Black
    roughness: 0.4, metalness: 0.5
});

const windowMaterial = new THREE.MeshStandardMaterial({
    color: '#93C5FD', metalness: 0.9, roughness: 0.1
});

const parkingMaterial = new THREE.MeshStandardMaterial({
    color: '#334155', // Slate 700
    roughness: 0.9,
});

const lineMaterial = new THREE.MeshStandardMaterial({
    color: '#fbbf24', // Amber 400
    roughness: 0.5,
});


interface TerminalDispatchOfficeProps {
    position: [number, number, number];
    rotation?: number;
}

export const TerminalDispatchOffice: React.FC<TerminalDispatchOfficeProps> = ({ position, rotation = 0 }) => {
    // Dimensions
    const blockWidth = 4;
    const blockDepth = 14;
    const blockHeight = 3.5;
    const gap = 1.5;
    const annexSize = 4;

    // Layout Logic
    const officeParts = useMemo(() => {
        const parts = [];
        const extraGap = 2.5; // Extra gap for the last block

        // 4 Vertical Blocks (Right to Left)
        for (let i = 0; i < 4; i++) {
            let x = -i * (blockWidth + gap);

            // Apply extra gap for the last block (index 3)
            if (i === 3) {
                x -= extraGap;
            }

            parts.push({
                type: 'vertical',
                pos: [x, blockHeight / 2, 0], // Center Z=0
                size: [blockWidth, blockHeight, blockDepth]
            });
        }

        // Square Annex: Left Top End
        // Leftmost Vertical Block Index = 3.
        const leftMostX = -3 * (blockWidth + gap) - extraGap;

        // Position relative to leftmost block
        const x = leftMostX - blockWidth / 2 - annexSize / 2 - gap;
        const z = -blockDepth / 2 + annexSize / 2; // Align Top Edges (-Z)

        parts.push({
            type: 'annex',
            pos: [x, blockHeight / 2, z],
            size: [annexSize, blockHeight, annexSize]
        });

        return parts;
    }, []);

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* --- Office Buildings --- */}
            <group position={[0, 0, 0]}>
                {officeParts.map((part, idx) => (
                    <group key={idx} position={[part.pos[0], part.pos[1], part.pos[2]]}>
                        {/* Main Block */}
                        <mesh material={wallMaterial} castShadow receiveShadow>
                            <boxGeometry args={[part.size[0], part.size[1], part.size[2]]} />
                        </mesh>

                        {/* Roof */}
                        <mesh position={[0, part.size[1] / 2 + 0.1, 0]} material={roofMaterial} castShadow>
                            <boxGeometry args={[part.size[0] + 0.2, 0.2, part.size[2] + 0.2]} />
                        </mesh>

                        {/* Door (Front +Z) for Verticals */}
                        {part.type === 'vertical' && (
                            <mesh position={[0, -part.size[1] / 2 + 1.1, part.size[2] / 2 + 0.05]} material={doorMaterial}>
                                <boxGeometry args={[1.5, 2.2, 0.1]} />
                            </mesh>
                        )}

                        {/* Window on Annex */}
                        {part.type === 'annex' && (
                            <mesh position={[0, 0, part.size[2] / 2 + 0.05]} material={windowMaterial}>
                                <boxGeometry args={[2, 1.5, 0.1]} />
                            </mesh>
                        )}

                        <Edges threshold={15} color="#27272a" />
                    </group>
                ))}

                {/* Floating Label */}
                <Billboard position={[-8, 6, 0]}>
                    <Text
                        fontSize={1.8}
                        color="#FFFFFF"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.15}
                        outlineColor="#000000"
                    >
                        TERMINAL DESPATCH
                    </Text>
                    <Text
                        fontSize={1.5}
                        color="#e4e4e7"
                        anchorX="center"
                        anchorY="middle"
                        position={[0, -1.8, 0]}
                        outlineWidth={0.1}
                        outlineColor="#000000"
                    >
                        OFFICE ANNEX
                    </Text>
                </Billboard>
            </group>

            {/* --- Visitors Parking (Left of Office) --- */}
            {/* Resized: Width > Depth, Depth halved (30x10) */}
            <group position={[-46, 0.1, -2]}>
                {/* Asphalt Base - 30x10 */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={parkingMaterial}>
                    <planeGeometry args={[30, 10]} />
                </mesh>

                {/* Parking Strips - Shorter (8m), Distributed along 30m width */}
                {[...Array(5)].map((_, i) => (
                    <mesh key={i} position={[-12 + i * 6, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lineMaterial}>
                        <planeGeometry args={[0.2, 8]} />
                    </mesh>
                ))}

                <Billboard position={[0, 4, 0]}>
                    <Text
                        fontSize={1.8}
                        color="#fbbf24"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.1}
                        outlineColor="#000000"
                    >
                        VISITORS PARKING
                    </Text>
                </Billboard>
            </group>
        </group>
    );
};

// --- Terminal Office --- (WAS TerminalOfficeAnnex)

interface TerminalOfficeProps {
    position: [number, number, number];
    rotation?: number;
}

export const TerminalOffice: React.FC<TerminalOfficeProps> = ({ position, rotation = 0 }) => {
    // Dimensions

    const rectW = 14;
    const rectD = 4;
    const rectH = 3.5;

    const sqSize = 4;
    const gapX = 2.0; // Horizontal gap (Columns) - Kept original
    const gapZ = 1.0; // Vertical gap (Rows) - Reduced per request

    // Layout Parts
    const parts = useMemo(() => {
        const p = [];

        // --- Left Column (3 Vertical Stacked) ---
        // X = 0 (Leftmost edge reference)
        // Z stacking: Top, Mid, Bot
        const leftX = 0;

        const extendTopLeft = 2; // Extension for Top-Left
        p.push({ pos: [leftX, 0], size: [rectW + extendTopLeft, rectD], hasLeftDoor: true }); // Top (Extended)

        p.push({ pos: [leftX, rectD + gapZ], size: [rectW, rectD], hasLeftDoor: true }); // Mid
        p.push({ pos: [leftX, (rectD + gapZ) * 2], size: [rectW, rectD] }); // Bot

        // --- Middle Column (1 Top Aligned) ---
        const midX = leftX + rectW + gapX;
        p.push({ pos: [midX + 2, 0], size: [rectW, rectD] }); // Top

        // --- Right Column (Square Top, Rect Bot) ---
        const rightX = midX + rectW + gapX + 2;
        // Square Top
        // ALIGNMENT FIX: Flush Right in the column
        p.push({ pos: [rightX, 0], size: [sqSize, sqSize] });

        // Rect Bot
        const botZ = (rectD + gapZ) * 2;
        p.push({ pos: [rightX, botZ], size: [rectW, rectD] }); // Bot

        return p;
    }, []);

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {parts.map((part: any, idx) => {
                const cx = part.pos[0] + part.size[0] / 2;
                const cz = part.pos[1] + part.size[1] / 2;
                return (
                    <group key={idx} position={[cx, rectH / 2, cz]}>
                        <mesh material={wallMaterial} castShadow receiveShadow>
                            <boxGeometry args={[part.size[0], rectH, part.size[1]]} />
                        </mesh>
                        <mesh position={[0, rectH / 2 + 0.1, 0]} material={roofMaterial}>
                            <boxGeometry args={[part.size[0] + 0.2, 0.2, part.size[1] + 0.2]} />
                        </mesh>
                        {/* Door on Long Edge (Front +Z) - Only if NO left door */}
                        {!part.hasLeftDoor && (
                            <mesh position={[0, -rectH / 2 + 1.1, part.size[1] / 2 + 0.05]} material={doorMaterial}>
                                <boxGeometry args={[1.5, 2.2, 0.1]} />
                            </mesh>
                        )}

                        {/* Door on Left Side (-X) */}
                        {part.hasLeftDoor && (
                            <mesh position={[-part.size[0] / 2 - 0.05, -rectH / 2 + 1.1, 0]} rotation={[0, -Math.PI / 2, 0]} material={doorMaterial}>
                                <boxGeometry args={[1.5, 2.2, 0.1]} />
                            </mesh>
                        )}

                        <Edges threshold={15} color="#27272a" />
                    </group>
                );
            })}
            <Billboard position={[25, 6, 8]}>
                <Text fontSize={1.8} color="#FFFFFF" outlineWidth={0.15} outlineColor="#000000">
                    TERMINAL
                </Text>
                <Text fontSize={1.5} color="#e4e4e7" position={[0, -1.8, 0]} outlineWidth={0.1} outlineColor="#000000">
                    OFFICE ANNEX
                </Text>
            </Billboard>
        </group>
    );
};
