import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface CityTrafficProps {
    trackWaypoints?: THREE.Vector3[];
    waypoints?: THREE.Vector3[];
}

interface TrackCar {
    progress: number; // 0 to 1 along the curve
    speed: number;
    scene?: THREE.Object3D;
}

export default function CityTraffic({ trackWaypoints }: CityTrafficProps) {
    const gltf = useGLTF('/assets/glbs/truck.glb');
    const truckScene = gltf.scene;

    // --- Create Smooth Curve ---
    const trackCurve = useMemo(() => {
        if (!trackWaypoints || trackWaypoints.length < 2) return null;

        // Check if track is effectively closed (loop)
        // If distance between first and last is small, it's a closed loop
        const first = trackWaypoints[0];
        const last = trackWaypoints[trackWaypoints.length - 1];
        const isClosed = first.distanceTo(last) < 50;

        return new THREE.CatmullRomCurve3(trackWaypoints, isClosed, 'catmullrom', 0.5);
    }, [trackWaypoints]);

    // --- Init Cars ---
    const trackCars = useMemo(() => {
        if (!trackCurve || !truckScene) return [];

        const c: TrackCar[] = [];
        // 3 Trucks
        for (let i = 0; i < 3; i++) {
            const clone = truckScene.clone(true);
            clone.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Start evenly spaced along t (0 to 1)
            const startT = (1.0 / 3) * i;

            c.push({
                progress: startT,
                speed: 50.0, // High speed requested
                scene: clone
            });
        }
        return c;
    }, [trackCurve, truckScene]);

    // Helpers
    const tempVec = useMemo(() => new THREE.Vector3(), []);
    const tempTarget = useMemo(() => new THREE.Vector3(), []);

    // PERF FIX: Cache curve length instead of computing every frame
    const curveLength = useMemo(() => trackCurve?.getLength() || 1, [trackCurve]);

    useFrame((_, delta) => {
        if (trackCurve && trackCars.length > 0) {
            trackCars.forEach((car) => {
                if (!car.scene) return;

                // Advance progress based on real distance
                // speed (units/sec) * delta (sec) / totalLength = portion of curve
                const advance = (car.speed * delta) / (curveLength || 1);

                car.progress += advance;
                if (car.progress >= 1) {
                    car.progress %= 1; // Wrap around for infinite loop
                }

                // Smooth Position
                trackCurve.getPointAt(car.progress, tempVec);
                tempVec.y += 1.5;
                car.scene.position.copy(tempVec);

                // Smooth Orientation (Tangent)
                // getTangentAt gives the normalized direction vector at t
                const tangent = trackCurve.getTangentAt(car.progress);

                // We want to look ALONG the tangent.
                // calculate target = currentPos + tangent
                tempTarget.copy(tempVec).add(tangent);

                // Important: Since we Lifted Y, we should keep look target at same Y
                // actually tangent might dip up/down on hills. 
                // But the truck model assumes flat-ish ground mostly. 
                // If we want it to tilt up/down hills, use tangent as is.

                car.scene.lookAt(tempTarget);

                // FIX: If model is BACKWARDS (facing -Z), looking at target (+Z) makes it face away.
                // Previous logic used lookAt(PREVIOUS). 
                // Let's check: Tangent points forward.
                // If I lookAt(Pos + Tangent), I am looking forward.
                // If the model is -Z forward, it will face BACKWARDS relative to tangent.
                // so we need to LookAt(Pos - Tangent)? Or rotate scene?
                // Previously: lookAt(p1) where p1 was "start of segment".
                // Moving from p1 to p2. LookAt(p1) = Looking Backwards.
                // So yes, we need to look BACKWARDS.
                // Target = Pos - Tangent.
                tempTarget.copy(tempVec).sub(tangent);
                car.scene.lookAt(tempTarget);

                car.scene.scale.set(2.5, 2.5, 2.5);
            });
        }
    });

    return (
        <group>
            {trackCars.map((car, index) => (
                car.scene && <primitive key={`track-${index}`} object={car.scene} />
            ))}
        </group>
    );
}
