import { Sky, Line } from '@react-three/drei';
import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from '../../store/store';

// --- Shared Geometries ---
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

// const hillGeometry = new THREE.SphereGeometry(10, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

// --- Shared Materials ---
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

// More realistic tree with better proportions and wind animation
// Industrial Light Pole
const LightPole = ({ position }: { position: [number, number, number] }) => {
    return (
        <group position={position}>
            <mesh position={[0, 0.5, 0]} geometry={lightBaseGeometry} material={lightBaseMaterial} castShadow />
            <mesh position={[0, 6, 0]} geometry={lightPoleGeometry} material={lightPoleMaterial} castShadow />
            <mesh position={[1, 11.5, 0]} geometry={lightArmGeometry} material={lightPoleMaterial} castShadow />
            <mesh position={[2, 11.3, 0]} geometry={lightFixtureGeometry} material={lightEmissiveMaterial} />
            {/* SpotLight for effect */}
            <pointLight position={[2, 10, 0]} intensity={0.5} distance={20} color="#FFEEAA" />
        </group>
    );
};

// Background Container Stack
const BgContainerStack = ({ position, rotation }: { position: [number, number, number]; rotation: number }) => {
    // Deterministic random height based on position
    const seed = position[0] * position[2];
    const height = (Math.floor(Math.abs(Math.sin(seed) * 3)) % 3) + 1;

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {Array.from({ length: height }).map((_, i) => (
                <mesh
                    key={i}
                    position={[0, 1.3 + (i * 2.6), 0]}
                    geometry={bgContainerGeometry}
                    material={bgContainerMaterials[Math.floor(Math.abs(Math.sin(seed + i)) * bgContainerMaterials.length)]}
                    castShadow
                    receiveShadow
                />
            ))}
        </group>
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

// Helper function to calculate terrain height at a given x, z position
// This ensures that objects (trees, warehouses) are placed on the ground
const getTerrainHeight = (x: number, z: number) => {
    // Centered yard bounds (symmetric around origin)
    const yardMinX = -380;
    const yardMaxX = 380;
    const yardMinZ = -92.5;
    const yardMaxZ = 92.5;
    const yardPadding = 50; // Extra padding for smooth transition

    // Check if inside the flat yard area (with padding)
    const isInsideYard = x >= yardMinX - yardPadding && x <= yardMaxX + yardPadding &&
        z >= yardMinZ - yardPadding && z <= yardMaxZ + yardPadding;

    if (isInsideYard) return 0;

    // Calculate distance from yard boundary for blending
    const distFromYardX = x < yardMinX - yardPadding ? (yardMinX - yardPadding) - x :
        x > yardMaxX + yardPadding ? x - (yardMaxX + yardPadding) : 0;
    const distFromYardZ = z < yardMinZ - yardPadding ? (yardMinZ - yardPadding) - z :
        z > yardMaxZ + yardPadding ? z - (yardMaxZ + yardPadding) : 0;
    const distFromYard = Math.sqrt(distFromYardX * distFromYardX + distFromYardZ * distFromYardZ);

    const blendDistance = 100; // Distance to blend from flat to hills
    const blend = Math.min(1, distFromYard / blendDistance);
    const smoothBlend = blend * blend * (3 - 2 * blend);

    // Organic noise simulation using multiple sine waves (FBM-like)
    // Layer 1: Large rolling hills
    const h1 = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 20;
    // Layer 2: Medium details
    const h2 = Math.sin(x * 0.01 + 1.5) * Math.cos(z * 0.01 + 2.3) * 8;
    // Layer 3: Small variations
    const h3 = Math.sin(x * 0.03) * Math.sin(z * 0.03) * 2;

    let height = (h1 + h2 + h3) * smoothBlend;

    // Ensure terrain doesn't go below ground level too much
    return Math.max(-5, height);
};

export default function Environment() {
    useThree();
    const terrainRef = useRef<THREE.Mesh>(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const layout = useStore((state) => state.layout);

    // Calculate yard bounds from layout data or use defaults
    // Original dimensions = actual ICD area, Padded = yard base mesh with border padding
    const YARD_PADDING = 20; // Padding in meters around the original yard dimensions

    const yardBounds = useMemo(() => {
        const defaultBounds = {
            // Original dimensions (from JSON)
            width: 760,
            height: 145,
            minX: -380,
            maxX: 380,
            minZ: -72.5,
            maxZ: 72.5,
            // Padded dimensions (for yard base mesh and fencing)
            paddedWidth: 760 + YARD_PADDING * 2,
            paddedHeight: 145 + YARD_PADDING * 2,
            paddedMinX: -380 - YARD_PADDING,
            paddedMaxX: 380 + YARD_PADDING,
            paddedMinZ: -72.5 - YARD_PADDING,
            paddedMaxZ: 72.5 + YARD_PADDING,
            // Polygon corner points (undefined = rectangle)
            cornerPoints: undefined as Array<{ x: number; z: number }> | undefined,
            paddedCornerPoints: undefined as Array<{ x: number; z: number }> | undefined
        };

        if (layout?.total_dimensions) {
            const { width, height, corner_points } = layout.total_dimensions;

            // Calculate padded corner points if original corner points are defined
            let paddedCornerPoints: Array<{ x: number; z: number }> | undefined;
            if (corner_points && corner_points.length > 0) {
                // For L-shaped yards, we need proper polygon offset
                // Simple approach: offset each point based on which edge it's on
                paddedCornerPoints = corner_points.map((pt, i) => {
                    const prev = corner_points[(i - 1 + corner_points.length) % corner_points.length];
                    const next = corner_points[(i + 1) % corner_points.length];

                    // Determine offset direction based on adjacent edges
                    const prevDx = pt.x - prev.x;
                    const prevDz = pt.z - prev.z;
                    const nextDx = next.x - pt.x;
                    const nextDz = next.z - pt.z;

                    // Calculate outward normal for each edge
                    // For clockwise winding, outward normal is (-dz, dx)
                    const prevLen = Math.sqrt(prevDx * prevDx + prevDz * prevDz) || 1;
                    const prevNx = -prevDz / prevLen;
                    const prevNz = prevDx / prevLen;

                    // For edge from pt to next
                    const nextLen = Math.sqrt(nextDx * nextDx + nextDz * nextDz) || 1;
                    const nextNx = -nextDz / nextLen;
                    const nextNz = nextDx / nextLen;

                    // Average the normals for this vertex
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
                // Original dimensions
                width,
                height,
                minX: -width / 2,
                maxX: width / 2,
                minZ: -height / 2,
                maxZ: height / 2,
                // Padded dimensions
                paddedWidth: width + YARD_PADDING * 2,
                paddedHeight: height + YARD_PADDING * 2,
                paddedMinX: -width / 2 - YARD_PADDING,
                paddedMaxX: width / 2 + YARD_PADDING,
                paddedMinZ: -height / 2 - YARD_PADDING,
                paddedMaxZ: height / 2 + YARD_PADDING,
                // Polygon support
                cornerPoints: corner_points,
                paddedCornerPoints
            };
        }

        return defaultBounds;
    }, [layout]);

    // Create polygon geometries when corner_points are defined
    const yardGeometries = useMemo(() => {
        const cornerPoints = yardBounds.cornerPoints;
        const paddedPoints = yardBounds.paddedCornerPoints;

        if (!cornerPoints || !paddedPoints || cornerPoints.length < 3) {
            return null; // Use rectangular geometries
        }

        // Create Shape from PADDED corner points for the yard base mesh
        // Note: Shape is on XY plane, mesh rotation [-PI/2, 0, 0] maps Shape Y to world -Z
        // So we negate Z to get correct world coordinates
        const shape = new THREE.Shape();
        shape.moveTo(paddedPoints[0].x, -paddedPoints[0].z);
        for (let i = 1; i < paddedPoints.length; i++) {
            shape.lineTo(paddedPoints[i].x, -paddedPoints[i].z);
        }
        shape.closePath();

        const baseGeometry = new THREE.ShapeGeometry(shape);

        // Create Line geometry for border (using original corner points)
        const borderPoints: THREE.Vector3[] = cornerPoints.map(pt =>
            new THREE.Vector3(pt.x, -0.35, pt.z)
        );
        borderPoints.push(borderPoints[0]); // Close the loop
        const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);

        return { baseGeometry, borderGeometry };
    }, [yardBounds.cornerPoints, yardBounds.paddedCornerPoints]);

    const handlePointerDown = (e: any) => {
        // Store start position for click vs drag check
        dragStart.current = { x: e.clientX, y: e.clientY };
    };

    // Industrial Fog - Hazier, greyer
    // Dynamic Fog based on Camera Height (Altitude)
    // This allows clear top-down views while keeping the horizon foggy at ground level
    useFrame(({ camera, scene }) => {
        if (!scene.fog) {
            scene.fog = new THREE.Fog('#D0CFCB', 250, 700);
        }

        const fog = scene.fog as THREE.Fog;
        const altitude = Math.max(0, camera.position.y);

        // Base values for ground level (Industrial Haze)
        const baseStart = 250;
        const baseEnd = 750;

        // As we go up, push the fog away
        // We add the altitude to the distance so the ground remains clear "below" us
        // Multiplier controls how fast it clears up. 
        // 1.2x altitude means if we are at Y=500, fog starts at 250 + 600 = 850. Distance to ground is 500. So clear.
        fog.near = baseStart + (altitude * 1.5);
        fog.far = baseEnd + (altitude * 2.5);
    });

    // Add subtle, realistic terrain undulation for circular terrain
    useEffect(() => {
        if (terrainRef.current) {
            // Access the geometry position attribute
            const geometry = terrainRef.current.geometry;
            const positions = geometry.attributes.position;
            const count = positions.count;

            for (let i = 0; i < count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i); // Plane is initially flat on XY, we modify Z for height

                // In the rotated plane, 'y' corresponds to world 'z'
                // Since the plane is rotated -90deg X, local Y maps to World -Z
                // So we pass -y as the Z coordinate to sampling function
                const height = getTerrainHeight(x, -y);

                // Set the Z coordinate (which is Up in our rotated mesh)
                positions.setZ(i, height);
            }

            positions.needsUpdate = true;
            geometry.computeVertexNormals();
        }
    }, []);

    // Generate more realistic surroundings - adjusted for extended yard
    const surroundings = useMemo(() => {
        const items: Array<{
            type: string;
            position: [number, number, number];
            rotation?: number;
            scale?: number;
            colorIndex?: number;
        }> = [];

        // Use dynamic yard bounds from layout
        const yardMinX = yardBounds.minX;
        const yardMaxX = yardBounds.maxX;
        const yardMinZ = yardBounds.minZ;
        const yardMaxZ = yardBounds.maxZ;
        const yardPadding = 15; // Padding for exclusion check
        const lightPadding = 25; // Padding for light poles (further outside fence)

        // Helper to check if position is inside the yard
        const isInsideYard = (x: number, z: number) => {
            return x >= yardMinX - yardPadding && x <= yardMaxX + yardPadding &&
                z >= yardMinZ - yardPadding && z <= yardMaxZ + yardPadding;
        };

        // Light Poles - Along rectangular perimeter OUTSIDE the fence
        // Bottom edge (z = yardMinZ - lightPadding)
        for (let x = yardMinX; x <= yardMaxX; x += 50) {
            const z = yardMinZ - lightPadding;
            const y = getTerrainHeight(x, z) - 1;
            items.push({ type: 'lightPole', position: [x, y, z] });
        }
        // Top edge (z = yardMaxZ + lightPadding)
        for (let x = yardMinX; x <= yardMaxX; x += 50) {
            const z = yardMaxZ + lightPadding;
            const y = getTerrainHeight(x, z) - 1;
            items.push({ type: 'lightPole', position: [x, y, z] });
        }
        // Left edge (x = yardMinX - lightPadding)
        for (let z = yardMinZ; z <= yardMaxZ; z += 40) {
            const x = yardMinX - lightPadding;
            const y = getTerrainHeight(x, z) - 1;
            items.push({ type: 'lightPole', position: [x, y, z] });
        }
        // Right edge (x = yardMaxX + lightPadding)
        for (let z = yardMinZ; z <= yardMaxZ; z += 40) {
            const x = yardMaxX + lightPadding;
            const y = getTerrainHeight(x, z) - 1;
            items.push({ type: 'lightPole', position: [x, y, z] });
        }

        // Background Container Stacks - Only outside the yard
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 350 + Math.random() * 200; // Further out
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // Skip if inside the yard area
            if (isInsideYard(x, z)) continue;

            const y = getTerrainHeight(x, z) - 1;
            items.push({
                type: 'bgContainer',
                position: [x, y, z],
                rotation: Math.random() * Math.PI,
            });
        }

        // Warehouses - Only outside the yard
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 380 + Math.random() * 120;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // Skip if inside the yard area
            if (isInsideYard(x, z)) continue;

            const y = getTerrainHeight(x, z) - 1;
            items.push({
                type: 'warehouse',
                position: [x, y, z],
                rotation: Math.random() * Math.PI,
                colorIndex: Math.floor(Math.random() * warehouseColors.length),
            });
        }

        return items;
    }, [yardBounds]);

    return (
        <group>
            {/* Force background color to match fog/sky for seamless industrial look */}
            <color attach="background" args={['#D0CFCB']} />

            {/* Hemisphere sky dome with realistic appearance - Day Mode */}
            {/* Industrial Sky */}
            <Sky
                sunPosition={[100, 50, 100]} // Slightly lower sun
                turbidity={8}                 // Higher turbidity for dust/haze
                rayleigh={1}
                mieCoefficient={0.01}
                mieDirectionalG={0.8}
            />

            {/* Natural daylight with warm tones */}
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
            {/* Soft fill light */}
            <directionalLight
                position={[-60, 60, -60]}
                intensity={0.8}
                color="#C8E6FF"
            />

            {/* Large circular terrain with subtle rolling hills */}
            <mesh
                ref={terrainRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -1.0, 0]}
                receiveShadow
            >
                {/* High resolution plane for smooth organic terrain */}
                <planeGeometry args={[2000, 2000, 128, 128]} />
                <meshStandardMaterial
                    color="#706E6B" // Concrete/Dusty Ground
                    roughness={0.95}
                    metalness={0.1}
                />
                {/* flatShading={false} // Ensure smooth shading */}
            </mesh>

            {/* Render Generated Surroundings */}
            {surroundings.map((item, idx) => {
                if (item.type === 'lightPole') return <LightPole key={idx} position={item.position} />;
                if (item.type === 'bgContainer') return <BgContainerStack key={idx} position={item.position} rotation={item.rotation!} />;
                if (item.type === 'warehouse') return <Warehouse key={idx} position={item.position} rotation={item.rotation} colorIndex={item.colorIndex} />;
                // if (item.type === 'hill') return <Hill key={idx} position={item.position} scale={item.scale} colorIndex={item.colorIndex} />;
                return null;
            })}

            {/* Unified Icd Base Plane - Dimensions from layout */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.4, 0]}
                receiveShadow
                onPointerDown={handlePointerDown}
                onClick={(e) => {
                    e.stopPropagation();

                    // If a container is selected, do NOT trigger top view
                    // The user must press ESC or click ground elsewhere to deselect first
                    if (useStore.getState().selectId) {
                        return;
                    }

                    // Calculate distance moved
                    const dx = e.clientX - dragStart.current.x;
                    const dy = e.clientY - dragStart.current.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // If moved more than 5 pixels, it's a drag (rotation), not a click
                    if (distance > 5) {
                        return;
                    }

                    // Dispatch custom event for camera transition
                    window.dispatchEvent(new CustomEvent('moveCameraToTop'));
                }}
            >
                {/* Padded yard dimensions (extends beyond original with padding) */}
                {yardGeometries ? (
                    <primitive object={yardGeometries.baseGeometry} attach="geometry" />
                ) : (
                    <planeGeometry args={[yardBounds.paddedWidth, yardBounds.paddedHeight]} />
                )}
                <meshStandardMaterial
                    color="#3A4A5A"
                    roughness={0.85}
                    metalness={0.05}
                />
            </mesh>

            {/* Border Outline - Hidden */}
            <group visible={false}>
                {yardGeometries && yardBounds.cornerPoints ? (
                    /* Polygon border using Line component */
                    <Line
                        points={[...yardBounds.cornerPoints.map(pt => [pt.x, -0.3, pt.z] as [number, number, number]), [yardBounds.cornerPoints[0].x, -0.3, yardBounds.cornerPoints[0].z]]}
                        color="#F7CF9B"
                        lineWidth={3}
                    />
                ) : (
                    /* Rectangular border using four line segments */
                    <>
                        {/* North edge */}
                        <mesh position={[0, -0.35, yardBounds.minZ]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[yardBounds.width, 0.5]} />
                            <meshBasicMaterial color="#F7CF9B" />
                        </mesh>
                        {/* South edge */}
                        <mesh position={[0, -0.35, yardBounds.maxZ]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[yardBounds.width, 0.5]} />
                            <meshBasicMaterial color="#F7CF9B" />
                        </mesh>
                        {/* West edge */}
                        <mesh position={[yardBounds.minX, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.5, yardBounds.height]} />
                            <meshBasicMaterial color="#F7CF9B" />
                        </mesh>
                        {/* East edge */}
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

