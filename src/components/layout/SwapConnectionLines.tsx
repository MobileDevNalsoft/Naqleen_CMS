import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/store';
import { Line } from '@react-three/drei';

/**
 * SwapConnectionLines - Renders visual arc lines between swap container pairs
 * Shows curved lines from original containers to their replacement containers
 */
export default function SwapConnectionLines() {
    const swapConnections = useStore(state => state.swapConnections);
    const entities = useStore(state => state.entities);

    // Calculate arc curve points for each connection
    const connectionLines = useMemo(() => {
        if (swapConnections.length === 0) return [];

        return swapConnections.map((conn, index) => {
            const fromEntity = entities[conn.from];
            const toEntity = entities[conn.to];

            if (!fromEntity || !toEntity) return null;

            // Start and end points (center of containers, slightly above)
            const start = new THREE.Vector3(fromEntity.x, fromEntity.y + 2, fromEntity.z);
            const end = new THREE.Vector3(toEntity.x, toEntity.y + 2, toEntity.z);

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
                key: `${conn.from}-${conn.to}-${index}`,
                points,
                from: conn.from,
                to: conn.to
            };
        }).filter(Boolean);
    }, [swapConnections, entities]);

    if (connectionLines.length === 0) return null;

    return (
        <group>
            {connectionLines.map((line) => (
                <group key={line!.key}>
                    {/* Main arc line - cyan/teal color */}
                    <Line
                        points={line!.points}
                        color="#00b4d8"
                        lineWidth={2}
                        dashed={true}
                        dashScale={2}
                        dashSize={0.5}
                        gapSize={0.2}
                    />

                    {/* Red sphere at original container (being swapped out) */}
                    <mesh position={line!.points[0]}>
                        <sphereGeometry args={[0.5, 16, 16]} />
                        <meshStandardMaterial
                            color="#f87171"
                            emissive="#ef4444"
                            emissiveIntensity={0.6}
                        />
                    </mesh>

                    {/* Green sphere at replacement container */}
                    <mesh position={line!.points[line!.points.length - 1]}>
                        <sphereGeometry args={[0.5, 16, 16]} />
                        <meshStandardMaterial
                            color="#4ade80"
                            emissive="#22c55e"
                            emissiveIntensity={0.6}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
