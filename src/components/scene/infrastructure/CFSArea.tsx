import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html, Billboard, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../../store/store';
import Truck from '../objects/Truck';

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
const hoverSound = typeof Audio !== 'undefined' ? new Audio(`${import.meta.env.BASE_URL}sounds/hover.mp3`) : null;
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
}> = ({ position, areaName, onClick, onPointerOver, onPointerOut, disabled }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    // PERF FIX: Memoize Vector3 to prevent allocation every frame
    const markerWorldPos = useMemo(() => new THREE.Vector3(...position), [position]);

    // Scale marker based on distance
    useFrame(() => {
        if (!groupRef.current) return;
        const distance = camera.position.distanceTo(markerWorldPos);
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

// 40ft Container Grid for CFS Area 1
const CFSContainerGrid: React.FC<{ width: number; depth: number; containerCount?: number; fillRatio?: number }> = ({ width, depth, containerCount = 0, fillRatio }) => {
    // Texture for "Exact Look"
    const texture = useTexture(`${import.meta.env.BASE_URL}textures/container_side.png`);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;

    // Grid Configuration
    const contLength = 12.19; // X axis
    const contWidth = 2.44;   // Z axis
    const contHeight = 2.59;
    const gapX = 1.0;
    const gapZ = 0.5;

    // Industrial Colors (Memoized)
    const colors = useMemo(() => [0x00695C, 0x1A237E, 0xD84315, 0xF9A825, 0xC62828, 0x00838F, 0xEF6C00, 0x6D4C41], []);

    const elements = useMemo(() => {
        const els = [];

        // Start Top-Left (Relative to center)
        const startX = -width / 2 + contLength / 2 + 2;
        const startZ = -depth / 2 + contWidth / 2 + 2;

        // Adjust grid count to fit within available space
        const cols = Math.floor((width - 4) / (contLength + gapX));
        const rows = Math.floor((depth - 4) / (contWidth + gapZ));

        const targetCount = fillRatio != null ? Math.floor(cols * rows * fillRatio) : containerCount;

        // Base color is #2D3748. Lighter version is #4A5568.
        const markingColor = '#4A5568';

        let placedCount = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px = startX + c * (contLength + gapX);
                const pz = startZ + r * (contWidth + gapZ);

                // 1. Ground Marking (Lot Lines)
                els.push(
                    <group key={`mark-${r}-${c}`} position={[px, 0.28, pz]}>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={2} frustumCulled={false}>
                            <planeGeometry args={[contLength, contWidth]} />
                            <meshStandardMaterial
                                color={markingColor}
                                transparent
                                opacity={0.5}
                                roughness={0.9}
                                metalness={0.1}
                                polygonOffset
                                polygonOffsetFactor={-8}
                                depthWrite={false}
                            />
                        </mesh>
                    </group>
                );

                // 2. Container
                if (placedCount < targetCount) {
                    const py = 0.3 + contHeight / 2;
                    const colorHex = colors[placedCount % colors.length];
                    const color = new THREE.Color(colorHex);

                    els.push(
                        <mesh key={`cont-${placedCount}`} position={[px, py, pz]} castShadow receiveShadow>
                            <boxGeometry args={[contLength, contHeight, contWidth]} />
                            <meshStandardMaterial
                                map={texture}
                                color={color}
                                metalness={0.4}
                                roughness={0.6}
                            />
                        </mesh>
                    );
                    placedCount++;
                }
            }
        }
        return els;
    }, [width, depth, texture, colors, containerCount, fillRatio]);

    return <>{elements}</>;
};

// Main CFS Area Component
const CFSArea: React.FC<CFSAreaProps> = ({ id, name, position, width, depth, rotation = 0, isDimmed = false, childTrucks = [], entityPositionMap }) => {
    const [x, y, z] = position;
    const isLeasedArea = id === 'leased_area';
    const borderHeight = isLeasedArea ? 0.5 : 0.15;
    const borderWidth = isLeasedArea ? 0.9 : 0.25;
    const borderY = isLeasedArea ? 0.2 + borderHeight / 2 : 0.25;
    const groupRef = useRef<THREE.Group>(null);
    const opacityRef = useRef(1);

    // Get CFS container count from store
    const cfsContainers = useStore((state) => state.cfsContainers);
    const cfsContainerCount = cfsContainers.length;

    const concreteMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: isLeasedArea ? '#123A42' : '#2D3748',
        roughness: 0.95,
        transparent: true
    }), [isLeasedArea]);

    const borderMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: isLeasedArea ? '#DC2626' : '#F59E0B',
        roughness: 0.5,
        metalness: 0.3,
        emissive: isLeasedArea ? '#DC2626' : '#F59E0B',
        emissiveIntensity: isLeasedArea ? 0.25 : 0.15,
        transparent: true
    }), [isLeasedArea]);

    useFrame((_, delta) => {
        const targetOpacity = isDimmed ? 0 : 1;

        const isStable = Math.abs(opacityRef.current - targetOpacity) < 0.001;
        if (isStable) {
            opacityRef.current = targetOpacity;
            return;
        }

        const lerpSpeed = delta * 3;
        opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, lerpSpeed);

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

            {/* Static Containers for CFS Area 1 */}
            {id === 'cfs_area_1' && (
                <CFSContainerGrid width={width} depth={depth} containerCount={45} />
            )}

            {/* Static Containers for Invalid Area (invalid_containers) */}
            {id === 'invalid_containers' && (
                <CFSContainerGrid width={width} depth={depth} containerCount={20} />
            )}

            {/* Static Containers for Leased Area (leased_area - 90% fill ratio) */}
            {id === 'leased_area' && (
                <CFSContainerGrid width={width} depth={depth} fillRatio={0.9} />
            )}

            {/* Subtle Border Lines (perimeter marking) */}
            {/* Front border */}
            <mesh position={[0, borderY, depth / 2 - borderWidth / 2]} material={borderMaterial}>
                <boxGeometry args={[width, borderHeight, borderWidth]} />
            </mesh>
            {/* Back border */}
            <mesh position={[0, borderY, -depth / 2 + borderWidth / 2]} material={borderMaterial}>
                <boxGeometry args={[width, borderHeight, borderWidth]} />
            </mesh>
            {/* Left border */}
            <mesh position={[-width / 2 + borderWidth / 2, borderY, 0]} material={borderMaterial}>
                <boxGeometry args={[borderWidth, borderHeight, depth]} />
            </mesh>
            {/* Right border */}
            <mesh position={[width / 2 - borderWidth / 2, borderY, 0]} material={borderMaterial}>
                <boxGeometry args={[borderWidth, borderHeight, depth]} />
            </mesh>

            {/* Floating Marker */}
            <CFSMarker
                position={[0, 2, 0]}
                areaName={id === 'invalid_containers' ? 'Invalid Containers' : id === 'leased_area' ? 'Leased Area' : name}
                areaId={id}
                onClick={handleClick}
                onPointerOver={() => setHoveredMarker(id)}
                onPointerOut={() => setHoveredMarker(null)}
                isOtherMarkerHovered={hoveredMarker !== null && hoveredMarker !== id}
                disabled={id !== 'cfs_area_1' && id !== 'invalid_containers' && id !== 'cfs_area' && id !== 'leased_area'}
            />
            {id === 'cfs_area' ? (
                <CFSContainerGrid width={width} depth={depth} containerCount={cfsContainerCount} />
            ) : (
                childTrucks.map((truck) => {
                    const truckPos = entityPositionMap?.get(truck.id);
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
                })
            )}
        </group>
    );
};

export default CFSArea;
