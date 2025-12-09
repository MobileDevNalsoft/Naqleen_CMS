import { Sky } from '@react-three/drei';
import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from '../../store/store';

// --- Shared Geometries ---
const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, 2.4, 8);
const foliage1Geometry = new THREE.ConeGeometry(1.8, 3.5, 8);
const foliage2Geometry = new THREE.ConeGeometry(1.4, 2.8, 8);
const foliage3Geometry = new THREE.ConeGeometry(1, 2, 8);
const foliage4Geometry = new THREE.ConeGeometry(0.6, 1.2, 8);

const warehouseBodyGeometry = new THREE.BoxGeometry(15, 8, 25);
const warehouseDoorGeometry = new THREE.PlaneGeometry(6, 4);

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

const hillGeometry = new THREE.SphereGeometry(10, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

// --- Shared Materials ---
const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#4A3728", roughness: 0.95 });
const foliageDarkMaterial = new THREE.MeshStandardMaterial({ color: "#1B4D0E", roughness: 0.8, flatShading: true });
const foliageLightMaterial = new THREE.MeshStandardMaterial({ color: "#2A5A1C", roughness: 0.8, flatShading: true });
const foliage2Material = new THREE.MeshStandardMaterial({ color: "#3D6B2E", roughness: 0.75, flatShading: true });
const foliage3Material = new THREE.MeshStandardMaterial({ color: "#4F7D3A", roughness: 0.7, flatShading: true });
const foliage4Material = new THREE.MeshStandardMaterial({ color: "#628F46", roughness: 0.65, flatShading: true });

const warehouseRoofMaterial = new THREE.MeshStandardMaterial({ color: "#4A5568", roughness: 0.4, metalness: 0.4 });
const warehouseDoorMaterial = new THREE.MeshStandardMaterial({ color: "#2D3748", roughness: 0.7 });

// Pre-create warehouse body materials
const warehouseColors = ['#6B7280', '#8B95A0', '#9CA3AF', '#B0B7BE', '#7B8794'];
const warehouseMaterials = warehouseColors.map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15 })
);

// Pre-create hill materials
const hillColors = ['#E6D5AC', '#D2B48C', '#C2B280', '#BDB76B', '#8B4513', '#A0522D'];
const hillMaterials = hillColors.map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
);


