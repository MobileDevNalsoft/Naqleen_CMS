import { Sky, Stars } from '@react-three/drei';
import { useStore } from '../store/store';
import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

// More realistic tree with better proportions
const Tree = ({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) => {
    const foliageVariation = Math.random();
    return (
        <group position={position} scale={[scale, scale, scale]}>
            {/* Trunk - Natural bark brown with slight taper */}
            <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.15, 0.25, 2.4, 8]} />
                <meshStandardMaterial
                    color="#4A3728"
                    roughness={0.95}
                />
            </mesh>
            {/* Main foliage - Dense, realistic green */}
            <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
                <coneGeometry args={[1.8, 3.5, 8]} />
                <meshStandardMaterial
                    color={foliageVariation > 0.5 ? "#1B4D0E" : "#2A5A1C"}
                    roughness={0.8}
                    flatShading
                />
            </mesh>
            <mesh position={[0, 5.2, 0]} castShadow receiveShadow>
                <coneGeometry args={[1.4, 2.8, 8]} />
                <meshStandardMaterial
                    color="#3D6B2E"
                    roughness={0.75}
                    flatShading
                />
            </mesh>
            <mesh position={[0, 6.5, 0]} castShadow receiveShadow>
                <coneGeometry args={[1, 2, 8]} />
                <meshStandardMaterial
                    color="#4F7D3A"
                    roughness={0.7}
                    flatShading
                />
            </mesh>
            <mesh position={[0, 7.5, 0]} castShadow receiveShadow>
                <coneGeometry args={[0.6, 1.2, 8]} />
                <meshStandardMaterial
                    color="#628F46"
                    roughness={0.65}
                    flatShading
                />
            </mesh>
        </group>
    );
};

// Enhanced warehouse with more detail
const Warehouse = ({ position, rotation = 0, color = '#78909C' }: { position: [number, number, number]; rotation?: number; color?: string }) => (
    <group position={position} rotation={[0, rotation, 0]}>
        {/* Main Building */}
        <mesh position={[0, 4, 0]} castShadow receiveShadow>
            <boxGeometry args={[15, 8, 25]} />
            <meshStandardMaterial
                color={color}
                roughness={0.6}
                metalness={0.15}
            />
        </mesh>
        {/* Roof */}
        <mesh position={[0, 8.5, 0]} rotation={[0, 0, Math.PI / 4]} castShadow receiveShadow>
            <boxGeometry args={[6, 6, 25]} />
            <meshStandardMaterial
                color="#4A5568"
                roughness={0.4}
                metalness={0.4}
            />
        </mesh>
        {/* Door */}
        <mesh position={[0, 2, 12.6]}>
            <planeGeometry args={[6, 4]} />
            <meshStandardMaterial color="#2D3748" roughness={0.7} />
        </mesh>
    </group>
);

// More realistic hills/mountains with organic shapes
const Hill = ({ position, scale = 1, color = '#81C784' }: { position: [number, number, number]; scale?: number; color?: string }) => (
    <mesh position={position} scale={[scale, scale * 0.6, scale]} receiveShadow castShadow>
        <icosahedronGeometry args={[10, 1]} />
        <meshStandardMaterial
            color={color}
            roughness={0.98}
            flatShading
        />
    </mesh>
);

