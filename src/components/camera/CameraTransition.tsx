import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/store';
import { useUIStore } from '../../store/uiStore';
import { getBlocksWithCalculatedPositions } from '../../utils/layoutUtils';
import gsap from 'gsap';

interface CameraTransitionProps {
    isLoading: boolean;
    controlsRef: React.RefObject<any>;
}

export function CameraTransition({ isLoading, controlsRef }: CameraTransitionProps) {
    const { camera } = useThree();

    // Get store values
    const selectedBlock = useStore((state) => state.selectedBlock);
    const selectId = useStore((state) => state.selectId);
    const entities = useStore((state) => state.entities);
    const layout = useStore((state) => state.layout);
    const focusPosition = useStore((state) => state.focusPosition);
    // UI Store
    const activePanel = useUIStore((state) => state.activePanel);

    // Track selection change time to prevent spring-back from overwriting initial animation
    const lastSelectionChangeTime = useRef<number>(0);

    // Target positions
    const standardPos = new THREE.Vector3(0, 250, 600);
    const topViewPos = new THREE.Vector3(0, 465, 1);
    const center = new THREE.Vector3(0, 0, 0);
    const startPos = new THREE.Vector3(0, 500, 10);

    // Helper to animate camera - Unified tween for smooth Telia-style transitions
    const animateCamera = (targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration: number = 1.5) => {
        if (!controlsRef.current) return;

        // Kill any running tweens
        gsap.killTweensOf("cameraAnimation");

        // Failsafe: Ensure controls are enabled before starting new animation
        // This handles cases where a previous animation was interrupted
        if (controlsRef.current) controlsRef.current.enabled = true;

        // Capture current state
        const animState = {
            camX: camera.position.x,
            camY: camera.position.y,
            camZ: camera.position.z,
            tarX: controlsRef.current.target.x,
            tarY: controlsRef.current.target.y,
            tarZ: controlsRef.current.target.z,
        };

        // Disable controls during animation to prevent fighting
        controlsRef.current.enabled = false;

        // Unified tween - animates camera position and lookAt target synchronously
        gsap.to(animState, {
            id: "cameraAnimation",
            camX: targetPos.x,
            camY: targetPos.y,
            camZ: targetPos.z,
            tarX: targetLookAt.x,
            tarY: targetLookAt.y,
            tarZ: targetLookAt.z,
            duration: duration,
            ease: "power2.inOut", // Softer easing for smoother feel
            onUpdate: () => {
                // Update camera and target in sync each frame
                camera.position.set(animState.camX, animState.camY, animState.camZ);
                controlsRef.current.target.set(animState.tarX, animState.tarY, animState.tarZ);
                controlsRef.current.update();
            },
            onComplete: () => {
                // Always re-enable controls after animation completes
                if (controlsRef.current) {
                    controlsRef.current.enabled = true;
                }
            },
            onInterrupt: () => {
                // Failsafe: If GSAP kills this tween, re-enable controls
                if (controlsRef.current) {
                    controlsRef.current.enabled = true;
                }
            }
        });
    };

    // Failsafe: Re-enable controls on component unmount
    useEffect(() => {
        return () => {
            gsap.killTweensOf("cameraAnimation");
            if (controlsRef.current) {
                controlsRef.current.enabled = true;
            }
        };
    }, []);

    // 1. Handle Loading State
    useEffect(() => {
        if (isLoading) {
            camera.position.copy(startPos);
            camera.lookAt(center);
            if (controlsRef.current) {
                controlsRef.current.target.copy(center);
                controlsRef.current.update();
            }
        } else {
            // Initial animation when loading finishes
            if (camera.position.distanceTo(startPos) < 1.0) {
                animateCamera(standardPos, center);
            }
        }
    }, [isLoading]);

    // 2. Handle Selection (Container > Block) + Spring-Back Lock
    useEffect(() => {
        if (isLoading) return;

        // Helper to calculate target camera position for selected container
        const getContainerCameraTarget = () => {
            if (!selectId || !entities[selectId]) return null;

            const entity = entities[selectId];
            const containerPos = new THREE.Vector3(entity.x || 0, entity.y || 0, entity.z || 0);

            // Camera Offsets for Container View
            // UNIFIED: Use standard offsets regardless of block selection (since we no longer lift blocks)
            const camOffsetX = -20;
            const camOffsetY = 20;
            const camOffsetZ = 20;

            // Target LookAt: Base Pos + Standard Lift
            const totalLift = 12;
            const shiftX = 8;

            const targetLookAt = new THREE.Vector3(
                containerPos.x + shiftX,
                containerPos.y + totalLift,
                containerPos.z
            );

            const targetPos = new THREE.Vector3(
                targetLookAt.x + camOffsetX,
                targetLookAt.y + camOffsetY,
                targetLookAt.z + camOffsetZ
            );

            return { targetPos, targetLookAt };
        };

        // Initial animation when container selected
        if (selectId && entities[selectId]) {
            const target = getContainerCameraTarget();
            if (target) {
                lastSelectionChangeTime.current = Date.now(); // Mark selection time
                animateCamera(target.targetPos, target.targetLookAt);
            }

        } else if (activePanel === 'reserveContainers') {
            const targetShiftX = 15;
            const targetLookAt = new THREE.Vector3(targetShiftX, 0, 50);
            const positionShiftX = -160;
            const targetPos = new THREE.Vector3(positionShiftX, 220, 250);
            lastSelectionChangeTime.current = Date.now();
            animateCamera(targetPos, targetLookAt);

        } else if (selectedBlock && layout) {
            // Find entity in layout
            const entity = layout.entities?.find(e => e.id === selectedBlock);

            if (entity && !entity.type.startsWith('container_block')) {
                // GENERIC ENTITY FOCUS (CFS, Warehouse, Office, etc.)
                // This handles any non-container-block entity that has a position
                const center = new THREE.Vector3(
                    entity.position?.x || 0,
                    entity.position?.y || 0,
                    entity.position?.z || 0
                );

                // Default framing for buildings/areas
                let cameraOffset = new THREE.Vector3(0, 80, 50); // High angle, front view
                let viewShiftOffset = new THREE.Vector3(0, 0, 0);

                // Type-specific adjustments
                if (entity.type === 'cfs_area') {
                    // CFS: Offset right to frame object on left
                    cameraOffset = new THREE.Vector3(0, 80, 30);
                    viewShiftOffset = new THREE.Vector3(15, 0, 0);
                } else if (entity.type === 'warehouse') {
                    // Warehouse: Front-on view, slightly further back
                    cameraOffset = new THREE.Vector3(0, 60, 100);
                } else if (['terminal_office', 'terminal_dispatch_office', 'resting_room', 'generator_room'].includes(entity.type)) {
                    // Smaller buildings: Closer zoom
                    cameraOffset = new THREE.Vector3(0, 40, 60);
                }

                const targetLookAt = center.clone().add(viewShiftOffset);
                const targetPos = targetLookAt.clone().add(cameraOffset);

                lastSelectionChangeTime.current = Date.now();
                animateCamera(targetPos, targetLookAt);

            } else {
                // CONTAINER BLOCK FOCUS (Uses calculated positions for slots)
                const blocks = getBlocksWithCalculatedPositions(layout);
                const block = blocks.find(b => b.id === selectedBlock);

                if (block) {
                    const blockCenter = new THREE.Vector3(
                        block.position.x,
                        block.position.y,
                        block.position.z
                    );

                    const cameraOffset = new THREE.Vector3(-25, 120, 160);
                    const viewShiftOffset = new THREE.Vector3(40, 16, 0);

                    const targetLookAt = blockCenter.clone().add(viewShiftOffset);
                    const targetPos = targetLookAt.clone().add(cameraOffset);

                    lastSelectionChangeTime.current = Date.now();
                    animateCamera(targetPos, targetLookAt);
                }
            }
        } else {
            // Nothing selected (no container, no block, no panel) - return to main view
            lastSelectionChangeTime.current = Date.now();
            animateCamera(standardPos, center);
        }

        // Spring-Back Lock: When user stops interacting, return to locked view
        const handleInteractionEnd = () => {
            // Skip spring-back if a selection just happened (within 500ms)
            // This prevents spring-back from overwriting the initial animation
            if (Date.now() - lastSelectionChangeTime.current < 500) {
                return;
            }

            // Read CURRENT state
            const currentFocusPosition = useStore.getState().focusPosition;
            const currentSelectId = useStore.getState().selectId;
            const currentSelectedBlock = useStore.getState().selectedBlock;
            const currentEntities = useStore.getState().entities;
            const currentLayout = useStore.getState().layout;

            // 1. Focus Position (Position Panel / Restack) takes highest priority
            if (currentFocusPosition) {
                const positionVec = new THREE.Vector3(currentFocusPosition.x, currentFocusPosition.y, currentFocusPosition.z);
                let targetLookAt = new THREE.Vector3(
                    positionVec.x + 8,
                    positionVec.y,
                    positionVec.z
                );
                let targetPos: THREE.Vector3;

                // Check if custom camera position is provided (Restack fit-bounds)
                if (currentFocusPosition.cameraX !== undefined && currentFocusPosition.cameraY !== undefined && currentFocusPosition.cameraZ !== undefined) {
                    targetPos = new THREE.Vector3(currentFocusPosition.cameraX, currentFocusPosition.cameraY, currentFocusPosition.cameraZ - 80);
                    // Match custom offset from useEffect
                    positionVec.x += 40;
                    positionVec.z += 40;
                    targetLookAt = positionVec;
                } else {
                    // Default container focus logic
                    const camOffsetX = -15;
                    const camOffsetY = 30;
                    const camOffsetZ = 30;
                    targetLookAt.y += 0;
                    targetPos = new THREE.Vector3(
                        targetLookAt.x + camOffsetX,
                        targetLookAt.y + camOffsetY,
                        targetLookAt.z + camOffsetZ
                    );
                }

                setTimeout(() => {
                    if (Date.now() - lastSelectionChangeTime.current < 500) return;
                    animateCamera(targetPos, targetLookAt);
                }, 100);
            }
            // 2. Container selection takes priority
            else if (currentSelectId && currentEntities[currentSelectId]) {
                const entity = currentEntities[currentSelectId];
                const containerPos = new THREE.Vector3(entity.x || 0, entity.y || 0, entity.z || 0);
                const camOffsetX = -20;
                const camOffsetY = 20;
                const camOffsetZ = 20;
                const totalLift = 15;
                const shiftX = 8;
                const targetLookAt = new THREE.Vector3(
                    containerPos.x + shiftX,
                    containerPos.y + totalLift,
                    containerPos.z
                );
                const targetPos = new THREE.Vector3(
                    targetLookAt.x + camOffsetX,
                    targetLookAt.y + camOffsetY,
                    targetLookAt.z + camOffsetZ
                );

                setTimeout(() => {
                    if (Date.now() - lastSelectionChangeTime.current < 500) return;
                    animateCamera(targetPos, targetLookAt);
                }, 100);
            }
            // 3. Block selection spring-back (only if no container selected)
            else if (currentSelectedBlock && currentLayout) {

                // Check if it's a CFS Area
                if (currentSelectedBlock.startsWith('cfs_')) {
                    const cfsEntity = currentLayout.entities?.find(e => e.id === currentSelectedBlock);

                    if (cfsEntity) {
                        const cfsCenter = new THREE.Vector3(
                            cfsEntity.position?.x || 0,
                            cfsEntity.position?.y || 0,
                            cfsEntity.position?.z || 0
                        );

                        // Match logic from initial selection
                        const cameraOffset = new THREE.Vector3(0, 80, 30);
                        const viewShiftOffset = new THREE.Vector3(15, 0, 0);

                        const targetLookAt = cfsCenter.clone().add(viewShiftOffset);
                        const targetPos = targetLookAt.clone().add(cameraOffset);

                        setTimeout(() => {
                            if (Date.now() - lastSelectionChangeTime.current < 500) return;
                            animateCamera(targetPos, targetLookAt);
                        }, 100);
                    }
                } else {
                    // Standard Block
                    const blocks = getBlocksWithCalculatedPositions(currentLayout);
                    const block = blocks.find(b => b.id === currentSelectedBlock);

                    if (block) {
                        const blockCenter = new THREE.Vector3(
                            block.position.x,
                            block.position.y,
                            block.position.z
                        );
                        const cameraOffset = new THREE.Vector3(-25, 120, 160);
                        const viewShiftOffset = new THREE.Vector3(40, 16, 0);
                        const targetLookAt = blockCenter.clone().add(viewShiftOffset);
                        const targetPos = targetLookAt.clone().add(cameraOffset);

                        setTimeout(() => {
                            if (Date.now() - lastSelectionChangeTime.current < 500) return;
                            animateCamera(targetPos, targetLookAt);
                        }, 100);
                    }
                }
            }
        };

        const controls = controlsRef.current;
        if (controls) {
            controls.addEventListener('end', handleInteractionEnd);
        }

        return () => {
            if (controls) {
                controls.removeEventListener('end', handleInteractionEnd);
            }
        };
    }, [selectId, selectedBlock, activePanel, layout, isLoading, entities]);

    // 3. Handle Event Listeners (Top View, Reset)
    useEffect(() => {
        const handleMoveToTop = () => {
            if (!isLoading) animateCamera(topViewPos, center);
        };

        const handleResetToInitial = () => {
            // Only reset to global view if no block is selected
            // If block is selected, the main useEffect will handle "returning" to block view
            const currentSelectedBlock = useStore.getState().selectedBlock;
            if (!isLoading && !currentSelectedBlock) {
                animateCamera(standardPos, center);
            }
        };

        window.addEventListener('moveCameraToTop', handleMoveToTop);
        window.addEventListener('resetCameraToInitial', handleResetToInitial);

        return () => {
            window.removeEventListener('moveCameraToTop', handleMoveToTop);
            window.removeEventListener('resetCameraToInitial', handleResetToInitial);
        };
    }, [isLoading]);

    // 4. Handle Focus Position (from Position Panel)
    useEffect(() => {
        if (isLoading) return;

        if (focusPosition) {
            // Move camera to the focused position
            const positionVec = new THREE.Vector3(focusPosition.x, focusPosition.y, focusPosition.z);

            let targetLookAt = new THREE.Vector3(
                positionVec.x + 8,
                positionVec.y,
                positionVec.z
            );

            let targetPos: THREE.Vector3;

            // Check if custom camera position is provided (e.g. for Restack fit-bounds)
            if (focusPosition.cameraX !== undefined && focusPosition.cameraY !== undefined && focusPosition.cameraZ !== undefined) {
                targetPos = new THREE.Vector3(focusPosition.cameraX, focusPosition.cameraY, focusPosition.cameraZ);
                // For custom framing, we might look at the center of the bounding box (positionVec)
                positionVec.x += 40;
                positionVec.z += 40;
                targetLookAt = positionVec;
            } else {
                // Default container focus logic
                const camOffsetX = -15;
                const camOffsetY = 30;
                const camOffsetZ = 30;

                targetLookAt.y += 0; // Total lift (already at 0)

                targetPos = new THREE.Vector3(
                    targetLookAt.x + camOffsetX,
                    targetLookAt.y + camOffsetY,
                    targetLookAt.z + camOffsetZ
                );
            }

            lastSelectionChangeTime.current = Date.now();
            animateCamera(targetPos, targetLookAt);
        } else {
            // When focusPosition is cleared (e.g., closing Position Panel or incomplete Restack),
            // Revert to standard views based on priority: Container > Global

            const currentSelectId = useStore.getState().selectId;
            const currentEntities = useStore.getState().entities;
            const currentSelectedBlock = useStore.getState().selectedBlock;

            if (currentSelectId && currentEntities[currentSelectId]) {
                // Revert to Container View
                const entity = currentEntities[currentSelectId];
                const containerPos = new THREE.Vector3(entity.x || 0, entity.y || 0, entity.z || 0);

                // Use standard non-block-selected offsets for consistency (or logic from selection effect)
                const camOffsetX = -20;
                const camOffsetY = 20;
                const camOffsetZ = 20;
                const totalLift = 15;
                const shiftX = 8;

                const targetLookAt = new THREE.Vector3(
                    containerPos.x + shiftX,
                    containerPos.y + totalLift,
                    containerPos.z
                );

                const targetPos = new THREE.Vector3(
                    targetLookAt.x + camOffsetX,
                    targetLookAt.y + camOffsetY,
                    targetLookAt.z + camOffsetZ
                );

                lastSelectionChangeTime.current = Date.now();
                animateCamera(targetPos, targetLookAt);

            } else if (!currentSelectedBlock) {
                // Only reset to global if nothing is selected
                animateCamera(standardPos, center);
            }
        }
    }, [focusPosition, isLoading]);

    return null;
}
