import { useGLTF } from '@react-three/drei';
import { useMemo, useLayoutEffect, useState } from 'react';
import * as THREE from 'three';
import CityTraffic from './CityTraffic';

export default function CityModel() {
    // Enable Draco compression decoding
    const { scene } = useGLTF('/assets/glbs/city_with_track.glb', true);

    const clonedScene = useMemo(() => scene.clone(), [scene]);

    // Track points only
    const [trackWaypoints, setTrackWaypoints] = useState<THREE.Vector3[]>([]);

    useLayoutEffect(() => {
        // Materials
        const roadMaterial = new THREE.MeshBasicMaterial({
            color: '#adadad',
        });

        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 1.0,
            metalness: 0.0,
            flatShading: true
        });

        const vegetationMaterial = new THREE.MeshBasicMaterial({
            color: '#64cf51',
        });

        const trackPoints: THREE.Vector3[] = [];

        clonedScene.traverse((child: any) => {
            if (child.isMesh) {
                const grandParentName = child.parent?.parent ? child.parent.parent.name.toLowerCase() : '';
                const roadName = child.parent?.name.toLowerCase() || '';

                if (grandParentName.includes('roads')) {
                    child.material = roadMaterial;
                    child.receiveShadow = true;

                    if (child.geometry && child.geometry.attributes.position) {
                        const positions = child.geometry.attributes.position;
                        const count = positions.count;
                        const v3 = new THREE.Vector3();
                        let lastPoint: THREE.Vector3 | null = null;

                        // Decide array based on name
                        const isTrack = roadName.includes('track');

                        // ONLY track points, ignore others
                        if (isTrack) {
                            const distThreshold = 5;

                            for (let i = 0; i < count; i += 5) {
                                v3.fromBufferAttribute(positions, i);
                                const worldPoint = v3.clone().applyMatrix4(child.matrixWorld);

                                if (!lastPoint || worldPoint.distanceTo(lastPoint) > distThreshold) {
                                    trackPoints.push(worldPoint);
                                    lastPoint = worldPoint;
                                }
                            }
                        }
                    }

                } else if (grandParentName.includes('vegetation')) {
                    child.material = vegetationMaterial;
                    child.castShadow = true;
                    child.receiveShadow = true;
                } else {
                    child.material = buildingMaterial;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            }
        });

        // SORT TRACK POINTS LINEARLY
        if (trackPoints.length > 1) {
            let endPointB = trackPoints[0];
            let maxDist = 0;
            trackPoints.forEach(p => {
                const d = p.distanceTo(trackPoints[0]);
                if (d > maxDist) {
                    maxDist = d;
                    endPointB = p;
                }
            });

            trackPoints.sort((a, b) => a.distanceTo(endPointB) - b.distanceTo(endPointB));
        }

        setTrackWaypoints(trackPoints);
    }, [clonedScene]);

    return (
        <>
            <primitive
                object={clonedScene}
                position={[0, 1, 0]}
                scale={[1, 1, 1]}
                receiveShadow
                castShadow
            />
            {/* Pass only track points */}
            <CityTraffic
                waypoints={[]} // Empty generic points
                trackWaypoints={trackWaypoints.length > 0 ? trackWaypoints : undefined}
            />
        </>
    );
}

// Preload with Draco enabled
useGLTF.preload('/assets/glbs/city_with_track.glb', true);
