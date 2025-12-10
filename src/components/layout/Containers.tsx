import { useRef, useEffect, useMemo, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/store';
import { useUIStore } from '../../store/uiStore';
import { useTexture, Outlines } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { DynamicEntity } from '../../utils/layoutUtils';
import gsap from 'gsap';

interface ContainersProps {
    controlsRef?: RefObject<any>;
    onReady?: () => void;
}

export default function Containers({ controlsRef, onReady }: ContainersProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const opacityAttribute = useRef<THREE.InstancedBufferAttribute | null>(null);

    // Access store state via individual selectors
    const ids = useStore(state => state.ids);
    const entities = useStore(state => state.entities);
    const selectId = useStore(state => state.selectId);
    const selectedBlock = useStore(state => state.selectedBlock);
    const layout = useStore(state => state.layout);
    const setHoverId = useStore(state => state.setHoverId);
    const hoverId = useStore(state => state.hoverId);
    const reservedContainers = useStore(state => state.reservedContainers);

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
        // Create a map of blocks for quick lookup
        const blockMap = new Map<string, DynamicEntity>();
        if (layout && layout.entities) {
            layout.entities.forEach(entity => {
                if (entity.type && entity.type.includes('block')) {
                    blockMap.set(entity.id, entity);
                }
            });
        }

        return ids.map(id => {
            const e = entities[id];
            const color = new THREE.Color();

            // Always use deterministic color
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const colorIndex = hash % containerColors.length;
            color.setHex(containerColors[colorIndex]);

            // Get block to determine scaling based on SLOT SIZE not container size
            const block = e?.blockId ? blockMap.get(e.blockId) : null;
            const blockType = block?.props?.container_type || '20ft';

            // Determine scale: If block slots are 40ft, scale up. If 20ft, standard.
            // This aligns visual mesh with the grid slot size.
            const scaleX = blockType === '40ft' ? 2.0125 : 1;

            return {
                position: [e?.x || 0, e?.y || 0, e?.z || 0] as [number, number, number],
                color: color,
                id: id,
                scale: [scaleX, 1, 1] as [number, number, number],
                type: e?.type || '20ft', // Keep actual type for info, but scale by block
                blockId: e?.blockId
            };
        });
    }, [ids, entities, containerColors, layout]);

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
    useFrame((_, delta) => {
        const mesh = meshRef.current;
        if (!mesh || instanceData.length === 0) return;

        const reservedActive = reservedContainers.length > 0;

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

        // Added reservedActive check for matrix update to ensure opacity updates correctly even without lift
        if (isLifting || isLotLifting || (selectedBlock && liftHeight.current !== 0) || (selectId && lotLiftHeight.current !== 0) || reservedActive) {
            needsMatrixUpdate = true;
        }

        const hasSelection = !!selectedBlock || !!selectId || reservedActive;
        const selectionCleared = prevHasSelection.current && !hasSelection;
        prevHasSelection.current = hasSelection;

        if (needsMatrixUpdate || hasSelection || selectionCleared) {
            instanceData.forEach((data, i) => {
                const isReserved = reservedActive && reservedContainers.some(c => c.container_nbr === data.id);

                // 1. Position (Lift) & Scale (Visibility)
                const [x, y, z] = data.position;
                let currentY = y;
                let scaleX = data.scale[0];
                let scaleY = data.scale[1];
                let scaleZ = data.scale[2];

                if (reservedActive) {
                    // Reserved Mode Logic: No Lift
                    currentY = y;

                    // Hide unreserved containers completely (prevent depth write ghosts)
                    if (!isReserved) {
                        scaleX = 0;
                        scaleY = 0;
                        scaleZ = 0;
                    }
                } else {
                    // Standard Selection Logic
                    const isInDataBlock = data.blockId === selectedBlock;
                    // Check if this container is in the selected stack/lot
                    let isInSelectedStack = false;
                    if (selectedPos) {
                        isInSelectedStack = Math.abs(x - selectedPos[0]) < 0.1 && Math.abs(z - selectedPos[2]) < 0.1;
                    }
                    // Base Y + Block Lift + Lot Lift
                    currentY = y + (isInDataBlock ? liftHeight.current : 0) + (isInSelectedStack ? lotLiftHeight.current : 0);
                }

                dummy.position.set(x, currentY, z);
                dummy.scale.set(scaleX, scaleY, scaleZ);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);

                // 2. Opacity (Dimming)
                let opacity = 1.0;

                if (reservedActive) {
                    // Reserved Mode: Highlight reserved, others are invisible
                    if (isReserved) {
                        opacity = 1.0;
                    } else {
                        opacity = 0.0;
                    }
                } else if (selectedBlock) {
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

        // Update Highlight Mesh Position (Only for individual selection, disable if reserved mode is active?)
        // Or maybe just hide it if reserved mode active
        if (highlightMeshRef.current && selectedContainerInfo && !reservedActive) {
            const [x, y, z] = selectedContainerInfo.selected.position;
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

        // Block interaction if Reserved Panel (or any panel?) is open
        // User requested specifically for "reserved container panel"
        const isReservedPanelOpen = useUIStore.getState().activePanel === 'reservedContainers';
        if (isReservedPanelOpen) return;

        // Disable selection click if reserved view is active? Or allow finding?
        // Let's assume selection is allowed but strictly for info

        const instanceId = e.instanceId;
        if (instanceId !== undefined && ids[instanceId]) {
            const clickedId = ids[instanceId];
            const clickedEntity = entities[clickedId];

            if (selectedBlock) {
                if (clickedEntity?.blockId === selectedBlock) {
                    useStore.getState().setSelectId(clickedId);
                }
            } else {
                useStore.getState().setSelectId(clickedId);
            }
        }
    };

    const handleGroundClick = () => {
        if (selectId) {
            useStore.getState().setSelectId(null);
        }
    };

    // --- Hover Logic - moved up from below ---
    const [isInteracting, setIsInteracting] = useState(false);

    // Monitor camera interaction to disable hover
    useEffect(() => {
        const controls = controlsRef?.current;
        if (!controls) return;

        const onStart = () => setIsInteracting(true);
        const onEnd = () => setIsInteracting(false);

        controls.addEventListener('start', onStart);
        controls.addEventListener('end', onEnd);

        return () => {
            controls.removeEventListener('start', onStart);
            controls.removeEventListener('end', onEnd);
        };
    }, [controlsRef]);

    // Clear hover when interacting or selecting
    // REMOVED reservedContainerIds check to allow hover during reserved mode
    useEffect(() => {
        if (isInteracting || selectId || selectedBlock) {
            setHoverId(null);
            document.body.style.cursor = 'auto';
        }
    }, [isInteracting, selectId, selectedBlock, setHoverId]);

    const handlePointerMove = (e: any) => {
        e.stopPropagation();
        // REMOVED reservedContainerIds check to allow hover during reserved mode
        if (isInteracting || selectId || selectedBlock) return;

        const instanceId = e.instanceId;
        if (instanceId !== undefined && ids[instanceId]) {
            const id = ids[instanceId];
            if (hoverId !== id) {
                setHoverId(id);
                document.body.style.cursor = 'pointer';
            }
        }
    };

    const handlePointerOut = (e: any) => {
        e.stopPropagation();
        if (hoverId) {
            setHoverId(null);
            document.body.style.cursor = 'auto';
        }
    };

    // Calculate highlighted container info - moved up
    const hoveredContainerInfo = useMemo(() => {
        if (!hoverId) return null;
        return instanceData.find(d => d.id === hoverId);
    }, [hoverId, instanceData]);

    if (ids.length === 0) return null;

    return (
        <group onClick={handleGroundClick}>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, ids.length]}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
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
            {selectedContainerInfo && !reservedContainers.length && (
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

            {/* Highlight for hovered container (Yellow/Gold) - Enabled during reserved mode if needed */}
            {hoveredContainerInfo && !selectedContainerInfo && (
                <mesh
                    position={hoveredContainerInfo.position}
                    scale={hoveredContainerInfo.scale}
                >
                    <boxGeometry args={[6.058, 2.591, 2.438]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    <Outlines thickness={3} color="#FFD700" />
                </mesh>
            )}
        </group>
    );
}
