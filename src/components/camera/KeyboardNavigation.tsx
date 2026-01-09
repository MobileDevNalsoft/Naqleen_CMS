import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useUIStore } from '../../store/uiStore';

interface KeyboardNavigationProps {
    controlsRef: React.RefObject<any>;
    speed?: number; // Movement speed
}

export function KeyboardNavigation({ controlsRef, speed = 3 }: KeyboardNavigationProps) {
    const { camera } = useThree();
    const isSearchFocused = useUIStore(state => state.isSearchFocused);
    const activePanel = useUIStore(state => state.activePanel);

    // Track pressed keys
    const keysPressed = useRef<{ [key: string]: boolean }>({});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if search is focused or settings is open
            if (isSearchFocused || activePanel === 'settings') return;
            keysPressed.current[e.key.toLowerCase()] = true;
            if (e.key.startsWith('Arrow')) {
                // Map arrows to wasd for easier logic or just track them
                keysPressed.current[e.key] = true;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current[e.key.toLowerCase()] = false;
            if (e.key.startsWith('Arrow')) {
                keysPressed.current[e.key] = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isSearchFocused, activePanel]);

    useFrame((_, delta) => {
        if (!controlsRef.current) return;

        // 1. Get Inputs (Hoist all key checks)
        const isForward = keysPressed.current['w'] || keysPressed.current['arrowup'];
        const isBackward = keysPressed.current['s'] || keysPressed.current['arrowdown'];
        const isLeft = keysPressed.current['a'] || keysPressed.current['arrowleft'];
        const isRight = keysPressed.current['d'] || keysPressed.current['arrowright'];
        const isR = keysPressed.current['r'];
        const isShift = keysPressed.current['shift'];

        // 2. Calculate Speed (Hoist speed calc)
        const zoomFactor = Math.max(1, camera.position.y / 50);
        const moveSpeed = speed * zoomFactor * delta * 60;

        // Check active inputs (using hoisted var)

        // Rotation Mode (Holding R)
        if (isR) {
            const rotateSpeed = 2 * delta; // Rotation speed
            const isRotateLeft = keysPressed.current['arrowleft'];
            const isRotateRight = keysPressed.current['arrowright'];
            const isRotateUp = keysPressed.current['arrowup'];
            const isRotateDown = keysPressed.current['arrowdown'];

            if (!isRotateLeft && !isRotateRight && !isRotateUp && !isRotateDown) return;

            // Calculate offset from target
            const offset = new THREE.Vector3().copy(camera.position).sub(controlsRef.current.target);

            // Convert to Spherical coordinates for easy rotation handling
            const spherical = new THREE.Spherical().setFromVector3(offset);

            if (isRotateLeft) spherical.theta += rotateSpeed;
            if (isRotateRight) spherical.theta -= rotateSpeed;

            if (isRotateUp) spherical.phi -= rotateSpeed;
            if (isRotateDown) spherical.phi += rotateSpeed;

            // Clamp vertical rotation (Polar Angle)
            // Prevent going below ground (approx PI/2) and Flipping (0)
            const minPolarAngle = 0.1;
            const maxPolarAngle = Math.PI / 2 - 0.05; // Slightly above ground
            spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));

            spherical.makeSafe();

            // Apply new position
            offset.setFromSpherical(spherical);
            camera.position.copy(controlsRef.current.target).add(offset);
            camera.lookAt(controlsRef.current.target);

            return; // Skip movement if rotating
        }

        // Vertical Movement Mode (Holding Shift)
        if (isShift) {
            const liftSpeed = moveSpeed * 1.5; // Slightly faster for elevation

            if (isForward) { // Up Arrow / W
                // Move Up (Increase Y) - Zoom Out effect
                camera.position.y += liftSpeed;
            }
            if (isBackward) { // Down Arrow / S
                // Move Down (Decrease Y) - Zoom In effect
                if (camera.position.y > 5) { // Minimum height floor
                    camera.position.y -= liftSpeed;
                }
            }

            // Allow horizontal strafe while elevating? Yes
            if (isLeft) {
                const right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
                const strafe = right.clone().multiplyScalar(-moveSpeed);
                camera.position.add(strafe);
                controlsRef.current.target.add(strafe);
            }
            if (isRight) {
                const right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
                const strafe = right.clone().multiplyScalar(moveSpeed);
                camera.position.add(strafe);
                controlsRef.current.target.add(strafe);
            }

            return;
        }

        // Standard Translation Mode (XZ Plane)
        if (!isForward && !isBackward && !isLeft && !isRight) return;

        // Adjust speed by zoom level (ALREADY CALCULATED ABOVE)

        // Get Camera Directions relative to ground (XZ plane only)
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, camera.up).normalize();

        const moveVector = new THREE.Vector3(0, 0, 0);

        if (isForward) moveVector.add(forward);
        if (isBackward) moveVector.sub(forward);
        if (isRight) moveVector.add(right);
        if (isLeft) moveVector.sub(right);

        // Normalize if moving diagonally so speed isn't faster
        if (moveVector.lengthSq() > 0) {
            moveVector.normalize().multiplyScalar(moveSpeed);

            // Apply movement to BOTH camera and controls target
            camera.position.add(moveVector);
            controlsRef.current.target.add(moveVector);
        }
    });

    return null;
}
