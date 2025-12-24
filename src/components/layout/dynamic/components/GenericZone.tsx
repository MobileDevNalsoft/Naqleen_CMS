import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface GenericZoneProps {
    id: string;
    type: string;
    position: [number, number, number];
    rotation: number;
    dimensions: { width: number; height: number };
    corner_points?: Array<{ x: number; z: number }>;
    color?: string;
    opacity?: number;
    description?: string;
    // Selection state for dimming logic
    isDimmed?: boolean;
}

const GenericZone: React.FC<GenericZoneProps> = ({
    id: _id,
    type,
    position,
    rotation,
    dimensions,
    corner_points,
    color = '#9E9E9E',
    opacity = 0.3,
    isDimmed = false
}) => {
    const isYardBase = type === 'yard_base';
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    const geometry = useMemo(() => {
        if (corner_points && corner_points.length > 0) {
            const shape = new THREE.Shape();
            const points = corner_points;

            if (points.length > 0) {
                // Points absolute -> relative
                shape.moveTo(points[0].x - position[0], points[0].z - position[2]);
                for (let i = 1; i < points.length; i++) {
                    shape.lineTo(points[i].x - position[0], points[i].z - position[2]);
                }
                shape.lineTo(points[0].x - position[0], points[0].z - position[2]);
            }

            return new THREE.ShapeGeometry(shape);
        } else {
            return new THREE.PlaneGeometry(dimensions.width, dimensions.height);
        }
    }, [corner_points, dimensions, position]);

    useFrame((_, delta) => {
        if (materialRef.current) {
            // Opacity Animation (Ghost Mode)
            const targetOpacity = isDimmed ? 0.1 : opacity;
            materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, targetOpacity, delta * 5);
        }
    });

    // Hide visual representation for terminal areas as requested
    if (type.includes('terminal')) {
        return null;
    }

    return (
        <mesh
            ref={meshRef}
            position={position}
            rotation={[-Math.PI / 2, rotation || 0, 0]}
            receiveShadow={isYardBase}
        >
            <primitive object={geometry} />
            <meshStandardMaterial
                ref={materialRef}
                color={color}
                transparent={true}
                opacity={opacity}
                side={THREE.DoubleSide}
                roughness={0.9}
                metalness={0.1}
            />
        </mesh>
    );
};

export default GenericZone;
