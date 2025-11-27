import { useRef, useEffect, useMemo, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/store';
import { useTexture, Outlines } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';

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
    const selectedBlock = useStore(state => state.selectedBlock);

    const { camera } = useThree();

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
                type: type,
                blockId: e?.blockId
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

    // Initial Setup & Static Updates
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh || instanceData.length === 0) return;

        // Create or update opacity attribute
        if (!opacityAttribute.current) {
            const opacities = new Float32Array(instanceData.length);
            opacityAttribute.current = new THREE.InstancedBufferAttribute(opacities, 1);
            mesh.geometry.setAttribute('instanceOpacity', opacityAttribute.current);
        }

        instanceData.forEach((data, i) => {
            const [x, y, z] = data.position;
            dummy.position.set(x, y, z);
            dummy.scale.set(data.scale[0], data.scale[1], data.scale[2]);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, data.color);

            if (opacityAttribute.current) {
                opacityAttribute.current.setX(i, 1.0);
            }
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (opacityAttribute.current) opacityAttribute.current.needsUpdate = true;

        if (onReady) onReady();
    }, [instanceData, dummy, onReady]);

    // Animation State
    const liftHeight = useRef(0);
    const lotLiftHeight = useRef(0);
    const prevHasSelection = useRef(false);
    const highlightMeshRef = useRef<THREE.Mesh>(null);

    // Main Animation Loop (Lift & Opacity)
    useFrame((state, delta) => {
        const mesh = meshRef.current;
        if (!mesh || instanceData.length === 0) return;

        // --- Handle Block Lift Animation ---
        const targetLift = selectedBlock ? 16 : 0;
        const lerpSpeed = delta * 2;

        const diff = targetLift - liftHeight.current;
        const isLifting = Math.abs(diff) > 0.01;

        if (isLifting) {
            liftHeight.current = THREE.MathUtils.lerp(liftHeight.current, targetLift, lerpSpeed);
        } else {
            liftHeight.current = targetLift;
        }

        // --- Handle Lot Lift Animation (Selected Stack) ---
        const targetLotLift = selectId ? 10 : 0;
        const lotDiff = targetLotLift - lotLiftHeight.current;
        const isLotLifting = Math.abs(lotDiff) > 0.01;

        if (isLotLifting) {
            lotLiftHeight.current = THREE.MathUtils.lerp(lotLiftHeight.current, targetLotLift, lerpSpeed);
        } else {
            lotLiftHeight.current = targetLotLift;
        }

        const selectedPos = selectedContainerInfo?.selected?.position;
        let needsMatrixUpdate = false;

        if (isLifting || isLotLifting || (selectedBlock && liftHeight.current !== 0) || (selectId && lotLiftHeight.current !== 0) || (!selectedBlock && liftHeight.current !== 0)) {
            needsMatrixUpdate = true;
        }

        const hasSelection = !!selectedBlock || !!selectId;
        const selectionCleared = prevHasSelection.current && !hasSelection;
        prevHasSelection.current = hasSelection;

        if (needsMatrixUpdate || hasSelection || selectionCleared) {
            instanceData.forEach((data, i) => {
                // 1. Position (Lift)
                const [x, y, z] = data.position;
                const isInDataBlock = data.blockId === selectedBlock;

                // Check if this container is in the selected stack/lot
                let isInSelectedStack = false;
                if (selectedPos) {
                    isInSelectedStack = Math.abs(x - selectedPos[0]) < 0.1 && Math.abs(z - selectedPos[2]) < 0.1;
                }

                // Base Y + Block Lift + Lot Lift
                const currentY = y + (isInDataBlock ? liftHeight.current : 0) + (isInSelectedStack ? lotLiftHeight.current : 0);

                dummy.position.set(x, currentY, z);
                dummy.scale.set(data.scale[0], data.scale[1], data.scale[2]);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);

                // 2. Opacity (Dimming)
                let opacity = 1.0;

                if (selectedBlock) {
                    if (data.blockId === selectedBlock) {
                        opacity = 1.0;
                    } else {
                        opacity = 0.1;
                    }
                } else if (selectId && selectedPos) {
                    if (data.id !== selectId) {
                        const dx = x - selectedPos[0];
                        const dz = z - selectedPos[2];
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        if (distance < 15) {
                            opacity = 0.2;
                        }
                    }
                }

                if (opacityAttribute.current) {
                    opacityAttribute.current.setX(i, opacity);
                }
            });

            mesh.instanceMatrix.needsUpdate = true;
            if (opacityAttribute.current) opacityAttribute.current.needsUpdate = true;
        }

        // Update Highlight Mesh Position
        if (highlightMeshRef.current && selectedContainerInfo) {
            const [x, y, z] = selectedContainerInfo.selected.position;
            // Always apply full lift to highlight (Block + Lot)
            // Note: We use the animated values for smooth tracking
            const currentLift = liftHeight.current + lotLiftHeight.current;
            highlightMeshRef.current.position.set(x, y + currentLift, z);
        }
    });

    // Listen for animation cancellations
    useEffect(() => {
        const handleCancelAnimations = (e: any) => {
            if (e.detail?.source !== 'containerFocus') {
                gsap.killTweensOf(camera.position);
                gsap.killTweensOf(controlsRef?.current?.target);
            }
        };
        window.addEventListener('cancelAnimations', handleCancelAnimations);
        return () => window.removeEventListener('cancelAnimations', handleCancelAnimations);
    }, []);

    const dragStart = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: any) => {
        dragStart.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: any) => {
        e.stopPropagation();
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) return;

        const instanceId = e.instanceId;
        if (instanceId !== undefined && ids[instanceId]) {
            const clickedId = ids[instanceId];
            const clickedEntity = entities[clickedId];

            // If a block is selected, only allow selecting containers within that block
            if (selectedBlock) {
                if (clickedEntity?.blockId === selectedBlock) {
                    useStore.getState().setSelectId(clickedId);
                }
            } else {
                // No block selected, allow selecting any container
                useStore.getState().setSelectId(clickedId);
            }
        }
    };

    const handleGroundClick = () => {
        if (selectId) {
            // Only clear container selection to support backtracking to block view
            useStore.getState().setSelectId(null);
            // Camera reset is handled by CameraTransition now
        }
    };

    if (ids.length === 0) return null;

    return (
        <group onClick={handleGroundClick}>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, Math.max(count || 0, ids.length)]}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
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

            {/* Thick Highlight for selected container */}
            {selectedContainerInfo && (
                <mesh
                    ref={highlightMeshRef}
                    position={selectedContainerInfo.selected.position}
                    scale={selectedContainerInfo.selected.scale}
                >
                    <boxGeometry args={[6.058, 2.591, 2.438]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    <Outlines thickness={5} color="#FFD700" />
                </mesh>
            )}
        </group>
    );
}
