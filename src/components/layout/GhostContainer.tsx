import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store/store';

/**
 * GhostContainer - Renders a semi-transparent pulsing container at the ghost position
 * Used to preview container placement in the 3D view before confirming
 */
export default function GhostContainer() {
    const ghostContainer = useStore(state => state.ghostContainer);
    const layout = useStore(state => state.layout);
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    // Calculate rotation based on block
    const rotation = useMemo(() => {
        if (!ghostContainer || !layout) return 0;

        const blockEntity = layout.entities?.find(e => e.id === ghostContainer.blockId);
        if (blockEntity?.rotation) {
            return (blockEntity.rotation * Math.PI) / 180;
        }
        return 0;
    }, [ghostContainer, layout]);

    // Container dimensions
    const dimensions = useMemo(() => {
        if (!ghostContainer?.containerType) return { length: 6.058, width: 2.438, height: 2.591 }; // Default to 20ft

        const type = String(ghostContainer.containerType).toLowerCase();
        // Check for 20ft variations (20, 20ft, 20gp, etc.)
        const is20ft = type.startsWith('2');

        return {
            length: is20ft ? 6.058 : 12.192,
            width: 2.438,
            height: is20ft ? 2.591 : 2.896
        };
    }, [ghostContainer?.containerType]);

    // Pulsing animation
    useFrame(({ clock }) => {
        if (materialRef.current && ghostContainer) {
            // Pulse opacity between 0.3 and 0.6
            const pulse = Math.sin(clock.elapsedTime * 3) * 0.15 + 0.45;
            materialRef.current.opacity = pulse;

            // Slight scale pulse for visual feedback
            if (meshRef.current) {
                const scale = 1 + Math.sin(clock.elapsedTime * 2) * 0.02;
                meshRef.current.scale.setScalar(scale);
            }
        }
    });

    if (!ghostContainer) return null;

    return (
        <mesh
            ref={meshRef}
            position={[ghostContainer.x, ghostContainer.y, ghostContainer.z]}
            rotation={[0, rotation, 0]}
        >
            <boxGeometry args={[dimensions.length, dimensions.height, dimensions.width]} />
            <meshStandardMaterial
                ref={materialRef}
                color="#22c55e"
                transparent
                opacity={0.5}
                emissive="#22c55e"
                emissiveIntensity={0.3}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}