// More realistic tree with better proportions and wind animation
const Tree = ({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    const foliageRef = useRef<THREE.Group>(null);
    const foliageVariation = useMemo(() => Math.random(), []);
    const offset = useMemo(() => Math.random() * 100, []); // Random phase for wind

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const swaySpeed = 0.8;
        const swayAmount = 0.05;

        // Base sway (trunk moves slightly)
        if (groupRef.current) {
            groupRef.current.rotation.z = Math.sin(time * swaySpeed + offset) * swayAmount;
            groupRef.current.rotation.x = Math.cos(time * (swaySpeed * 0.7) + offset) * swayAmount;
        }

        // Foliage sway (moves MORE than trunk, creating a curve effect)
        if (foliageRef.current) {
            foliageRef.current.rotation.z = Math.sin(time * swaySpeed + offset) * (swayAmount * 2);
            foliageRef.current.rotation.x = Math.cos(time * (swaySpeed * 0.7) + offset) * (swayAmount * 2);
        }
    });

    return (
        <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
            {/* Trunk - Natural bark brown with slight taper */}
            <mesh position={[0, 1.2, 0]} castShadow receiveShadow geometry={trunkGeometry} material={trunkMaterial} />

            {/* Foliage Group - Pivoted at top of trunk (y=2.4) for curved bending */}
            <group ref={foliageRef} position={[0, 2.4, 0]}>
                {/* Main foliage - Dense, realistic green */}
                <mesh
                    position={[0, 1.1, 0]}
                    castShadow
                    receiveShadow
                    geometry={foliage1Geometry}
                    material={foliageVariation > 0.5 ? foliageDarkMaterial : foliageLightMaterial}
                />
                <mesh position={[0, 2.8, 0]} castShadow receiveShadow geometry={foliage2Geometry} material={foliage2Material} />
                <mesh position={[0, 4.1, 0]} castShadow receiveShadow geometry={foliage3Geometry} material={foliage3Material} />
                <mesh position={[0, 5.1, 0]} castShadow receiveShadow geometry={foliage4Geometry} material={foliage4Material} />
            </group>
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

// Smooth rolling hill matching reference
const Hill = ({ position, scale = 1, colorIndex = 0 }: { position: [number, number, number]; scale?: number; colorIndex?: number }) => {
    return (
        <mesh
            position={position}
            scale={[scale, scale * 0.4, scale]}
            receiveShadow
            castShadow
            geometry={hillGeometry}
            material={hillMaterials[colorIndex % hillMaterials.length]}
        />
    );
};

// Helper function to calculate terrain height at a given x, z position
// This ensures that objects (trees, warehouses) are placed on the ground
const getTerrainHeight = (x: number, z: number) => {
    const centerFlatRadius = 250; // Radius of flat area for icd
    const blendDistance = 150;    // Distance to blend from flat to hills
    const distance = Math.sqrt(x * x + z * z);

    if (distance <= centerFlatRadius) return 0;

    const blend = Math.min(1, (distance - centerFlatRadius) / blendDistance);
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
    const { scene } = useThree();
    const terrainRef = useRef<THREE.Mesh>(null);
    const dragStart = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: any) => {
        // Store start position for click vs drag check
        dragStart.current = { x: e.clientX, y: e.clientY };
    };

    // Enhanced fog - Linear fog to keep icd clear but hide horizon
    useEffect(() => {
        scene.fog = new THREE.Fog(
            '#E6F4F1', // Matches sky/background
            300,       // Start fog further away (clear icd)
            800        // End fog at edge of terrain
        );
        return () => { scene.fog = null; };
    }, [scene]);

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
                const height = getTerrainHeight(x, y);

                // Set the Z coordinate (which is Up in our rotated mesh)
                positions.setZ(i, height);
            }

            positions.needsUpdate = true;
            geometry.computeVertexNormals();
        }
    }, []);

    // Generate more realistic surroundings - adjusted for larger terrain
    const surroundings = useMemo(() => {
        const items = [];

        // Trees with more natural distribution across larger area
        for (let i = 0; i < 80; i++) {
            const angle = (Math.random() * Math.PI * 2);
            // Increased min radius to 240 to ensure trees don't spawn inside the 400x185 icd fencing
            const radius = 240 + Math.random() * 250;
            // Cluster some trees together for realism
            const clusterOffset = Math.random() < 0.3 ? {
                x: (Math.random() - 0.5) * 15,
                z: (Math.random() - 0.5) * 15
            } : { x: 0, z: 0 };

            const x = Math.cos(angle) * radius + clusterOffset.x;
            const z = Math.sin(angle) * radius + clusterOffset.z;
            const y = getTerrainHeight(x, z);

            items.push({
                type: 'tree',
                position: [x, y, z] as [number, number, number],
                // Increased scale for bigger trees (1.5x - 2.5x)
                scale: 1.5 + Math.random() * 1.0,
            });
        }

        // Warehouses with realistic variety
        for (let i = 0; i < 15; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const radius = 280 + Math.random() * 120;

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = getTerrainHeight(x, z);

            items.push({
                type: 'warehouse',
                position: [x, y, z] as [number, number, number],
                rotation: Math.random() * Math.PI,
                colorIndex: Math.floor(Math.random() * warehouseColors.length),
            });
        }

        // Hills with natural sand and desert tones
        for (let i = 0; i < 35; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const radius = 350 + Math.random() * 350;

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            // Sink hills slightly into the terrain so they look like peaks emerging
            const y = getTerrainHeight(x, z) - 2;

            items.push({
                type: 'hill',
                position: [x, y, z] as [number, number, number],
                scale: 2.5 + Math.random() * 5,
                colorIndex: Math.floor(Math.random() * hillColors.length),
            });
        }

        return items;
    }, []);

    return (
        <group>
            {/* Force background color to match fog/sky for seamless bright look */}
            <color attach="background" args={['#E6F4F1']} />

            {/* Hemisphere sky dome with realistic appearance - Day Mode */}
            <Sky
                sunPosition={[100, 100, 100]} // High noon sun for maximum brightness
                turbidity={0.6}               // Low turbidity = clear air, less muddy
                rayleigh={0.6}                // Balanced rayleigh for realistic blue
                mieCoefficient={0.005}
                mieDirectionalG={0.7}
                inclination={0.5}
                azimuth={0.25}
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
            {/* <mesh
                ref={terrainRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -1.0, 0]}
                receiveShadow
            > */}
            {/* High resolution plane for smooth organic terrain */}
            {/* <planeGeometry args={[2000, 2000, 128, 128]} />
                <meshStandardMaterial
                    color="#86BD5E"
                    roughness={0.9}
                    metalness={0.05}
                /> */}
                // flatShading={false} // Ensure smooth shading
            {/* </mesh> */}

            {/* Render Generated Surroundings */}
            {/* {surroundings.map((item, idx) => {
                if (item.type === 'tree') return <Tree key={idx} position={item.position} scale={item.scale} />;
                if (item.type === 'warehouse') return <Warehouse key={idx} position={item.position} rotation={item.rotation} colorIndex={item.colorIndex} />;
                if (item.type === 'hill') return <Hill key={idx} position={item.position} scale={item.scale} colorIndex={item.colorIndex} />;
                return null;
            })} */}

            {/* Unified Icd Base Plane */}
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
                {/* Matches fence dimensions: Width 400, Depth 185 */}
                <planeGeometry args={[400, 185]} />
                <meshStandardMaterial
                    color="#5A6C7D"
                    roughness={0.8}
                    metalness={0.08}
                />
                {/* Yard Border */}
                <lineSegments position={[0, 0, 0.01]}>
                    <edgesGeometry args={[new THREE.PlaneGeometry(400, 185)]} />
                    <lineBasicMaterial color="#8B9AA8" linewidth={2} />
                </lineSegments>
            </mesh>
        </group>
    );
}
