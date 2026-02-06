import { useFrame } from '@react-three/fiber';

interface CameraBoundsProps {
    controlsRef: React.RefObject<any>;
}

export function CameraBounds({ controlsRef }: CameraBoundsProps) {
    useFrame(() => {
        if (!controlsRef.current) return;

        const target = controlsRef.current.target;

        // Expanded boundaries for the 3D environment
        const minX = -900;
        const maxX = 900;
        const minZ = -900;
        const maxZ = 900;

        // Gentle Clamping: strictly enforce but without breaking the event loop
        // We modify the target vector directly which is safe in useFrame loop
        // as opposed to onChange which triggers internal re-calcs
        let changed = false;

        if (target.x < minX) { target.x = minX; changed = true; }
        if (target.x > maxX) { target.x = maxX; changed = true; }
        if (target.z < minZ) { target.z = minZ; changed = true; }
        if (target.z > maxZ) { target.z = maxZ; changed = true; }

        // Clamp Y to prevent going underground
        if (target.y < -1) { target.y = -1; changed = true; }

        if (changed) {
            controlsRef.current.update();
        }
    });

    return null;
}
