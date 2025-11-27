import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { useStore } from '../../store/store';

interface TerminalData {
    id: string;
    type: string;
    dimensions: { width: number; height: number };
    position: { x: number; y: number; z: number };
    rotation: number;
    corner_points?: Array<{ x: number; z: number; description?: string }>;
}

interface BlockData extends TerminalData {
    lots: number;
    rows: number;
    row_labels?: string[];
    lot_numbers?: number[];
    container_type: string;
}

// Terminal colors
const ZONE_COLORS: Record<string, { color: string; opacity: number }> = {
    container_block_a: { color: '#FF9800', opacity: 0.4 },
    container_block_b: { color: '#F44336', opacity: 0.4 },
    container_block_c: { color: '#9C27B0', opacity: 0.4 },
    container_block_d: { color: '#607D8B', opacity: 0.4 },
    road: { color: '#000000', opacity: 0.1 },
    access: { color: '#8BC34A', opacity: 0.3 },
    customhouse: { color: '#795548', opacity: 0.5 },
    toplift: { color: '#FFC107', opacity: 0.6 },
    yard_base: { color: '#393838', opacity: 1.0 },
};

// Custom Gradient Shader Material
const GradientMaterial = shaderMaterial(
    { color: new THREE.Color(0.2, 0.6, 1.0), opacity: 0.5, height: 5.0 },
    // Vertex Shader
    `
    varying float vHeight;
    void main() {
      vHeight = position.z; // Extrusion is along Z in local space
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment Shader
    `
    uniform vec3 color;
    uniform float opacity;
    uniform float height;
    varying float vHeight;
    void main() {
      // Fade from bottom (0) to top (height)
      float alpha = 1.0 - smoothstep(0.0, height, vHeight);
      
      // Add a bit of "rim" or "edge" glow at the bottom
      alpha = pow(alpha, 0.8); 
      
      gl_FragColor = vec4(color, alpha * opacity);
    }
    `
);

extend({ GradientMaterial });

// Add type definition for the custom material
declare global {
    namespace JSX {
        interface IntrinsicElements {
            gradientMaterial: any;
        }
    }
}

const GlowingBlock: React.FC<{ terminal: TerminalData; isSelected: boolean }> = ({ terminal, isSelected }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Extrusion settings
    const extrusionHeight = 16;
    const extrudeSettings = useMemo(() => ({
        depth: extrusionHeight,
        bevelEnabled: false
    }), []);

    const shape = useMemo(() => {
        const s = new THREE.Shape();
        if (terminal.corner_points && terminal.corner_points.length > 0) {
            const points = terminal.corner_points;
            s.moveTo(points[0].x - terminal.position.x, points[0].z - terminal.position.z);
            for (let i = 1; i < points.length; i++) {
                s.lineTo(points[i].x - terminal.position.x, points[i].z - terminal.position.z);
            }
            s.lineTo(points[0].x - terminal.position.x, points[0].z - terminal.position.z);
        } else {
            // Rectangular shape centered
            const w = terminal.dimensions.width;
            const h = terminal.dimensions.height;
            s.moveTo(-w / 2, -h / 2);
            s.lineTo(w / 2, -h / 2);
            s.lineTo(w / 2, h / 2);
            s.lineTo(-w / 2, h / 2);
            s.lineTo(-w / 2, -h / 2);
        }
        return s;
    }, [terminal]);

    useFrame((_, delta) => {
        if (materialRef.current && meshRef.current) {
            const targetOpacity = isSelected ? 0.2 : 0;
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
            position={[terminal.position.x, terminal.position.y, terminal.position.z]}
            rotation={[-Math.PI / 2, terminal.rotation || 0, 0]}
            visible={isSelected} // Initial visibility
        >
            <extrudeGeometry args={[shape, extrudeSettings]} />
            {/* @ts-ignore */}
            <gradientMaterial
                ref={materialRef}
                color={new THREE.Color("#ffefdaff")}
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

const Terminal: React.FC<{ terminal: TerminalData; isDimmed: boolean }> = ({ terminal, isDimmed }) => {
    // Skip rendering TRS and TRM terminals
    if (terminal.type === 'trs_terminal' || terminal.type === 'trm_terminal') {
        return null;
    }

    const config = ZONE_COLORS[terminal.type] || { color: '#9E9E9E', opacity: 0.3 };
    const isYardBase = terminal.type === 'yard_base';
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    const geometry = useMemo(() => {
        if (terminal.corner_points) {
            const shape = new THREE.Shape();
            const points = terminal.corner_points;

            if (points.length > 0) {
                shape.moveTo(points[0].x - terminal.position.x, points[0].z - terminal.position.z);
                for (let i = 1; i < points.length; i++) {
                    shape.lineTo(points[i].x - terminal.position.x, points[i].z - terminal.position.z);
                }
                shape.lineTo(points[0].x - terminal.position.x, points[0].z - terminal.position.z);
            }

            return new THREE.ShapeGeometry(shape);
        } else {
            return new THREE.PlaneGeometry(terminal.dimensions.width, terminal.dimensions.height);
        }
    }, [terminal]);

    useFrame((state, delta) => {
        if (materialRef.current) {
            // Opacity Animation (Ghost Mode)
            const targetOpacity = isDimmed ? 0.1 : config.opacity;
            materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, targetOpacity, delta * 5);
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={[terminal.position.x, terminal.position.y, terminal.position.z]}
            rotation={[-Math.PI / 2, terminal.rotation || 0, 0]}
            receiveShadow={isYardBase}
        >
            <primitive object={geometry} />
            <meshStandardMaterial
                ref={materialRef}
                color={config.color}
                transparent={true}
                opacity={config.opacity}
                side={THREE.DoubleSide}
                roughness={0.9}
                metalness={0.1}
            />
        </mesh>
    );
};

const LayoutBuilder: React.FC = () => {
    const layoutData = useStore((state) => state.layout);
    const selectedBlock = useStore((state) => state.selectedBlock);

    const terminals = useMemo(() => {
        if (!layoutData) return { terminals: [], blocks: [] };

        const allTerminals: TerminalData[] = [];
        const blocks: BlockData[] = [];

        // Flatten terminals from all categories
        const flattenTerminals = (obj: any) => {
            if (Array.isArray(obj)) {
                obj.forEach(item => flattenTerminals(item));
            } else if (obj && typeof obj === 'object') {
                if ((obj.dimensions && obj.position) || (obj.type === 'yard_base' && obj.corner_points && obj.position)) {
                    if (obj.lots && obj.rows) {
                        blocks.push(obj);
                    } else {
                        allTerminals.push(obj);
                    }
                } else {
                    Object.values(obj).forEach(flattenTerminals);
                }
            }
        };

        flattenTerminals(layoutData.terminals);

        return { terminals: allTerminals, blocks };
    }, [layoutData]);

    if (!layoutData) return null;

    return (
        <group>
            {/* Render terminals (Roads, etc.) */}
            {terminals.terminals.map((terminal) => {
                const isSelected = terminal.id === selectedBlock;
                const isDimmed = !!selectedBlock && !isSelected && terminal.type !== 'yard_base';
                return <Terminal key={terminal.id} terminal={terminal} isDimmed={isDimmed} />;
            })}

            {/* Render Blocks (Glowing when selected, otherwise invisible) */}
            {terminals.blocks.map((block) => {
                const isSelected = block.id === selectedBlock;
                return <GlowingBlock key={block.id} terminal={block} isSelected={isSelected} />;
            })}
        </group>
    );
};

export default LayoutBuilder;
