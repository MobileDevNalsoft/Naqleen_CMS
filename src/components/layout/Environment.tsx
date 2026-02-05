import { Line } from '@react-three/drei';
import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useStore } from '../../store/store';
import { RestingRoom, GeneratorRoom } from './RestingRoom';
import { TerminalDispatchOffice, TerminalOffice } from './TerminalOffice';
import CityModel from './surroundings/CityModel';

// --- Shared Geometries ---

export default function Environment() {
    useThree();
    const terrainRef = useRef<THREE.Mesh>(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const layout = useStore((state) => state.layout);

    const YARD_PADDING = 20;

    const yardBounds = useMemo(() => {
        const defaultBounds = {
            width: 760,
            height: 145,
            minX: -380,
            maxX: 380,
            minZ: -72.5,
            maxZ: 72.5,
            paddedWidth: 760 + YARD_PADDING * 2,
            paddedHeight: 145 + YARD_PADDING * 2,
            paddedMinX: -380 - YARD_PADDING,
            paddedMaxX: 380 + YARD_PADDING,
            paddedMinZ: -72.5 - YARD_PADDING,
            paddedMaxZ: 72.5 + YARD_PADDING,
            cornerPoints: undefined as Array<{ x: number; z: number }> | undefined,
            paddedCornerPoints: undefined as Array<{ x: number; z: number }> | undefined
        };

        if (layout?.total_dimensions) {
            const { width, height, corner_points } = layout.total_dimensions;
            let paddedCornerPoints: Array<{ x: number; z: number }> | undefined;
            if (corner_points && corner_points.length > 0) {
                paddedCornerPoints = corner_points.map((pt, i) => {
                    const prev = corner_points[(i - 1 + corner_points.length) % corner_points.length];
                    const next = corner_points[(i + 1) % corner_points.length];
                    const prevDx = pt.x - prev.x;
                    const prevDz = pt.z - prev.z;
                    const nextDx = next.x - pt.x;
                    const nextDz = next.z - pt.z;
                    const prevLen = Math.sqrt(prevDx * prevDx + prevDz * prevDz) || 1;
                    const prevNx = -prevDz / prevLen;
                    const prevNz = prevDx / prevLen;
                    const nextLen = Math.sqrt(nextDx * nextDx + nextDz * nextDz) || 1;
                    const nextNx = -nextDz / nextLen;
                    const nextNz = nextDx / nextLen;
                    let avgNx = (prevNx + nextNx) / 2;
                    let avgNz = (prevNz + nextNz) / 2;
                    const avgLen = Math.sqrt(avgNx * avgNx + avgNz * avgNz) || 1;
                    avgNx /= avgLen;
                    avgNz /= avgLen;
                    return {
                        x: pt.x + avgNx * YARD_PADDING,
                        z: pt.z + avgNz * YARD_PADDING
                    };
                });
            }
            return {
                width,
                height,
                minX: -width / 2,
                maxX: width / 2,
                minZ: -height / 2,
                maxZ: height / 2,
                paddedWidth: width + YARD_PADDING * 2,
                paddedHeight: height + YARD_PADDING * 2,
                paddedMinX: -width / 2 - YARD_PADDING,
                paddedMaxX: width / 2 + YARD_PADDING,
                paddedMinZ: -height / 2 - YARD_PADDING,
                paddedMaxZ: height / 2 + YARD_PADDING,
                cornerPoints: corner_points,
                paddedCornerPoints
            };
        }
        return defaultBounds;
    }, [layout]);

    const yardGeometries = useMemo(() => {
        const cornerPoints = yardBounds.cornerPoints;
        const paddedPoints = yardBounds.paddedCornerPoints;

        if (!cornerPoints || !paddedPoints || cornerPoints.length < 3) {
            return null;
        }

        const shape = new THREE.Shape();
        shape.moveTo(paddedPoints[0].x, -paddedPoints[0].z);
        for (let i = 1; i < paddedPoints.length; i++) {
            shape.lineTo(paddedPoints[i].x, -paddedPoints[i].z);
        }
        shape.closePath();

        const baseGeometry = new THREE.ShapeGeometry(shape);
        const borderPoints: THREE.Vector3[] = cornerPoints.map(pt =>
            new THREE.Vector3(pt.x, -0.35, pt.z)
        );
        borderPoints.push(borderPoints[0]);
        const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);

        return { baseGeometry, borderGeometry };
    }, [yardBounds.cornerPoints, yardBounds.paddedCornerPoints]);

    const handlePointerDown = (e: any) => {
        dragStart.current = { x: e.clientX, y: e.clientY };
    };

    // Fog is handled centrally in App.tsx

    useEffect(() => {
        if (terrainRef.current) {
            const geometry = terrainRef.current.geometry;
            const positions = geometry.attributes.position;
            const count = positions.count;
            for (let i = 0; i < count; i++) {
                positions.setZ(i, 0); // Flat architectural ground
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
        }
    }, []);


    return (
        <group>
            {/* Environment lights and fog are handled in App.tsx / Lighting.tsx */}

            <mesh
                ref={terrainRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -10.0, 0]} // Deeply lowered to guarantee NO Z-fighting with ICD base (Horizon only)
                receiveShadow
            >
                {/* Optimized Ground Plane: 1x1 segments since it is flat. 
                    Huge performance win over 128x128. */}
                <planeGeometry args={[10000, 10000, 1, 1]} />
                <meshStandardMaterial
                    color="#8c7b6c" // Keeping exact Legacy Earth Tone
                    envMapIntensity={0.2} // Reduces ambient light reception, effectively "dimming" it
                    roughness={1}
                    metalness={0.5}
                />
            </mesh>

            {/* Surroundings Overhaul - City Model */}
            <CityModel />

            {/* Specialty Buildings (Dynamic) */}
            {layout?.entities.map((entity) => {
                const [x, y, z] = [entity.position.x, entity.position.y, entity.position.z];
                // Using rotation from entity if available, else 0
                const rotation = entity.rotation || 0;

                switch (entity.type) {
                    case 'resting_room':
                        return <RestingRoom key={entity.id} position={[x, y, z]} />;
                    case 'generator_room':
                        return <GeneratorRoom key={entity.id} position={[x, y, z]} />;
                    case 'terminal_dispatch_office':
                        return <TerminalDispatchOffice key={entity.id} position={[x, y, z]} rotation={rotation} />;
                    case 'terminal_office':
                        return <TerminalOffice key={entity.id} position={[x, y, z]} rotation={rotation} />;
                    default:
                        return null;
                }
            })}

            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.4, 0]}
                receiveShadow
                onPointerDown={handlePointerDown}
                onClick={(e) => {
                    e.stopPropagation();
                    if (useStore.getState().selectId) return;
                    const dx = e.clientX - dragStart.current.x;
                    const dy = e.clientY - dragStart.current.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 5) return;
                    window.dispatchEvent(new CustomEvent('moveCameraToTop'));
                }}
            >
                {yardGeometries ? (
                    <primitive object={yardGeometries.baseGeometry} attach="geometry" />
                ) : (
                    <planeGeometry args={[yardBounds.paddedWidth, yardBounds.paddedHeight]} />
                )}
                <meshStandardMaterial
                    color="#1e2730" // Reverted to Deep Slate for contrast
                    roughness={0.8}
                    metalness={0.05}
                />
            </mesh>

            <group visible={false}>
                {yardGeometries && yardBounds.cornerPoints ? (
                    <Line
                        points={[...yardBounds.cornerPoints.map(pt => [pt.x, -0.3, pt.z] as [number, number, number]), [yardBounds.cornerPoints[0].x, -0.3, yardBounds.cornerPoints[0].z]]}
                        color="#F7CF9B"
                        lineWidth={3}
                    />
                ) : (
                    <>
                        <mesh position={[0, -0.35, yardBounds.minZ]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[yardBounds.width, 0.5]} />
                            <meshBasicMaterial color="#F7CF9B" />
                        </mesh>
                        <mesh position={[0, -0.35, yardBounds.maxZ]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[yardBounds.width, 0.5]} />
                            <meshBasicMaterial color="#F7CF9B" />
                        </mesh>
                        <mesh position={[yardBounds.minX, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.5, yardBounds.height]} />
                            <meshBasicMaterial color="#F7CF9B" />
                        </mesh>
                        <mesh position={[yardBounds.maxX, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.5, yardBounds.height]} />
                            <meshBasicMaterial color="#F7CF9B" />
                        </mesh>
                    </>
                )}
            </group>
        </group >
    );
}
