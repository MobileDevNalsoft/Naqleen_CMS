import { Line } from '@react-three/drei';
import { useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from '../../store/store';
import { RestingRoom, GeneratorRoom } from './RestingRoom';
import { TerminalDispatchOffice, TerminalOffice } from './TerminalOffice';

// --- Shared Geometries ---
const warehouseBodyGeometry = new THREE.BoxGeometry(15, 8, 25);
const warehouseDoorGeometry = new THREE.PlaneGeometry(6, 4);

// Industrial Assets
const lightPoleGeometry = new THREE.CylinderGeometry(0.2, 0.3, 12, 8);
const lightBaseGeometry = new THREE.BoxGeometry(1, 1, 1);
const lightArmGeometry = new THREE.BoxGeometry(3, 0.2, 0.2);
const lightFixtureGeometry = new THREE.BoxGeometry(1, 0.2, 0.5);

const bgContainerGeometry = new THREE.BoxGeometry(6, 2.6, 2.44); // 20ft scale


// Warehouse Roof Shape
const roofShape = new THREE.Shape();
roofShape.moveTo(-9, 0);
roofShape.lineTo(9, 0);
roofShape.lineTo(0, 5);
roofShape.lineTo(-9, 0);
const warehouseRoofGeometry = new THREE.ExtrudeGeometry(roofShape, {
    depth: 25,
    bevelEnabled: false
});

// --- Shared Materials ---
const warehouseRoofMaterial = new THREE.MeshStandardMaterial({ color: "#5D5D5D", roughness: 0.6, metalness: 0.3 }); // Darker industrial roof
const warehouseDoorMaterial = new THREE.MeshStandardMaterial({ color: "#2D3748", roughness: 0.7 });

const lightPoleMaterial = new THREE.MeshStandardMaterial({ color: "#666666", roughness: 0.5, metalness: 0.7 });
const lightBaseMaterial = new THREE.MeshStandardMaterial({ color: "#444444", roughness: 0.9 });
const lightEmissiveMaterial = new THREE.MeshStandardMaterial({ color: "#FFEEAA", emissive: "#FFEEAA", emissiveIntensity: 2 });

const bgContainerMaterials = [
    new THREE.MeshStandardMaterial({ color: "#8B3A3A", roughness: 0.7 }), // Rust Red
    new THREE.MeshStandardMaterial({ color: "#2F4F4F", roughness: 0.7 }), // Dark Slate
    new THREE.MeshStandardMaterial({ color: "#4682B4", roughness: 0.7 }), // Steel Blue
    new THREE.MeshStandardMaterial({ color: "#A0522D", roughness: 0.8 }), // Sienna
    new THREE.MeshStandardMaterial({ color: "#555555", roughness: 0.7 }), // Grey
];

// Pre-create warehouse body materials
const warehouseColors = ['#6B7280', '#8B95A0', '#9CA3AF', '#B0B7BE', '#7B8794'];
const warehouseMaterials = warehouseColors.map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15 })
);

// Light Pole Instance Manager
const InstancedLightPoles = ({ data }: { data: { position: [number, number, number], rotation: number }[] }) => {
    const baseRef = useRef<THREE.InstancedMesh>(null);
    const poleRef = useRef<THREE.InstancedMesh>(null);
    const armRef = useRef<THREE.InstancedMesh>(null);
    const fixtureRef = useRef<THREE.InstancedMesh>(null);

    // Update matrices
    useLayoutEffect(() => {
        const dummy = new THREE.Object3D();

        [baseRef, poleRef, armRef, fixtureRef].forEach((ref, partIndex) => {
            if (!ref.current) return;

            data.forEach((item, i) => {
                const { position, rotation } = item;
                dummy.position.set(position[0], position[1], position[2]);
                dummy.rotation.set(0, rotation, 0); // Apply Y rotation
                dummy.scale.set(1, 1, 1);

                // Local offsets for parts (must be applied AFTER rotation in world space for correct alignment? 
                // No, standard scene graph logic: Parent (Dummy) transforms Children (Parts).
                // But here we are instancing. We can't have parent-child.
                // We must manually offset relative to the rotation.

                // Rotated Offset Calculation
                // P' = P + Rot * Offset
                let offsetX = 0, offsetY = 0;

                if (partIndex === 0) offsetY = 0.5; // Base
                if (partIndex === 1) offsetY = 6;   // Pole
                if (partIndex === 2) { // Arm
                    offsetX = 1;
                    offsetY = 11.5;
                }
                if (partIndex === 3) { // Fixture
                    offsetX = 2;
                    offsetY = 11.3;
                }

                // Apply local offset rotated by the pole's rotation
                const rotationY = rotation;

                dummy.position.set(position[0], position[1], position[2]);
                dummy.rotation.set(0, rotationY, 0);
                dummy.translateX(offsetX);
                dummy.translateY(offsetY);
                // translateZ is 0

                dummy.updateMatrix();
                ref.current!.setMatrixAt(i, dummy.matrix);
            });
            ref.current.instanceMatrix.needsUpdate = true;
        });

    }, [data]);

    return (
        <group>
            <instancedMesh ref={baseRef} args={[lightBaseGeometry, lightBaseMaterial, data.length]} castShadow />
            <instancedMesh ref={poleRef} args={[lightPoleGeometry, lightPoleMaterial, data.length]} castShadow />
            <instancedMesh ref={armRef} args={[lightArmGeometry, lightPoleMaterial, data.length]} castShadow />
            <instancedMesh ref={fixtureRef} args={[lightFixtureGeometry, lightEmissiveMaterial, data.length]} />
        </group>
    );
};

