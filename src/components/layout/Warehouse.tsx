import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface WarehouseProps {
    id: string;
    name: string;
    position: [number, number, number];
    width: number;
    depth: number;
    rotation?: number;
}

// Warehouse Component with 3D name label
const Warehouse: React.FC<WarehouseProps> = ({ name, position, width, depth, rotation = 0 }) => {
    const [x, y, z] = position;
    const height = 10; // Larger height for warehouses

    // Materials - Industrial warehouse colors
    const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#78716C', // Warm gray
        roughness: 0.8,
        metalness: 0.1
    }), []);

    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#57534E', // Dark warm gray
        roughness: 0.9,
        metalness: 0.2
    }), []);

    const doorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#292524', // Almost black
        roughness: 0.4,
        metalness: 0.5
    }), []);

    const stripeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#FCD34D', // Safety yellow
        roughness: 0.6
    }), []);

    const concreteMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#A8A29E',
        roughness: 0.95
    }), []);

    return (
        <group position={[x, y, z]} rotation={[0, rotation * Math.PI / 180, 0]}>
            {/* Main Building Structure */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={wallMaterial}>
                <boxGeometry args={[width, height, depth]} />
            </mesh>

            {/* Pitched Roof */}
            <mesh position={[0, height + 1.5, 0]} castShadow receiveShadow material={roofMaterial}>
                <boxGeometry args={[width + 1, 0.5, depth + 1]} />
            </mesh>

            {/* Roof ridge */}
            <mesh position={[0, height + 2, 0]} castShadow material={roofMaterial}>
                <boxGeometry args={[width - 2, 1, 2]} />
            </mesh>

            {/* Large Rolling Doors - front side */}
            {Array.from({ length: Math.floor(width / 15) }).map((_, i) => (
                <group key={`door-${i}`} position={[-width / 2 + 7.5 + i * 15, 3.5, depth / 2 + 0.1]}>
                    {/* Main door */}
                    <mesh material={doorMaterial}>
                        <boxGeometry args={[10, 7, 0.2]} />
                    </mesh>
                    {/* Horizontal lines on door */}
                    {[0, 1.5, 3, 4.5].map((offset, j) => (
                        <mesh key={`line-${j}`} position={[0, -3 + offset, 0.15]} material={stripeMaterial}>
                            <boxGeometry args={[9.5, 0.1, 0.1]} />
                        </mesh>
                    ))}
                </group>
            ))}

            {/* Safety stripes at base */}
            <mesh position={[0, 0.15, depth / 2 + 0.1]} material={stripeMaterial}>
                <boxGeometry args={[width, 0.3, 0.1]} />
            </mesh>

            {/* Concrete apron in front */}
            <mesh position={[0, 0.1, depth / 2 + 3]} receiveShadow material={concreteMaterial}>
                <boxGeometry args={[width + 4, 0.2, 6]} />
            </mesh>

            {/* Side windows (decorative) */}
            {Array.from({ length: Math.floor(depth / 8) }).map((_, i) => (
                <mesh
                    key={`window-${i}`}
                    position={[width / 2 + 0.1, height - 2, -depth / 2 + 4 + i * 8]}
                    material={new THREE.MeshStandardMaterial({ color: '#93C5FD', metalness: 0.9, roughness: 0.1 })}
                >
                    <boxGeometry args={[0.1, 2, 3]} />
                </mesh>
            ))}

            {/* 3D Floating Name Label */}
            <Text
                position={[0, height + 5, 0]}
                fontSize={3}
                color="#FFFFFF"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.15}
                outlineColor="#1F2937"
            >
                {name}
            </Text>
        </group>
    );
};

export default Warehouse;
