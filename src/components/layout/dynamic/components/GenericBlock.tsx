import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import '../../items/GradientMaterial'; // Ensure side-effects run

interface GenericBlockProps {
    id: string;
    position: [number, number, number];
    rotation: number;
    dimensions?: { width: number; height: number }; // Made optional
    corner_points?: Array<{ x: number; z: number }>;
    isSelected: boolean;
    color?: string; // Optional override
    props?: Record<string, any>; // For calculating dimensions from lots/rows
}

const GenericBlock: React.FC<GenericBlockProps> = ({ id: _id, position, rotation, dimensions, corner_points, isSelected, color: _color, props }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Extrusion settings
    const extrusionHeight = 16;
    const extrudeSettings = useMemo(() => ({
        depth: extrusionHeight,
        bevelEnabled: false
    }), []);

    // Calculate dimensions from props if not provided
    // If block_width and block_depth are specified, use those fixed values
    const effectiveDimensions = useMemo(() => {
        if (dimensions?.width && dimensions?.height) {
            return dimensions;
        }

        // If explicit block dimensions are provided, use them
        if (props?.block_width && props?.block_depth) {
            return { width: props.block_width, height: props.block_depth };
        }

        // Otherwise calculate from lots/rows using container dimensions
        const lots = props?.lots || 1;
        const rows = props?.rows || 1;
        const containerType = props?.container_type || '20ft';
        const is20ft = containerType === '20ft';
        const containerLength = is20ft ? 6.058 : 12.192;
        const containerWidth = 2.438;
        const gapX = props?.lot_gap || 0.5;
        const gapZ = 0.3;

        const width = lots * containerLength + (lots - 1) * gapX;
        const height = rows * (containerWidth + gapZ);

        return { width, height };
    }, [dimensions, props]);

    const shape = useMemo(() => {
        const s = new THREE.Shape();
        if (corner_points && corner_points.length > 0) {
            const points = corner_points;
            // Points are relative to WORLD 0,0 usually in the JSON, but position is the center??
            // In the original code: s.moveTo(points[0].x - terminal.position.x, ...)
            // Use the same logic: points are absolute, we make them relative to object position

            s.moveTo(points[0].x - position[0], points[0].z - position[2]);
            for (let i = 1; i < points.length; i++) {
                s.lineTo(points[i].x - position[0], points[i].z - position[2]);
            }
            s.lineTo(points[0].x - position[0], points[0].z - position[2]);
        } else {
            // Rectangular shape centered
            const w = effectiveDimensions.width;
            const h = effectiveDimensions.height;
            s.moveTo(-w / 2, -h / 2);
            s.lineTo(w / 2, -h / 2);
            s.lineTo(w / 2, h / 2);
            s.lineTo(-w / 2, h / 2);
            s.lineTo(-w / 2, -h / 2);
        }
        return s;
    }, [position, effectiveDimensions, corner_points]);

    useFrame((_, delta) => {
        if (materialRef.current && meshRef.current) {
            const targetOpacity = isSelected ? 0.2 : 0;
            // If we want it to be visible ALWAYS (not just when selected) but dimmer? 
            // The original code only showed it when selected or ghost mode?
            // "visible={isSelected}" was in original code layoutbuilder:136
            // But verify: "Render Blocks (Glowing when selected, otherwise invisible)"
            // Yes, invisible unless selected.

            const lerpSpeed = delta * 2;

            // Smoothly interpolate opacity
            materialRef.current.uniforms.opacity.value = THREE.MathUtils.lerp(
                materialRef.current.uniforms.opacity.value,
                targetOpacity,
                lerpSpeed
            );

            // Toggle visibility based on opacity to save draw calls
            if (materialRef.current.uniforms.opacity.value < 0.01) {
                if (meshRef.current.visible) meshRef.current.visible = false;
            } else {
                if (!meshRef.current.visible) meshRef.current.visible = true;
            }
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            rotation={[-Math.PI / 2, rotation || 0, 0]}
            visible={isSelected} // Initial visibility
        >
            <extrudeGeometry args={[shape, extrudeSettings]} />
            {/* @ts-ignore */}
            <gradientMaterial
                ref={materialRef}
                color={new THREE.Color("#ffefda")}
                opacity={0} // Start invisible
                height={extrusionHeight}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};

export default GenericBlock;
