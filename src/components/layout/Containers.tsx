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
    const reserveContainers = useStore(state => state.reserveContainers);
    const ghostContainer = useStore(state => state.ghostContainer);

    const { camera } = useThree();

    // Load texture once with optimization
    const texture = useTexture('/textures/container_side.png', (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        tex.generateMipmaps = true;
    });

    // Realistic Industrial Color Palette (Darker, heavy metal tones)
    const containerColors = useMemo(() => [
        0x00695C, // Dark Teal
        0x2E7D32, // Forest Green
        0xD84315, // Burnt Orange
        0xF9A825, // Industrial Yellow
        0xC62828, // Crimson Red
        0x00838F, // Deep Cyan
        0xEF6C00, // Dark Gold
        0x6D4C41  // Lighter Brown (Industrial Rust)
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

            // Color Logic based on Type and Status
            if (e?.status === 'R') {
                // Reserved: Use a distinct Green
                color.setHex(0x15803d); // Deep Green (similar to UI panel)
            } else {
                // Available: Color based on Container Type
                // Use type to determine color hash, ensuring consistent color for same type
                const typeStr = e?.type || 'UNKNOWN';
                const hash = typeStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const colorIndex = hash % containerColors.length;
                color.setHex(containerColors[colorIndex]);
            }

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
        // If we have no containers, we are technically "ready" (scene is empty)
        // This prevents the loading screen from getting stuck at 90% if the API returns []
        if (instanceData.length === 0) {
            if (onReady) onReady();
            return;
        }

        const mesh = meshRef.current;
        if (!mesh) return;

        // Check if opacity attribute needs to be created or resized
        const currentCount = instanceData.length;
        const currentAttr = opacityAttribute.current;

        // Recreate attribute if it doesn't exist OR if size doesn't match current count
        if (!currentAttr || currentAttr.count !== currentCount) {
            const opacities = new Float32Array(currentCount);
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

        mesh.count = currentCount; // Ensure mesh count is updated
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (opacityAttribute.current) opacityAttribute.current.needsUpdate = true;

        // CRITICAL FIX: Set bounding sphere to infinity to ensure raycasting works for all instances
        // regardless of position. By default, it uses the geometry's bounding sphere (at origin),
        // causing far-away instances to be ignored by the raycaster.
        mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

        if (onReady) onReady();
    }, [instanceData, dummy, onReady]);

    // Animation State
    const liftHeight = useRef(0);
    const lotLiftHeight = useRef(0);
    const prevHasSelection = useRef(false);
    const highlightMeshRef = useRef<THREE.Mesh>(null);
    const hoverMeshRef = useRef<THREE.Mesh>(null); // Ref for hover highlight

    // Main Animation Loop (Lift & Opacity)
    useFrame((_, delta) => {
        const mesh = meshRef.current;
        if (!mesh || instanceData.length === 0) return;

        const reserveActive = reserveContainers.length > 0;
        const selectedCustomer = useStore.getState().selectedCustomer;

        const focusPosition = useStore.getState().focusPosition;

        // Check if Restack Panel is open AND we have a valid focus position (visualization active)
        // If so, DISABLE LIFTING to align with connection line
        const isRestackOpen = useUIStore.getState().activePanel === 'restack';
        const isRestackVisualizationFull = isRestackOpen && !!focusPosition;

        // --- Handle Block Lift Animation ---
        const targetLift = (selectedBlock && !isRestackVisualizationFull) ? 16 : 0;
        const lerpSpeed = delta * 2;

        const diff = targetLift - liftHeight.current;
        const isLifting = Math.abs(diff) > 0.01;

        if (isLifting) {
            liftHeight.current = THREE.MathUtils.lerp(liftHeight.current, targetLift, lerpSpeed);
        } else {
            liftHeight.current = targetLift;
        }

        // --- Handle Lot Lift Animation (Selected Stack) ---
        // Increased lift height as requested (was 10)
        // DISABLE lift if in restack mode AND visualization is fully active
        const targetLotLift = (selectId && !isRestackVisualizationFull) ? 16 : 0;
        const lotDiff = targetLotLift - lotLiftHeight.current;
        const isLotLifting = Math.abs(lotDiff) > 0.01;

        if (isLotLifting) {
            lotLiftHeight.current = THREE.MathUtils.lerp(lotLiftHeight.current, targetLotLift, lerpSpeed);
        } else {
            lotLiftHeight.current = targetLotLift;
        }

        const selectedPos = selectedContainerInfo?.selected?.position;
        let needsMatrixUpdate = false;

        // Added reserveActive check for matrix update to ensure opacity updates correctly even without lift
        if (isLifting || isLotLifting || (selectedBlock && liftHeight.current !== 0) || (selectId && lotLiftHeight.current !== 0) || reserveActive || selectedCustomer) {
            needsMatrixUpdate = true;
        }

        const hasSelection = !!selectedBlock || !!selectId || reserveActive || !!selectedCustomer;
        const hasGhost = !!ghostContainer;
        const selectionCleared = prevHasSelection.current && !hasSelection;
        prevHasSelection.current = hasSelection;

        // Transparency radius for focus points (ghost or selected container)
        const TRANSPARENCY_RADIUS = 15; // Meters
        const TRANSPARENCY_MIN_OPACITY = 0.1;

        if (needsMatrixUpdate || hasSelection || hasGhost || selectionCleared) {
            instanceData.forEach((data, i) => {
                const isReserve = reserveActive && reserveContainers.some(c => c.container_nbr === data.id);

                // 1. Position (Lift) & Scale (Visibility)
                const [x, y, z] = data.position;
                let currentY = y;
                let scaleX = data.scale[0];
                let scaleY = data.scale[1];
                let scaleZ = data.scale[2];
                let opacity = 1.0; // Default opacity

                if (reserveActive) {
                    // Reserve Mode Logic: No Lift
                    currentY = y;

                    // Hide unreserve containers completely (prevent depth write ghosts)
                    if (!isReserve) {
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
                        // Match block, row, and lot (ignore level/Y)
                        // Allow slight tolerance/exact match on X/Z for stack identification
                        // This logic assumes `data` has `blockId`, `lot`, `row` properties which are not explicitly defined in `instanceData` type.
                        // Using the original X/Z position check for stack identification.
                        isInSelectedStack = Math.abs(x - selectedPos[0]) < 0.1 && Math.abs(z - selectedPos[2]) < 0.1;
                    }

                    // Apply block lift
                    if (isInDataBlock) {
                        currentY += liftHeight.current;
                    }

                    // Apply lot lift (only if in the selected stack)
                    if (isInSelectedStack) {
                        currentY += lotLiftHeight.current;
                    }

                    // --- Opacity Logic ---
                    if (selectedCustomer) {
                        // Customer Mode
                        const entity = entities[data.id];
                        if (entity?.customerName === selectedCustomer) {
                            opacity = 1.0;
                        } else {
                            opacity = 0.1; // Ghost mode for others
                        }
                    } else if (selectedBlock) {
                        // Block Mode
                        if (isInDataBlock) {
                            opacity = 1.0;
                        } else {
                            opacity = 0.3;
                        }
                    }
                    // Handle individual opacity (when a single container is selected)
                    // This takes precedence over block/customer selection if active
                    if (selectId) { // Check selectId last to ensure it overrides other modes
                        if (data.id === selectId) {
                            opacity = 1.0;
                        } else {
                            // Calculate distance to selected container for radius-based transparency
                            const dx = x - selectedPos![0];
                            const dy = y - selectedPos![1];
                            const dz = z - selectedPos![2];
                            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                            if (distance < TRANSPARENCY_RADIUS) {
                                // Containers within radius: fade based on distance
                                const t = distance / TRANSPARENCY_RADIUS;
                                opacity = TRANSPARENCY_MIN_OPACITY + t * (0.6 - TRANSPARENCY_MIN_OPACITY);
                            } else {
                                opacity = 0.6; // Slightly dimmed outside radius
                            }
                        }
                    }

                    // Ghost container transparency (highest priority when active)
                    if (ghostContainer) {
                        const dx = x - ghostContainer.x;
                        const dy = y - ghostContainer.y;
                        const dz = z - ghostContainer.z;
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                        if (distance < TRANSPARENCY_RADIUS) {
                            // Containers within radius: fade based on distance
                            const t = distance / TRANSPARENCY_RADIUS;
                            opacity = Math.min(opacity, TRANSPARENCY_MIN_OPACITY + t * (0.5 - TRANSPARENCY_MIN_OPACITY));
                        }
                    }
                }

                dummy.position.set(x, currentY, z);
                dummy.scale.set(scaleX, scaleY, scaleZ);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);

                // Update Opacity Attribute
                if (opacityAttribute.current) {
                    opacityAttribute.current.setX(i, opacity);
                }
            });

            mesh.instanceMatrix.needsUpdate = true;
            if (opacityAttribute.current) opacityAttribute.current.needsUpdate = true;
        }

        // Update Highlight Mesh Position (Only for individual selection, disable if reserve mode is active?)
        // Or maybe just hide it if reserve mode active
        if (highlightMeshRef.current && selectedContainerInfo && !reserveActive) {
            const [x, y, z] = selectedContainerInfo.selected.position;
            const currentLift = liftHeight.current + lotLiftHeight.current;
            highlightMeshRef.current.position.set(x, y + currentLift, z);
        }

        // Update Hover Highlight Mesh Position (include block lift)
        if (hoverMeshRef.current && hoveredContainerInfo) {
            const [x, y, z] = hoveredContainerInfo.position;
            // Add block lift if hovered container is in selected block
            const isInSelectedBlock = hoveredContainerInfo.blockId === selectedBlock;
            const hoverLift = isInSelectedBlock ? liftHeight.current : 0;
            hoverMeshRef.current.position.set(x, y + hoverLift, z);
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
        // e.stopPropagation(); // Don't stop propagation here to allow controls to work
        dragStart.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: any) => {
        e.stopPropagation();
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;

        // Relaxed threshold from 5 to 20 pixels to be more forgiving
        if (Math.sqrt(dx * dx + dy * dy) > 20) return;

        // Block interaction if Position Container panel is open
        const isPositionPanelOpen = useUIStore.getState().activePanel === 'position';
        if (isPositionPanelOpen) return;

        console.log('[Containers] Click detected on instance:', e.instanceId);

        const instanceId = e.instanceId;
        if (instanceId !== undefined && ids[instanceId]) {
            const clickedId = ids[instanceId];
            const clickedEntity = entities[clickedId];

            console.log('[Containers] Selecting container:', clickedId);

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

    // Clear hover only when actively interacting with camera
    useEffect(() => {
        if (isInteracting) {
            setHoverId(null);
            document.body.style.cursor = 'auto';
        }
    }, [isInteracting, setHoverId]);

    const handlePointerMove = (e: any) => {
        e.stopPropagation();

        // Only block hover if we are actively dragging the camera
        // REMOVED: || selectId || selectedBlock checks to allow hover inspection always
        if (isInteracting) return;

        // Block hover/interaction if Position Container panel is open
        const isPositionPanelOpen = useUIStore.getState().activePanel === 'position';
        if (isPositionPanelOpen) return;

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
        // e.stopPropagation();
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

    // CRITICAL: Callback ref to set bounding sphere IMMEDIATELY when geometry mounts
    // This ensures raycasting works for all instances regardless of their distance from origin
    const setBoundingSphereOnMount = (geometry: THREE.BoxGeometry | null) => {
        if (geometry) {
            geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
        }
    };

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
                frustumCulled={false}
            >
                <boxGeometry ref={setBoundingSphereOnMount} args={[6.058, 2.591, 2.438]} />
                <meshStandardMaterial
                    map={texture}
                    metalness={0.4}
                    roughness={0.6}
                    color="#ffffff"
                    transparent={true}
                    depthWrite={true}
                    side={THREE.DoubleSide}
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
            {selectedContainerInfo && !reserveContainers.length && (
                <mesh
                    ref={highlightMeshRef}
                    position={selectedContainerInfo.selected.position}
                    scale={selectedContainerInfo.selected.scale}
                    raycast={() => null}
                >
                    <boxGeometry args={[6.058, 2.591, 2.438]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    <Outlines thickness={5} color="#FFD700" />
                </mesh>
            )}

            {/* Highlight for hovered container (Yellow/Gold) - Enabled during reserve mode if needed */}
            {hoveredContainerInfo && !selectedContainerInfo && (
                <mesh
                    ref={hoverMeshRef}
                    position={hoveredContainerInfo.position}
                    scale={hoveredContainerInfo.scale}
                    raycast={() => null}
                >
                    <boxGeometry args={[6.058, 2.591, 2.438]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    <Outlines thickness={3} color="#FFD700" />
                </mesh>
            )}
        </group>
    );
}