// Background Container Instance Manager
const InstancedBgContainers = ({ data }: { data: { position: [number, number, number], rotation: number, colorIndex: number }[] }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        const dummy = new THREE.Object3D();

        data.forEach((item, i) => {
            dummy.position.set(item.position[0], item.position[1], item.position[2]);
            dummy.rotation.set(0, item.rotation, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);

            // Set Color
            const color = bgContainerMaterials[item.colorIndex % bgContainerMaterials.length].color;
            meshRef.current!.setColorAt(i, color);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        meshRef.current.instanceColor!.needsUpdate = true;

    }, [data]);

    return (
        <instancedMesh ref={meshRef} args={[bgContainerGeometry, undefined, data.length]} castShadow receiveShadow>
            {/* Use a white material so instanceColor shows through correctly */}
            <meshStandardMaterial roughness={0.7} />
        </instancedMesh>
    );
};

// Enhanced warehouse with more detail
const Warehouse = ({ position, rotation = 0, colorIndex = 0 }: { position: [number, number, number]; rotation?: number; colorIndex?: number }) => {
    return (
        <group position={position} rotation={[0, rotation, 0]} frustumCulled={false}>
            {/* Main Building */}
            <mesh
                position={[0, 4, 0]}
                castShadow
                receiveShadow
                geometry={warehouseBodyGeometry}
                material={warehouseMaterials[colorIndex % warehouseMaterials.length]}
                renderOrder={1}
            />
            {/* Roof - Triangular Prism */}
            <mesh
                position={[0, 8, -12.5]}
                castShadow
                receiveShadow
                geometry={warehouseRoofGeometry}
                material={warehouseRoofMaterial}
                renderOrder={1}
            />
            {/* Door - moved further out to prevent z-fighting */}
            <mesh
                position={[0, 2, 13]}
                geometry={warehouseDoorGeometry}
                material={warehouseDoorMaterial}
                renderOrder={2}
            />
        </group>
    );
};