export default function Environment() {
    const layout = useStore((state) => state.layout);
    const { scene } = useThree();
    const terrainRef = useRef<THREE.Mesh>(null);

    // Enhanced fog - adjusted for larger circular terrain
    useEffect(() => {
        // Fog adjusted for larger terrain size
        scene.fog = new THREE.Fog(
            '#C0DAEB', // Lighter sky-matching blue
            250,       // Starts at mid-distance on larger terrain
            750        // Extends to far distance for smooth horizon fade
        );

        return () => {
            scene.fog = null;
        };
    }, [scene]);

    // Add subtle, realistic terrain undulation for circular terrain
    useEffect(() => {
        if (terrainRef.current) {
            const geometry = terrainRef.current.geometry as THREE.CircleGeometry;
            const positions = geometry.attributes.position;

            // Add gentle, natural rolling hills using radial coordinates
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const distance = Math.sqrt(x * x + y * y);
                const angle = Math.atan2(y, x);

                // Gentle rolling terrain with radial variation
                const wave1 = Math.sin(distance * 0.008 + angle * 3) * 0.6;
                const wave2 = Math.sin(distance * 0.012 - angle * 2) * 0.4;
                const radialWave = Math.sin(angle * 8) * 0.3;
                const noise = (Math.random() - 0.5) * 0.1;
                const fadeOut = Math.max(0, 1 - distance / 1200);

                positions.setZ(i, (wave1 + wave2 + radialWave + noise) * fadeOut);
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
            const radius = 200 + Math.random() * 250;
            // Cluster some trees together for realism
            const clusterOffset = Math.random() < 0.3 ? {
                x: (Math.random() - 0.5) * 15,
                z: (Math.random() - 0.5) * 15
            } : { x: 0, z: 0 };

            items.push({
                type: 'tree',
                position: [
                    Math.cos(angle) * radius + clusterOffset.x,
                    0,
                    Math.sin(angle) * radius + clusterOffset.z
                ] as [number, number, number],
                scale: 0.65 + Math.random() * 0.7,
            });
        }

        // Warehouses with realistic variety
        const warehouseColors = ['#6B7280', '#8B95A0', '#9CA3AF', '#B0B7BE', '#7B8794'];
        for (let i = 0; i < 15; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const radius = 280 + Math.random() * 120;
            items.push({
                type: 'warehouse',
                position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
                rotation: Math.random() * Math.PI,
                color: warehouseColors[Math.floor(Math.random() * warehouseColors.length)],
            });
        }

        // Hills with natural grass tones - more organic placement
        const hillColors = ['#6B9940', '#7CAA42', '#8DBB54', '#9ECC66', '#6FA842'];
        for (let i = 0; i < 35; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const radius = 350 + Math.random() * 350;
            items.push({
                type: 'hill',
                position: [
                    Math.cos(angle) * radius,
                    -3,
                    Math.sin(angle) * radius
                ] as [number, number, number],
                scale: 2.5 + Math.random() * 5,
                color: hillColors[Math.floor(Math.random() * hillColors.length)],
            });
        }

        return items;
    }, []);

    return (
        <group>
            {/* Hemisphere sky dome with realistic appearance */}
            <Sky
                sunPosition={[100, 80, 100]}
                turbidity={1.2}
                rayleigh={0.2}
                mieCoefficient={0.002}
                mieDirectionalG={0.85}
                inclination={0.49} // Creates hemisphere appearance
                azimuth={0.25}
            />
            <Stars radius={50} depth={100} count={1500} factor={5.5} saturation={0} fade speed={1} />

            {/* Natural daylight with warm tones */}
            <ambientLight intensity={0.55} color="#F0F8FF" />
            <directionalLight
                position={[120, 120, 60]}
                intensity={2.5}
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
                intensity={0.6}
                color="#C8E6FF"
            />

            {/* Large circular terrain with subtle rolling hills */}
            <mesh
                ref={terrainRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -1.0, 0]}
                receiveShadow
            >
                <circleGeometry args={[1200, 128]} />
                <meshStandardMaterial
                    color="#86BD5E"
                    roughness={0.94}
                    metalness={0.02}
                />
            </mesh>

            {/* Render Generated Surroundings */}
            {surroundings.map((item, idx) => {
                if (item.type === 'tree') return <Tree key={idx} position={item.position} scale={item.scale} />;
                if (item.type === 'warehouse') return <Warehouse key={idx} position={item.position} rotation={item.rotation} color={item.color} />;
                if (item.type === 'hill') return <Hill key={idx} position={item.position} scale={item.scale} color={item.color} />;
                return null;
            })}

            {/* Unified Terminal Base Plane */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.4, 0]}
                receiveShadow
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
