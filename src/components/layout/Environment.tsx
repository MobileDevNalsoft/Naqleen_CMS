import { Sky } from '@react-three/drei';
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

const hillGeometry = new THREE.SphereGeometry(10, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

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

// Pre-create hill materials
const hillColors = ['#8C8474', '#787265', '#6B6558', '#948D7F']; // Dusty earth tones
const hillMaterials = hillColors.map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
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

// Smooth rolling hill matching reference
// Dusty Mound / Debris Pile instead of Green Hill
const Hill = ({ position, scale = 1, colorIndex = 0 }: { position: [number, number, number]; scale?: number; colorIndex?: number }) => {
    return (
        <mesh
            position={position}
            scale={[scale, scale * 0.5, scale]} // Flatter, more spread out
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

    // Generate more realistic surroundings - adjusted for larger terrain
    const surroundings = useMemo(() => {
        const items = [];

        // Light Poles - Regular placing along perimeter/roads
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 220; // Just outside the main ICD fence
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = getTerrainHeight(x, z) - 1;

            items.push({
                type: 'lightPole',
                position: [x, y, z] as [number, number, number],
            });
        }

        // Background Container Stacks - Cluttered industrial look
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 250 + Math.random() * 200; // Further out
            // Avoid placing too close to light poles if possible, but random is okay for clutter
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = getTerrainHeight(x, z) - 1;

            items.push({
                type: 'bgContainer',
                position: [x, y, z] as [number, number, number],
                rotation: Math.random() * Math.PI,
            });
        }

        // Warehouses with realistic variety
        for (let i = 0; i < 15; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const radius = 280 + Math.random() * 120;

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = getTerrainHeight(x, z) - 1;

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
                    color="#3A4A5A"
                    roughness={0.85}
                    metalness={0.05}
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
