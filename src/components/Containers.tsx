import { useRef, useEffect, useMemo, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/store';
import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

interface ContainersProps {
    count?: number;
    controlsRef?: RefObject<any>;
    onReady?: () => void;
}

export function Containers({ count, controlsRef, onReady }: ContainersProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const opacityAttribute = useRef<THREE.InstancedBufferAttribute | null>(null);
    const ids = useStore(state => state.ids);
    const entities = useStore(state => state.entities);
    const selectId = useStore(state => state.selectId);

    const { camera } = useThree();
    const [isAnimating, setIsAnimating] = useState(false);
    const targetCameraPos = useRef(new THREE.Vector3());
    const targetControlsTarget = useRef(new THREE.Vector3());

    // Load texture once with optimization
    const texture = useTexture('/textures/container_side.png', (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        tex.generateMipmaps = true;
    });

    // Realistic Industrial Color Palette (Mid-bright tones)
    const containerColors = useMemo(() => [
        0x4F7F7F, // Teal Gray
        0x2E5AAF, // Deeper Royal Blue
        0xB85D26, // Burnt Sienna
        0x829D2A, // Yellowish Olive
        0xBF3F3F, // Crimson Red
        0x70A7C8, // Cornflower Blue
        0xE09249, // Copper Orange
        0x90A2B7  // Cool Gray
    ], []);

    // Memoize instance data with scaling for 40ft containers
    const instanceData = useMemo(() => {
        return ids.map(id => {
            const e = entities[id];
            const color = new THREE.Color();

            // Always use deterministic color
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const colorIndex = hash % containerColors.length;
            color.setHex(containerColors[colorIndex]);

            // Determine scale based on type (20ft vs 40ft)
            const type = e?.type || '20ft';
            // 40ft is roughly 2x 20ft (12.192m vs 6.058m)
            // Exact ratio: 12.192 / 6.058 = 2.0125
            const scaleX = type === '40ft' ? 2.0125 : 1;

            return {
                position: [e?.x || 0, e?.y || 0, e?.z || 0] as [number, number, number],
                color: color,
                id: id,
                scale: [scaleX, 1, 1] as [number, number, number],
                type: type
            };
        });
    }, [ids, entities, containerColors]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Get selected container and find topmost in stack
    const selectedContainerInfo = useMemo(() => {
        if (!selectId) return null;

        const selected = instanceData.find(d => d.id === selectId);
        if (!selected) return null;

        // Find all containers at the same X, Z position (same lot/stack)
        const stackContainers = instanceData.filter(d =>
            Math.abs(d.position[0] - selected.position[0]) < 0.1 &&
            Math.abs(d.position[2] - selected.position[2]) < 0.1
        );

        // Find the topmost container (highest Y)
        const topmost = stackContainers.reduce((highest, current) =>
            current.position[1] > highest.position[1] ? current : highest
            , stackContainers[0]);

        return {
            selected,
            topmost,
            labelPosition: [
                topmost.position[0],
                topmost.position[1] + 2.5,
                topmost.position[2]
            ] as [number, number, number]
        };
    }, [selectId, instanceData]);

    // Update instance matrices and TRUE transparency
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh || instanceData.length === 0) return;

        const selectedPos = selectedContainerInfo?.selected?.position;

        // Create or update opacity attribute
        if (!opacityAttribute.current) {
            const opacities = new Float32Array(instanceData.length);
            opacityAttribute.current = new THREE.InstancedBufferAttribute(opacities, 1);
            mesh.geometry.setAttribute('instanceOpacity', opacityAttribute.current);
        }

        instanceData.forEach((data, i) => {
            const [x, y, z] = data.position;
            dummy.position.set(x, y, z);
            // Apply scale for 40ft containers
            dummy.scale.set(data.scale[0], data.scale[1], data.scale[2]);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);

            // Calculate TRUE opacity based on distance
            let opacity = 1.0;
            if (selectedPos && data.id !== selectId) {
                const dx = x - selectedPos[0];
                const dz = z - selectedPos[2];
                const distance = Math.sqrt(dx * dx + dz * dz);

                // Make nearby containers truly transparent (within 15m)
                if (distance < 15) {
                    opacity = 0.2; // 20% opacity (80% see-through)
                }
            }

            // Keep original colors
            mesh.setColorAt(i, data.color);

            // Set per-instance opacity
            if (opacityAttribute.current) {
                opacityAttribute.current.setX(i, opacity);
            }
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (opacityAttribute.current) opacityAttribute.current.needsUpdate = true;

        // Signal that the scene is ready
        if (onReady) {
            onReady();
        }
    }, [instanceData, dummy, selectedContainerInfo, selectId, onReady]);

    // Trigger camera animation when container is selected
    useEffect(() => {
        if (!selectedContainerInfo || !controlsRef?.current) return;

        // Cancel any other animations first
        window.dispatchEvent(new CustomEvent('cancelAnimations', { detail: { source: 'containerFocus' } }));

        const containerPos = selectedContainerInfo.selected.position;

        const zoffset = 8;
        const xoffset = 5;
        // Position camera along Z axis to see the X-Y face (Long side) for clear number visibility
        // Lower height to be more level with the container
        targetCameraPos.current.set(
            containerPos[0] + xoffset,
            containerPos[1] + 8,
            containerPos[2] + zoffset
        );

        targetControlsTarget.current.set(containerPos[0], containerPos[1], containerPos[2]);
        setIsAnimating(true);
    }, [selectedContainerInfo, controlsRef]);

    // Listen for animation cancellations from other sources
    useEffect(() => {
        const handleCancelAnimations = (e: any) => {
            // If another animation is starting, cancel this one
            if (e.detail?.source !== 'containerFocus' && isAnimating) {
                setIsAnimating(false);
            }
        };

        window.addEventListener('cancelAnimations', handleCancelAnimations);
        return () => window.removeEventListener('cancelAnimations', handleCancelAnimations);
    }, [isAnimating]);

    // ESC key to deselect
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && selectId) {
                useStore.getState().setSelectId(null);
                setIsAnimating(false); // Stop camera animation
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectId]);

    const dragStart = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: any) => {
        // Store start position for click vs drag check
        dragStart.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: any) => {
        e.stopPropagation();

        // Calculate distance moved
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If moved more than 5 pixels, it's a drag (rotation), not a click
        if (distance > 5) {
            return;
        }

        const instanceId = e.instanceId;
        if (instanceId !== undefined && ids[instanceId]) {
            console.log('Container clicked:', ids[instanceId]);
            useStore.getState().setSelectId(ids[instanceId]);
        }
    };

    const handlePointerOver = (e: any) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
    };

    const handleGroundClick = () => {
        if (selectId) {
            useStore.getState().setSelectId(null);
            setIsAnimating(false); // Stop camera animation
        }
    };

    const handlePointerOut = () => {
        document.body.style.cursor = 'auto';
    };

    const blinkingMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

    // Camera animation and blinking effect
    useFrame((state) => {
        // Camera animation
        if (isAnimating && controlsRef?.current) {
            const lerpFactor = 0.05;

            camera.position.lerp(targetCameraPos.current, lerpFactor);
            const currentTarget = controlsRef.current.target;
            currentTarget.lerp(targetControlsTarget.current, lerpFactor);

            const camDistance = camera.position.distanceTo(targetCameraPos.current);
            const targetDistance = currentTarget.distanceTo(targetControlsTarget.current);

            if (camDistance < 0.1 && targetDistance < 0.1) {
                setIsAnimating(false);
            }
        }

        // Blinking effect for selected container
        if (blinkingMaterialRef.current) {
            const time = state.clock.elapsedTime;
            // Pulse opacity between 0.3 and 0.6
            const blink = 0.5 + 0.5 * Math.sin(time * 3);
            blinkingMaterialRef.current.opacity = 0.1 + 0.3 * blink;
            blinkingMaterialRef.current.emissiveIntensity = 0.2 + 0.5 * blink;
        }
    });

    if (ids.length === 0) {
        return null;
    }

    return (
        <group onClick={handleGroundClick}>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, Math.max(count || 0, ids.length)]}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                frustumCulled={true}
            >
                <boxGeometry args={[6.058, 2.591, 2.438]} />
                <meshStandardMaterial
                    map={texture}
                    metalness={0.4}
                    roughness={0.6}
                    color="#ffffff"
                    transparent={true}
                    depthWrite={true}
                    onBeforeCompile={(shader) => {
                        // Inject instance opacity attribute into shader
                        shader.vertexShader = shader.vertexShader.replace(
                            '#include <common>',
                            `#include <common>
                            attribute float instanceOpacity;
                            varying float vInstanceOpacity;`
                        );
                        shader.vertexShader = shader.vertexShader.replace(
                            '#include <begin_vertex>',
                            `#include <begin_vertex>
                            vInstanceOpacity = instanceOpacity;`
                        );
                        shader.fragmentShader = shader.fragmentShader.replace(
                            '#include <common>',
                            `#include <common>
                            varying float vInstanceOpacity;`
                        );
                        shader.fragmentShader = shader.fragmentShader.replace(
                            '#include <opaque_fragment>',
                            `#include <opaque_fragment>
                            gl_FragColor.a *= vInstanceOpacity;`
                        );
                    }}
                />
            </instancedMesh>

            {/* Blinking overlay for selected container */}
            {selectedContainerInfo && (
                <mesh
                    position={selectedContainerInfo.selected.position}
                    scale={selectedContainerInfo.selected.scale}
                >
                    <boxGeometry args={[6.07, 2.61, 2.45]} /> {/* Slightly larger than container */}
                    <meshStandardMaterial
                        ref={blinkingMaterialRef}
                        color="#ffff00"
                        transparent={true}
                        opacity={0.3}
                        emissive="#ffff00"
                        emissiveIntensity={0.5}
                        depthWrite={false} // Don't occlude internal details
                    />
                </mesh>
            )}

            {/* Highlight 8 edges of selected container */}
            {selectedContainerInfo && (
                <lineSegments
                    position={selectedContainerInfo.selected.position}
                    scale={selectedContainerInfo.selected.scale}
                >
                    <edgesGeometry args={[new THREE.BoxGeometry(6.058, 2.591, 2.438)]} />
                    <lineBasicMaterial color="#ffff00" linewidth={2} />
                </lineSegments>
            )}

        </group>
    );
}
