import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';

interface CameraTransitionProps {
    isLoading: boolean;
    controlsRef: React.RefObject<any>;
}

export function CameraTransition({ isLoading, controlsRef }: CameraTransitionProps) {
    const { camera } = useThree();
    const [isAnimating, setIsAnimating] = useState(false);

    // Target position (standard view as defined in App.tsx)
    const standardPos = new THREE.Vector3(0, 150, 300);
    // Top view position - High up, looking straight down
    const topViewPos = new THREE.Vector3(0, 300, 1);

    // Current target we are animating to
    const currentTargetPos = useRef(new THREE.Vector3());

    // Center of the terminal - fixed target
    const center = new THREE.Vector3(0, 0, 0);

    // Start position (High overhead view - "Middle of terminal")
    const startPos = new THREE.Vector3(0, 500, 10);

    useEffect(() => {
        const handleMoveToTop = () => {
            if (!isLoading) {
                // Cancel any other animations first
                window.dispatchEvent(new CustomEvent('cancelAnimations', { detail: { source: 'topView' } }));

                currentTargetPos.current.copy(topViewPos);
                setIsAnimating(true);
                if (controlsRef.current) {
                    controlsRef.current.enabled = false;
                }
            }
        };

        const handleResetToInitial = () => {
            if (!isLoading) {
                // Cancel any other animations first
                window.dispatchEvent(new CustomEvent('cancelAnimations', { detail: { source: 'resetToInitial' } }));

                currentTargetPos.current.copy(standardPos);
                setIsAnimating(true);
                if (controlsRef.current) {
                    controlsRef.current.enabled = false;
                }
            }
        };

        const handleCancelAnimations = (e: any) => {
            // If another animation is starting, cancel this one
            const validSources = ['topView', 'resetToInitial'];
            if (!validSources.includes(e.detail?.source) && isAnimating) {
                setIsAnimating(false);
                if (controlsRef.current) {
                    controlsRef.current.enabled = true;
                }
            }
        };

        window.addEventListener('moveCameraToTop', handleMoveToTop);
        window.addEventListener('resetCameraToInitial', handleResetToInitial);
        window.addEventListener('cancelAnimations', handleCancelAnimations);
        return () => {
            window.removeEventListener('moveCameraToTop', handleMoveToTop);
            window.removeEventListener('resetCameraToInitial', handleResetToInitial);
            window.removeEventListener('cancelAnimations', handleCancelAnimations);
        };
    }, [isLoading, isAnimating, controlsRef]);

    useEffect(() => {
        if (isLoading) {
            // Lock camera to start position
            camera.position.copy(startPos);
            camera.lookAt(center);
            if (controlsRef.current) {
                controlsRef.current.target.copy(center);
                controlsRef.current.enabled = false;
            }
        } else {
            // Trigger initial animation when loading finishes
            // Only if we haven't already done it (simple check: if we are at startPos)
            if (camera.position.distanceTo(startPos) < 1.0) {
                currentTargetPos.current.copy(standardPos);
                setIsAnimating(true);
            }
        }
    }, [isLoading, camera, controlsRef]);

    useFrame((_, delta) => {
        if (isLoading) {
            // Enforce start position during loading
            camera.position.copy(startPos);
            camera.lookAt(center);
            if (controlsRef.current) {
                controlsRef.current.target.copy(center);
                if (controlsRef.current.enabled) controlsRef.current.enabled = false;
            }
            return;
        }

        if (isAnimating && controlsRef.current) {
            // Smoothly interpolate to target position using Spherical coordinates
            // This ensures we orbit around the center rather than cutting through it,
            // providing simultaneous alignment with the axes.
            const lerpFactor = 3.0 * delta;

            const currentSpherical = new THREE.Spherical().setFromVector3(camera.position);
            const targetSpherical = new THREE.Spherical().setFromVector3(currentTargetPos.current);

            // Handle shortest path for theta (azimuth) to avoid spinning the long way
            let deltaTheta = targetSpherical.theta - currentSpherical.theta;
            while (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI;
            while (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI;

            // Interpolate spherical coordinates
            currentSpherical.theta += deltaTheta * lerpFactor;
            currentSpherical.phi = THREE.MathUtils.lerp(currentSpherical.phi, targetSpherical.phi, lerpFactor);
            currentSpherical.radius = THREE.MathUtils.lerp(currentSpherical.radius, targetSpherical.radius, lerpFactor);

            // Apply new position
            camera.position.setFromSpherical(currentSpherical);

            // CRITICAL: Force camera to look at center during animation
            camera.lookAt(center);

            // Keep controls target at center
            controlsRef.current.target.copy(center);

            // Check completion
            if (camera.position.distanceTo(currentTargetPos.current) < 0.5) {
                // Snap to exact position to ensure perfect alignment
                camera.position.copy(currentTargetPos.current);
                camera.lookAt(center);

                setIsAnimating(false);

                // Re-enable controls but disable damping momentarily to prevent drift
                controlsRef.current.enabled = true;
                controlsRef.current.enableDamping = false;
                controlsRef.current.update();

                // Re-enable damping on the next frame
                setTimeout(() => {
                    if (controlsRef.current) {
                        controlsRef.current.enableDamping = true;
                    }
                }, 100);
            }
        }
    });

    return null;
}
