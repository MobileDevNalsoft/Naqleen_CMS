export default function Fencing() {
    // Extended yard bounds: x: -458 to +200, z: -92.5 to +92.5
    // Gate positions: Gate IN (z: -12.5 to 2.5), Gate OUT (z: -42.9 to -27.9)

    // Helper function to generate fence posts
    const generatePosts = (
        xPos: number,
        startZ: number,
        count: number,
        spacing: number,
        skipGates: boolean,
        keyPrefix: string
    ) => {
        return Array.from({ length: count }).map((_, i) => {
            const z = startZ + i * spacing;
            // Skip posts in gate gaps if needed
            if (skipGates && ((z > -43 && z < -27) || (z > -13 && z < 3))) return null;
            return (
                <mesh key={`${keyPrefix}-${i}`} position={[xPos, 1.5, z]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            );
        });
    };

    return (
        <group>
            {/* ========== PERIMETER FENCES ========== */}

            {/* NORTH FENCE - Full width from x:-458 to x:+200 */}
            <mesh position={[-129, 1.5, -92.5]}>
                <boxGeometry args={[658, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* SOUTH FENCE - Full width from x:-458 to x:+200 */}
            <mesh position={[-129, 1.5, 92.5]}>
                <boxGeometry args={[658, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* EAST FENCE - Right side at x=200 (solid, no gates) */}
            <mesh position={[200, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[185, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* ========== OUTER WEST FENCE at x=-458 (with gates) ========== */}
            {/* Gate OUT: z: -42.9 to -27.9 (width: 15) */}
            {/* Gate IN: z: -12.5 to 2.5 (width: 15) */}

            {/* Segment 1: Top section (z: 2.5 to 92.5 = 90 units) */}
            <mesh position={[-458, 1.5, 47.5]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[90, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* Segment 2: Between gates (z: -27.9 to -12.5 = 15.4 units) */}
            <mesh position={[-458, 1.5, -20.2]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[15.4, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* Segment 3: Bottom section (z: -92.5 to -42.9 = 49.6 units) */}
            <mesh position={[-458, 1.5, -67.7]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[49.6, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* ========== INTERNAL FENCE at x=-200 (divider with gates) ========== */}
            {/* Same gate configuration as outer fence */}

            {/* Segment 1: Top section (z: 2.5 to 92.5) */}
            <mesh position={[-200, 1.5, 47.5]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[90, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* Segment 2: Between gates (z: -27.9 to -12.5) */}
            <mesh position={[-200, 1.5, -20.2]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[15.4, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* Segment 3: Bottom section (z: -92.5 to -42.9) */}
            <mesh position={[-200, 1.5, -67.7]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[49.6, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* ========== FENCE POSTS ========== */}

            {/* North edge posts (every 10m) */}
            {generatePosts(-458, -92.5, 67, 10, false, 'n').map((post, i) =>
                post && <mesh key={`n-${i}`} position={[-458 + i * 10, 1.5, -92.5]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            )}

            {/* South edge posts (every 10m) */}
            {Array.from({ length: 67 }).map((_, i) => (
                <mesh key={`s-${i}`} position={[-458 + i * 10, 1.5, 92.5]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            ))}

            {/* East edge posts (every 10m) */}
            {Array.from({ length: 19 }).map((_, i) => (
                <mesh key={`e-${i}`} position={[200, 1.5, -92.5 + i * 10]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            ))}

            {/* Outer west posts at x=-458 (skip gate gaps) */}
            {Array.from({ length: 19 }).map((_, i) => {
                const z = -92.5 + i * 10;
                if ((z > -43 && z < -27) || (z > -13 && z < 3)) return null;
                return (
                    <mesh key={`ow-${i}`} position={[-458, 1.5, z]}>
                        <boxGeometry args={[0.5, 3.5, 0.5]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                );
            })}

            {/* Internal west posts at x=-200 (skip gate gaps) */}
            {Array.from({ length: 19 }).map((_, i) => {
                const z = -92.5 + i * 10;
                if ((z > -43 && z < -27) || (z > -13 && z < 3)) return null;
                return (
                    <mesh key={`iw-${i}`} position={[-200, 1.5, z]}>
                        <boxGeometry args={[0.5, 3.5, 0.5]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                );
            })}
        </group>
    );
}
