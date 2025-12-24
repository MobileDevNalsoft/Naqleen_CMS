import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/store';
import { Line } from '@react-three/drei';

/**
 * RestackConnectionLine - Renders visual arc line for restacking operation
 * Shows curved line from current container position to the new proposed position
 */
export default function RestackConnectionLine() {
    const restackLine = useStore(state => state.restackLine);
    const entities = useStore(state => state.entities);

    // Calculate arc curve points
    const connectionLine = useMemo(() => {
        if (!restackLine) return null;

        const fromEntity = entities[restackLine.fromId];
        if (!fromEntity) return null;

        const toPos = restackLine.toPosition;

        // Start and end points (center of containers, slightly above)
        const start = new THREE.Vector3(fromEntity.x, fromEntity.y + 2, fromEntity.z);
        const end = new THREE.Vector3(toPos.x, toPos.y + 2, toPos.z);

        // Calculate midpoint and arc height
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const distance = start.distanceTo(end);
        const arcHeight = Math.max(15, distance * 0.3); // Arc height proportional to distance

        // Control point for the arc (above the midpoint)
        const controlPoint = new THREE.Vector3(
            midPoint.x,
            midPoint.y + arcHeight,
            midPoint.z
        );

        // Create quadratic bezier curve points
        const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
        const points = curve.getPoints(32); // 32 segments for smooth curve

        return {
            points,
            start,
            end
        };
    }, [restackLine, entities]);

    if (!connectionLine) return null;

    return (
        <group>
            {/* Main arc line - amber/orange color for restack */}
            < Line
                points={connectionLine.points}
                color="#f59e0b"
                lineWidth={3}
                dashed={true}
                dashScale={2}
                dashSize={0.5}
                gapSize={0.2}
            />

            {/* Start point marker */}
            <mesh position={connectionLine.start} >
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial
                    color="#f59e0b"
                    emissive="#d97706"
                    emissiveIntensity={0.6}
                />
            </mesh>

            {/* End point marker - slightly pulsating? (handled by ghost container, so maybe just simple) */}
            <mesh position={connectionLine.end} >
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial
                    color="#22c55e"
                    emissive="#16a34a"
                    emissiveIntensity={0.6}
                />
            </mesh>
        </group>
    );
}