// Helper function to calculate terrain height
const getTerrainHeight = (x: number, z: number) => {
    const yardMinX = -380;
    const yardMaxX = 380;
    const yardMinZ = -92.5;
    const yardMaxZ = 92.5;
    const yardPadding = 50;

    const isInsideYard = x >= yardMinX - yardPadding && x <= yardMaxX + yardPadding &&
        z >= yardMinZ - yardPadding && z <= yardMaxZ + yardPadding;

    if (isInsideYard) return 0;

    const distFromYardX = x < yardMinX - yardPadding ? (yardMinX - yardPadding) - x :
        x > yardMaxX + yardPadding ? x - (yardMaxX + yardPadding) : 0;
    const distFromYardZ = z < yardMinZ - yardPadding ? (yardMinZ - yardPadding) - z :
        z > yardMaxZ + yardPadding ? z - (yardMaxZ + yardPadding) : 0;
    const distFromYard = Math.sqrt(distFromYardX * distFromYardX + distFromYardZ * distFromYardZ);

    const blendDistance = 100;
    const blend = Math.min(1, distFromYard / blendDistance);
    const smoothBlend = blend * blend * (3 - 2 * blend);

    const h1 = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 20;
    const h2 = Math.sin(x * 0.01 + 1.5) * Math.cos(z * 0.01 + 2.3) * 8;
    const h3 = Math.sin(x * 0.03) * Math.sin(z * 0.03) * 2;

    let height = (h1 + h2 + h3) * smoothBlend;
    return Math.max(-5, height);
};

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

    useFrame(({ camera, scene }) => {
        if (!scene.fog) {
            scene.fog = new THREE.Fog('#D0CFCB', 250, 700);
        }
        const fog = scene.fog as THREE.Fog;
        const altitude = Math.max(0, camera.position.y);
        const baseStart = 250;
        const baseEnd = 750;
        fog.near = baseStart + (altitude * 1.5);
        fog.far = baseEnd + (altitude * 2.5);
    });

    useEffect(() => {
        if (terrainRef.current) {
            const geometry = terrainRef.current.geometry;
            const positions = geometry.attributes.position;
            const count = positions.count;
            for (let i = 0; i < count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const height = getTerrainHeight(x, -y);
                positions.setZ(i, height);
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
        }
    }, []);

    const { lightData, bgContainers, warehouses } = useMemo(() => {
        const lights: { position: [number, number, number], rotation: number }[] = [];
        const bgs: { position: [number, number, number], rotation: number, colorIndex: number }[] = [];
        const whs: { position: [number, number, number], rotation: number, colorIndex: number }[] = [];

        // Fencing Logic Adaptation for Lights
        // We place lights INSIDE the fence line by a small offset
        const LIGHT_SPACING = 45; // Meters between lights
        const LIGHT_OFFSET = 2; // Meters inside the fence

        const paddedPoints = yardBounds.paddedCornerPoints;

        const addLightsAlongEdge = (p1: { x: number, z: number }, p2: { x: number, z: number }) => {
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const len = Math.sqrt(dx * dx + dz * dz);
            const count = Math.ceil(len / LIGHT_SPACING);

            // Inward Normal Calculation
            // Assuming polygon winding is such that 'average normal' in fence calculation pointed OUTWARD.
            // Or we can just use the center of the yard relative to edge.
            // Simplest: Calculate edge angle, then +/- 90 degrees.
            // The yard center is roughly (0,0).
            const midX = (p1.x + p2.x) / 2;
            const midZ = (p1.z + p2.z) / 2;
            const centerDx = 0 - midX;
            const centerDz = 0 - midZ;

            // Edge direction angle
            const edgeAngle = Math.atan2(dz, dx);

            // Normal angles candidates: edgeAngle + PI/2, edgeAngle - PI/2
            const n1 = edgeAngle + Math.PI / 2;
            const n2 = edgeAngle - Math.PI / 2;

            // Check which normal points closer to center
            const v1x = Math.cos(n1);
            const v1z = Math.sin(n1);
            const dot1 = v1x * centerDx + v1z * centerDz;

            const inwardAngle = dot1 > 0 ? n1 : n2;

            // Offset positions slightly inward
            const inwardX = Math.cos(inwardAngle) * LIGHT_OFFSET;
            const inwardZ = Math.sin(inwardAngle) * LIGHT_OFFSET;

            for (let i = 0; i < count; i++) {
                // Skip corners to avoid overlap/clipping?
                if (i === 0 && len > LIGHT_SPACING) continue;

                const t = i / count;
                const lx = p1.x + dx * t + inwardX;
                const lz = p1.z + dz * t + inwardZ;

                // GAP LOGIC (West Fence primarily)
                // Entry/Exit gaps are roughly at Z: [-43, -27] and [-13, 3] on the West side
                // We check if this point falls into any gap.
                // Since this function is generic, we should strictly check if this edge is the West edge 
                // OR just check global coordinates if the layout is standard.
                // Checks for standard layout West Edge (x is minX approx -380)
                if (Math.abs(lx - yardBounds.paddedMinX) < 5 || Math.abs(lx - -380) < 30) {
                    if ((lz > -43 && lz < -27) || (lz > -13 && lz < 3)) {
                        continue;
                    }
                }


                const terrainY = getTerrainHeight(lx, lz);
                const ly = terrainY - 1;

                lights.push({
                    position: [lx, ly, lz],
                    rotation: inwardAngle + Math.PI // Flip 180 degrees to face opposite
                });
            }
        };

        if (paddedPoints && paddedPoints.length > 2) {
            // Polygon Mode
            for (let i = 0; i < paddedPoints.length; i++) {
                const p1 = paddedPoints[i];
                const p2 = paddedPoints[(i + 1) % paddedPoints.length];
                addLightsAlongEdge(p1, p2);
            }
        } else {
            // Rectangle Mode (Default)
            // Define 4 corners of the padded yard
            const minX = yardBounds.paddedMinX;
            const maxX = yardBounds.paddedMaxX;
            const minZ = yardBounds.paddedMinZ;
            const maxZ = yardBounds.paddedMaxZ;

            // Top Edge (MinZ) - Points East
            addLightsAlongEdge({ x: minX, z: minZ }, { x: maxX, z: minZ }); // North
            // Right Edge (MaxX) - Points South
            addLightsAlongEdge({ x: maxX, z: minZ }, { x: maxX, z: maxZ }); // East
            // Bottom Edge (MaxZ) - Points West
            addLightsAlongEdge({ x: maxX, z: maxZ }, { x: minX, z: maxZ }); // South
            // Left Edge (MinX) - Points North
            addLightsAlongEdge({ x: minX, z: maxZ }, { x: minX, z: minZ }); // West
        }

        // Simple Seeded RNG for static placement
        const seed = 123456;
        let s = seed;
        const random = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };

        const yardMinX = yardBounds.minX;
        const yardMaxX = yardBounds.maxX;
        const yardMinZ = yardBounds.minZ;
        const yardMaxZ = yardBounds.maxZ;

        // FIXED: Increased padding to prevents objects from clipping into the yard
        // Warehouses are large (~40m), so we need at least 60-80m buffer
        const yardPadding = 80;

        const isInsideYard = (x: number, z: number) => {
            return x >= yardMinX - yardPadding && x <= yardMaxX + yardPadding &&
                z >= yardMinZ - yardPadding && z <= yardMaxZ + yardPadding;
        };

        // ... (Keep existing bgContainer and Warehouse logic) ...
        for (let i = 0; i < 60; i++) {
            const angle = random() * Math.PI * 2;
            // FIXED: Start radius further out (420m) to clear the yard width (380m)
            const radius = 420 + random() * 250;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            if (isInsideYard(x, z)) continue;

            const seedVal = x * z; // Use position as seed for height/stacks
            const height = (Math.floor(Math.abs(Math.sin(seedVal) * 3)) % 3) + 1;

            for (let h = 0; h < height; h++) {
                const y = (getTerrainHeight(x, z) - 1) + 1.3 + (h * 2.6);
                const rotation = random() * Math.PI;
                const colorIndex = Math.floor(Math.abs(Math.sin(seedVal + h)) * bgContainerMaterials.length);
                bgs.push({ position: [x, y, z], rotation, colorIndex });
            }
        }

        // Static Warehouse Placement
        for (let i = 0; i < 15; i++) {
            const angle = random() * Math.PI * 2;
            const radius = 450 + random() * 150; // Warehouses further out
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            if (isInsideYard(x, z)) continue;

            const y = getTerrainHeight(x, z) - 1;
            whs.push({
                position: [x, y, z],
                rotation: random() * Math.PI,
                colorIndex: Math.floor(random() * warehouseColors.length),
            });
        }
        return { lightData: lights, bgContainers: bgs, warehouses: whs };
    }, [yardBounds]);

    return (
        <group>
            {/* <color attach="background" args={['#D0CFCB']} /> - Removed to let App.tsx control background */}
            {/* Sky removed to fix horizon line separation. relying on App.tsx background + fog match */}

            {/* Note: Environment lights are still active here, adding to App.tsx lights. 
                Consider consolidating in future cleanup. */}
            <ambientLight intensity={1.5} color="#FFFFFF" />
            <directionalLight
                position={[120, 120, 60]}
                intensity={3}
                color="#FFFACD"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-500}
                shadow-camera-right={500}
                shadow-camera-top={500}
                shadow-camera-bottom={-500}
                shadow-bias={-0.00005}
            />
            <directionalLight
                position={[-60, 60, -60]}
                intensity={0.8}
                color="#C8E6FF"
            />
            <mesh
                ref={terrainRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -1.0, 0]}
                receiveShadow
            >
                <planeGeometry args={[10000, 10000, 128, 128]} />
                <meshStandardMaterial
                    color="#4a4a48" // Darkened from #706E6B
                    roughness={0.95}
                    metalness={0.1}
                />
            </mesh>

            <InstancedLightPoles data={lightData} />
            <InstancedBgContainers data={bgContainers} />

            {warehouses.map((item, idx) => (
                <Warehouse key={idx} position={item.position} rotation={item.rotation} colorIndex={item.colorIndex} />
            ))}

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
                    color="#1e2730" // Darkened from #3A4A5A to Deep Slate for contrast
                    roughness={0.85}
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
        </group>
    );
}
