import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/store';
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

    // 2. Handle Selection (Container > Block)
    useEffect(() => {
        if (isLoading) return;

        if (selectId && entities[selectId]) {
            // --- Container Selection ---
            const entity = entities[selectId];
            const containerPos = new THREE.Vector3(entity.x || 0, entity.y || 0, entity.z || 0);

            // Check if a block is already selected
            const isBlockAlreadySelected = !!selectedBlock;

            // Camera Offsets for Container View
            // Different offsets based on whether block was already selected
            const camOffsetX = isBlockAlreadySelected ? -15 : -20;
            const camOffsetY = isBlockAlreadySelected ? 15 : 20;
            const camOffsetZ = isBlockAlreadySelected ? 15 : 20;

            // Target LookAt: Base Pos + Total Lift
            const totalLift = isBlockAlreadySelected ? 22 : 8;
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

            animateCamera(targetPos, targetLookAt);

        } else if (selectedBlock && layout) {
            // --- Block Selection ---
            const blocks = getAllDynamicBlocks(layout);
            const block = blocks.find(b => b.id === selectedBlock);

            if (block) {
                const blockCenter = new THREE.Vector3(
                    block.position.x,
                    block.position.y,
                    block.position.z
                );

                // Camera Offset Logic for Block View
                const cameraOffset = new THREE.Vector3(-25, 120, 160);
                const viewShiftOffset = new THREE.Vector3(40, 16, 0);

                const targetLookAt = blockCenter.clone().add(viewShiftOffset);
                const targetPos = targetLookAt.clone().add(cameraOffset);

                animateCamera(targetPos, targetLookAt);
            }
        }
    }, [selectId, selectedBlock, layout, isLoading, entities]);

    // 3. Handle Event Listeners (Top View, Reset)
    useEffect(() => {
        const handleMoveToTop = () => {
            if (!isLoading) animateCamera(topViewPos, center);
        };

        const handleResetToInitial = () => {
            if (!isLoading) animateCamera(standardPos, center);
        };

        window.addEventListener('moveCameraToTop', handleMoveToTop);
        window.addEventListener('resetCameraToInitial', handleResetToInitial);

        return () => {
            window.removeEventListener('moveCameraToTop', handleMoveToTop);
            window.removeEventListener('resetCameraToInitial', handleResetToInitial);
        };
    }, [isLoading]);

    return null;
}
