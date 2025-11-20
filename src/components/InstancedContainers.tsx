import { useRef, useEffect, useMemo, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/store';
import { useTexture, Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

interface InstancedContainersProps {
    count?: number;
    controlsRef?: RefObject<any>;
}

export default function InstancedContainers({ count, controlsRef }: InstancedContainersProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const borderRef = useRef<THREE.Mesh>(null);
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

    // Memoize instance data - NO color change on selection
    const instanceData = useMemo(() => {
        return ids.map(id => {
            const e = entities[id];
            const color = new THREE.Color();

            // Always use deterministic color
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const colorIndex = hash % containerColors.length;
            color.setHex(containerColors[colorIndex]);

            return {
                position: [e?.x || 0, e?.y || 0, e?.z || 0] as [number, number, number],
                color: color,
                id: id
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
    }, [instanceData, dummy, selectedContainerInfo, selectId]);

    // Trigger camera animation when container is selected
    useEffect(() => {
        if (!selectedContainerInfo || !controlsRef?.current) return;

        const containerPos = selectedContainerInfo.selected.position;

        const offset = 20;
        const angle = Math.PI / 4;

        targetCameraPos.current.set(
            containerPos[0] + offset * Math.cos(angle),
            containerPos[1] + 15,
            containerPos[2] + offset * Math.sin(angle)
        );

        targetControlsTarget.current.set(containerPos[0], containerPos[1], containerPos[2]);
        setIsAnimating(true);
    }, [selectedContainerInfo, controlsRef]);

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

    const handleClick = (e: any) => {
        e.stopPropagation();
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

    // Camera animation and shining dot animation
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

        // Shining dot animation
        if (!borderRef.current || !selectedContainerInfo || !selectedContainerInfo.selected) {
            return;
        }

        try {
            const w = 6.058 / 2;
            const h = 2.591 / 2;
            const d = 2.438 / 2;

            const speed = 0.3;
            const t = (state.clock.elapsedTime * speed) % 1;

            const bottomPerimeter = (w * 2 + d * 2) * 2;
            const topPerimeter = (w * 2 + d * 2) * 2;
            const verticalEdges = h * 2 * 4;
            const totalPerimeter = bottomPerimeter + verticalEdges + topPerimeter;

            const distance = t * totalPerimeter;

            let x = 0, y = 0, z = 0;

            const edge1 = w * 2;
            const edge2 = edge1 + d * 2;
            const edge3 = edge2 + w * 2;
            const edge4 = edge3 + d * 2;
            const edge5 = edge4 + h * 2;
            const edge6 = edge5 + h * 2;
            const edge7 = edge6 + h * 2;
            const edge8 = edge7 + h * 2;
            const edge9 = edge8 + w * 2;
            const edge10 = edge9 + d * 2;
            const edge11 = edge10 + w * 2;

            if (distance < edge1) {
                const progress = distance / (w * 2);
                x = -w + progress * w * 2;
                y = -h;
                z = d;
            } else if (distance < edge2) {
                const progress = (distance - edge1) / (d * 2);
                x = w;
                y = -h;
                z = d - progress * d * 2;
            } else if (distance < edge3) {
                const progress = (distance - edge2) / (w * 2);
                x = w - progress * w * 2;
                y = -h;
                z = -d;
            } else if (distance < edge4) {
                const progress = (distance - edge3) / (d * 2);
                x = -w;
                y = -h;
                z = -d + progress * d * 2;
            } else if (distance < edge5) {
                const progress = (distance - edge4) / (h * 2);
                x = -w;
                y = -h + progress * h * 2;
                z = d;
            } else if (distance < edge6) {
                const progress = (distance - edge5) / (h * 2);
                x = w;
                y = -h + progress * h * 2;
                z = d;
            } else if (distance < edge7) {
                const progress = (distance - edge6) / (h * 2);
                x = w;
                y = -h + progress * h * 2;
                z = -d;
            } else if (distance < edge8) {
                const progress = (distance - edge7) / (h * 2);
                x = -w;
                y = -h + progress * h * 2;
                z = -d;
            } else if (distance < edge9) {
                const progress = (distance - edge8) / (w * 2);
                x = -w + progress * w * 2;
                y = h;
                z = d;
            } else if (distance < edge10) {
                const progress = (distance - edge9) / (d * 2);
                x = w;
                y = h;
                z = d - progress * d * 2;
            } else if (distance < edge11) {
                const progress = (distance - edge10) / (w * 2);
                x = w - progress * w * 2;
                y = h;
                z = -d;
            } else {
                const progress = (distance - edge11) / (d * 2);
                x = -w;
                y = h;
                z = -d + progress * d * 2;
            }

            const basePos = selectedContainerInfo.selected.position;
            if (basePos && basePos.length === 3) {
                borderRef.current.position.set(basePos[0] + x, basePos[1] + y, basePos[2] + z);
            }
        } catch (error) {
            console.error('Error in shining dot animation:', error);
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

            {/* Static border outline for selected container */}
            {selectedContainerInfo && (
                <mesh position={selectedContainerInfo.selected.position}>
                    <boxGeometry args={[6.2, 2.7, 2.55]} />
                    <meshBasicMaterial
                        color="#ffff00"
                        wireframe={true}
                        transparent={true}
                        opacity={0.6}
                    />
                </mesh>
            )}

            {/* Shining dot moving around selected container border */}
            {selectedContainerInfo && (
                <mesh ref={borderRef}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshBasicMaterial
                        color="#ffff00"
                        toneMapped={false}
                    />
                </mesh>
            )}

            {/* Label above topmost container in stack */}
            {selectedContainerInfo && (
                <Text
                    position={selectedContainerInfo.labelPosition}
                    fontSize={1.2}
                    color="yellow"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.1}
                    outlineColor="#000000"
                >
                    {selectedContainerInfo.selected.id}
                </Text>
            )}
        </group>
    );
}
