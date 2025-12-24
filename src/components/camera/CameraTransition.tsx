import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/store';
import { useUIStore } from '../../store/uiStore';
import { getAllDynamicBlocks } from '../../utils/layoutUtils';
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
    const standardPos = new THREE.Vector3(0, 150, 300);
    const topViewPos = new THREE.Vector3(0, 300, 1);
    const center = new THREE.Vector3(0, 0, 0);
    const startPos = new THREE.Vector3(0, 500, 10);

    // Helper to animate camera
    const animateCamera = (targetPos: THREE.Vector3, targetLookAt: THREE.Vector3) => {
        if (!controlsRef.current) return;

        // Kill any running tweens on camera and controls
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controlsRef.current.target);

        // Animate Position
        gsap.to(camera.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 1.5,
            ease: "power3.inOut",
            onUpdate: () => {
                // controlsRef.current.update(); 
            }
        });

        // Animate LookAt Target
        gsap.to(controlsRef.current.target, {
            x: targetLookAt.x,
            y: targetLookAt.y,
            z: targetLookAt.z,
            duration: 1.5,
            ease: "power3.inOut",
            onUpdate: () => {
                controlsRef.current.update();
            }
        });
    };

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

            // Check if a block is already selected
            const isBlockAlreadySelected = !!selectedBlock;

            // Camera Offsets for Container View
            // Different offsets based on whether block was already selected
            const camOffsetX = isBlockAlreadySelected ? -15 : -20;
            const camOffsetY = isBlockAlreadySelected ? 25 : 20;
            const camOffsetZ = isBlockAlreadySelected ? 15 : 20;

            // Target LookAt: Base Pos + Total Lift
            const totalLift = isBlockAlreadySelected ? 25 : 12;
            const shiftX = isBlockAlreadySelected ? 6 : 8;

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
            const blocks = getAllDynamicBlocks(layout);
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
                const blocks = getAllDynamicBlocks(currentLayout);
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
