import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html, Billboard } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/store';
import Truck from './Truck';

interface ChildEntity {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation?: number;
    props?: { containerColor?: string };
}

interface CFSAreaProps {
    id: string;
    name: string;
    position: [number, number, number];
    width: number;
    depth: number;
    rotation?: number;
    isDimmed?: boolean;
    childTrucks?: ChildEntity[];
    entityPositionMap?: Map<string, { x: number; z: number }>;
}

// Hover sound for marker
const hoverSound = typeof Audio !== 'undefined' ? new Audio('/sounds/hover.mp3') : null;
if (hoverSound) {
    hoverSound.volume = 0.15;
}

// Interactive marker component for CFS Area
const CFSMarker: React.FC<{
    position: [number, number, number];
    areaName: string;
    areaId: string;
    onClick: () => void;
    onPointerOver: () => void;
    onPointerOut: () => void;
    isOtherMarkerHovered: boolean;
    disabled?: boolean;
}> = ({ position, areaName, onClick, onPointerOver, onPointerOut, isOtherMarkerHovered, disabled }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    // Scale marker based on distance
    useFrame(() => {
        if (!groupRef.current) return;
        const distance = camera.position.distanceTo(new THREE.Vector3(...position));
        const baseDistance = 100;
        const minScale = 0.5;
        const maxScale = 2.0;
        const scaleFactor = Math.max(minScale, Math.min(maxScale, distance / baseDistance));
        groupRef.current.scale.setScalar(scaleFactor);
    });

    if (disabled) return null;

    return (
        <Billboard position={position}>
            <group ref={groupRef}>
                <Html
                    center
                    style={{
                        pointerEvents: 'auto',
                        transform: 'translate(-50%, -50%)'
                    }}
                    zIndexRange={[100, 0]}
                >
                    <div
                        className="block-marker-container"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        onMouseEnter={() => {
                            try {
                                if (hoverSound) {
                                    hoverSound.currentTime = 0;
                                    hoverSound.play().catch(() => { });
                                }
                            } catch (e) { }
                            onPointerOver();
                        }}
                        onMouseLeave={onPointerOut}
                    >
                        {/* Main Pulse Circle */}
                        <div className="block-marker-pulse">
                            <span className="block-marker-icon">i</span>
                        </div>

                        {/* Tooltip */}
                        <div className="block-marker-tooltip">
                            <span className="block-marker-tooltip-text">{areaName}</span>
                        </div>

                        {/* Outer Glow Ring */}
                        <div className="block-marker-outer-ring"></div>
                    </div>
                </Html>
            </group>
        </Billboard>
    );
};

// Main CFS Area Component
const CFSArea: React.FC<CFSAreaProps> = ({ id, name, position, width, depth, rotation = 0, isDimmed = false, childTrucks = [], entityPositionMap }) => {
    const [x, y, z] = position;
    const borderHeight = 0.15; // Subtle border height
    const borderWidth = 0.25; // Border thickness
    const groupRef = useRef<THREE.Group>(null);
    const opacityRef = useRef(1);

    const concreteMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#2D3748', // Darker concrete (Slate 800) to reduce brightness
        roughness: 0.95,
        transparent: true
    }), []);

    const borderMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#F59E0B', // Amber/yellow for visibility
        roughness: 0.5,
        metalness: 0.3,
        emissive: '#F59E0B',
        emissiveIntensity: 0.15,
        transparent: true
    }), []);

    // TELIA-STYLE: Animate opacity using group.traverse
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
                        material.opacity = opacityRef.current;
                    }
                }
            });
        }
    });



    // Store integration
    const setSelectedCFS = useStore((state) => state.setSelectedBlock);
    const hoveredMarker = useStore((state) => state.hoveredMarker);
    const setHoveredMarker = useStore((state) => state.setHoveredMarker);

    const handleClick = () => {
        setSelectedCFS(id);
    };

    return (
        <group ref={groupRef} position={[x, y, z]} rotation={[0, rotation * Math.PI / 180, 0]}>
            {/* Floor/Platform */}
            <mesh position={[0, 0.1, 0]} receiveShadow material={concreteMaterial}>
                <boxGeometry args={[width, 0.2, depth]} />
            </mesh>

            {/* Subtle Border Lines (perimeter marking) */}
            {/* Front border */}
            <mesh position={[0, 0.25, depth / 2 - borderWidth / 2]} material={borderMaterial}>
                <boxGeometry args={[width, borderHeight, borderWidth]} />
            </mesh>
            {/* Back border */}
            <mesh position={[0, 0.25, -depth / 2 + borderWidth / 2]} material={borderMaterial}>
                <boxGeometry args={[width, borderHeight, borderWidth]} />
            </mesh>
            {/* Left border */}
            <mesh position={[-width / 2 + borderWidth / 2, 0.25, 0]} material={borderMaterial}>
                <boxGeometry args={[borderWidth, borderHeight, depth]} />
            </mesh>
            {/* Right border */}
            <mesh position={[width / 2 - borderWidth / 2, 0.25, 0]} material={borderMaterial}>
                <boxGeometry args={[borderWidth, borderHeight, depth]} />
            </mesh>

            {/* Interactive Marker */}
            <CFSMarker
                position={[0, 8, 0]}
                areaName={name}
                areaId={id}
                onClick={handleClick}
                onPointerOver={() => setHoveredMarker(id)}
                onPointerOut={() => setHoveredMarker(null)}
                isOtherMarkerHovered={hoveredMarker !== null && hoveredMarker !== id}
                disabled={isDimmed}
            />

            {/* Child Trucks - rendered as children for automatic opacity inheritance */}
            {childTrucks.map((truck) => {
                const truckPos = entityPositionMap?.get(truck.id);
                // Truck position is relative to CFS, so need to convert to local coords
                const localX = (truckPos?.x ?? truck.position.x) - position[0];
                const localZ = (truckPos?.z ?? truck.position.z) - position[2];

                return (
                    <Truck
                        key={truck.id}
                        position={[localX, 0.2, localZ]}
                        rotation={truck.rotation || 0}
                        containerColor={truck.props?.containerColor}
                    />
                );
            })}
        </group>
    );
};

export default CFSArea;
