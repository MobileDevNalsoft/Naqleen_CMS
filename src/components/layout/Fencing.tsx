import { useMemo } from 'react';
import { useStore } from '../../store/store';

export default function Fencing() {
    const layout = useStore((state) => state.layout);

    // Calculate fence positions from layout with padding
    const YARD_PADDING = 20; // Same padding as Environment.tsx

    const fenceBounds = useMemo(() => {
        // Default values
        let width = 760;
        let height = 145;

        let paddedCornerPoints: Array<{ x: number; z: number }> | undefined;

        if (layout?.total_dimensions) {
            width = layout.total_dimensions.width;
            height = layout.total_dimensions.height;
            const corner_points = layout.total_dimensions.corner_points;

            if (corner_points && corner_points.length > 0) {
                // For L-shaped yards, we need proper polygon offset
                paddedCornerPoints = corner_points.map((pt, i) => {
                    const prev = corner_points[(i - 1 + corner_points.length) % corner_points.length];
                    const next = corner_points[(i + 1) % corner_points.length];

                    const prevDx = pt.x - prev.x;
                    const prevDz = pt.z - prev.z;
                    const nextDx = next.x - pt.x;
                    const nextDz = next.z - pt.z;

                    const prevLen = Math.sqrt(prevDx * prevDx + prevDz * prevDz) || 1;
                    const prevNx = -prevDz / prevLen;
                    const prevNz = prevDx / prevLen;

                    const nextLen = Math.sqrt(nextDx * nextDx + nextDz * nextDz) || 1;
                    const nextNx = -nextDz / nextLen;
                    const nextNz = nextDx / nextLen;

                    let avgNx = (prevNx + nextNx) / 2;
                    let avgNz = (prevNz + nextNz) / 2;
                    const avgLen = Math.sqrt(avgNx * avgNx + avgNz * avgNz) || 1;
                    avgNx /= avgLen;
                    avgNz /= avgLen;

                    return {
                        x: pt.x + avgNx * YARD_PADDING,
                        z: pt.z + avgNz * YARD_PADDING
                    };
                });
            }
        }

        // Fence positions are at the padded edges (outside the original yard)
        return {
            eastFenceX: width / 2 + YARD_PADDING,
            westFenceX: -width / 2 - YARD_PADDING,
            northFenceZ: -height / 2 - YARD_PADDING,
            southFenceZ: height / 2 + YARD_PADDING,
            totalWidth: width + YARD_PADDING * 2,
            totalDepth: height + YARD_PADDING * 2,
            paddedCornerPoints
        };
    }, [layout]);

    const { eastFenceX, westFenceX, northFenceZ, southFenceZ, totalWidth, totalDepth, paddedCornerPoints } = fenceBounds;

    // Calculate number of posts (one at each end + evenly spaced in between)
    const postSpacing = 10;
    const numHorizontalPosts = Math.floor(totalWidth / postSpacing) + 1;
    const numVerticalPosts = Math.floor(totalDepth / postSpacing) + 1;

    // If using polygon shape
    if (paddedCornerPoints && paddedCornerPoints.length > 2) {
        return (
            <group>
                {paddedCornerPoints.map((p1, i) => {
                    const p2 = paddedCornerPoints[(i + 1) % paddedCornerPoints.length];

                    const dx = p2.x - p1.x;
                    const dz = p2.z - p1.z;
                    const length = Math.sqrt(dx * dx + dz * dz);
                    const angle = Math.atan2(dz, dx); // Rotation around Y

                    // Midpoint for wall position
                    const mx = (p1.x + p2.x) / 2;
                    const mz = (p1.z + p2.z) / 2;

                    // Check if this is the "West" edge with gates
                    // It should be vertical (dx ~ 0) and at the far west (leftmost x)
                    const minX = Math.min(...paddedCornerPoints.map(p => p.x));
                    const isWestEdge = Math.abs(dx) < 1 && Math.abs(p1.x - minX) < 5;

                    // Calculate posts for this segment
                    const numPosts = Math.ceil(length / postSpacing);

                    return (
                        <group key={`seg-${i}`}>
                            {/* Wall Segments */}
                            {isWestEdge ? (
                                /* Gate Logic for West Edge */
                                <group rotation={[0, -angle, 0]} position={[mx, 1.5, mz]}>
                                    {/* Transform local Z coordinates to world Z for gate check? No, difficult with rotation.
                                        Easier to check world Z if the line is vertical. 
                                        Since isWestEdge implies vertical, z varies from p1.z to p2.z.
                                    */}
                                    {/* Wait, the existing gate logic relies on absolute Z positions. 
                                        If we are rotating, we need to be careful.
                                        Since isWestEdge means angle is -PI/2 or PI/2.
                                        Let's stick to world coordinates for the west edge segments.
                                    */}
                                </group>
                            ) : (
                                /* Standard Solid Wall */
                                <mesh position={[mx, 1.5, mz]} rotation={[0, -angle, 0]}>
                                    <boxGeometry args={[length, 3, 0.2]} />
                                    <meshStandardMaterial color="#555" transparent opacity={0.5} />
                                </mesh>
                            )}

                            {/* Special handling for West Edge rendering in World Space if it is vertical */}
                            {isWestEdge && (() => {
                                const segments = [];
                                // Gate gaps: [-42.9 to -27.9] and [-12.5 to 2.5]
                                // We need to cover the range from minZ to maxZ excluding these gaps
                                const minZ = Math.min(p1.z, p2.z);
                                const maxZ = Math.max(p1.z, p2.z);

                                // Define gates: Entry and Exit, each 16m
                                // ENTRY center at z=-22: gap -30 to -14
                                // EXIT center at z=-42: gap -50 to -34
                                const gaps = [
                                    { start: -50, end: -34, label: 'EXIT' },
                                    { start: -30, end: -14, label: 'ENTRY' }
                                ];

                                // Create solid segments
                                // Start from minZ
                                let currentZ = minZ;

                                // Sort gaps by start position just in case
                                gaps.sort((a, b) => a.start - b.start);

                                gaps.forEach(gap => {
                                    // Segment before gap
                                    if (gap.start > currentZ && gap.start < maxZ) {
                                        const segStart = currentZ;
                                        const segEnd = Math.min(gap.start, maxZ);
                                        const segLen = segEnd - segStart;
                                        const segMid = (segStart + segEnd) / 2;
                                        if (segLen > 0.1) {
                                            segments.push(
                                                <mesh key={`w-seg-${segMid}`} position={[p1.x, 1.5, segMid]} rotation={[0, Math.PI / 2, 0]}>
                                                    <boxGeometry args={[segLen, 3, 0.2]} />
                                                    <meshStandardMaterial color="#555" transparent opacity={0.5} />
                                                </mesh>
                                            );
                                        }
                                    }
                                    // Move past gap
                                    currentZ = Math.max(currentZ, gap.end);
                                });

                                // Final segment after last gap
                                if (currentZ < maxZ) {
                                    const segLen = maxZ - currentZ;
                                    const segMid = (currentZ + maxZ) / 2;
                                    if (segLen > 0.1) {
                                        segments.push(
                                            <mesh key={`w-seg-final`} position={[p1.x, 1.5, segMid]} rotation={[0, Math.PI / 2, 0]}>
                                                <boxGeometry args={[segLen, 3, 0.2]} />
                                                <meshStandardMaterial color="#555" transparent opacity={0.5} />
                                            </mesh>
                                        );
                                    }
                                }

                                return segments;
                            })()}

                            {/* Posts for this segment */}
                            {Array.from({ length: numPosts }).map((_, j) => {
                                const t = j / numPosts;
                                const px = p1.x + dx * t;
                                const pz = p1.z + dz * t;

                                // Skip posts in gate gaps if valid west edge
                                if (isWestEdge) {
                                    // Gate gaps: Exit [-50 to -34] and Entry [-30 to -14]
                                    if ((pz > -50 && pz < -34) || (pz > -30 && pz < -14)) return null;
                                }

                                return (
                                    <mesh key={`post-${i}-${j}`} position={[px, 1.5, pz]}>
                                        <boxGeometry args={[0.5, 3.5, 0.5]} />
                                        <meshStandardMaterial color="#333" />
                                    </mesh>
                                );
                            })}
                        </group>
                    );
                })}
            </group>
        );
    }

    // Default Rectangular Fencing
    return (
        <group>
            {/* ========== PERIMETER FENCES ========== */}

            {/* NORTH FENCE - Full width centered at x=0 */}
            <mesh position={[0, 1.5, northFenceZ]}>
                <boxGeometry args={[totalWidth, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* SOUTH FENCE - Full width centered at x=0 */}
            <mesh position={[0, 1.5, southFenceZ]}>
                <boxGeometry args={[totalWidth, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* EAST FENCE - Right side (solid, no gates) */}
            <mesh position={[eastFenceX, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[totalDepth, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* ========== OUTER WEST FENCE (with gates) ========== */}
            {/* Gate OUT: z: -42.9 to -27.9 (width: 15) */}
            {/* Gate IN: z: -12.5 to 2.5 (width: 15) */}

            {/* Calculate segment lengths based on new fence Z positions */}
            {/* Segment 1: Top section (from 2.5 to southFenceZ) */}
            <mesh position={[westFenceX, 1.5, (2.5 + southFenceZ) / 2]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[southFenceZ - 2.5, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* Segment 2: Between gates (z: -27.9 to -12.5 = 15.4 units) */}
            <mesh position={[westFenceX, 1.5, -20.2]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[15.4, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* Segment 3: Bottom section (from northFenceZ to -42.9) */}
            <mesh position={[westFenceX, 1.5, (northFenceZ + (-42.9)) / 2]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[-42.9 - northFenceZ, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* ========== FENCE POSTS ========== */}

            {/* North edge posts - properly spaced from west to east */}
            {Array.from({ length: numHorizontalPosts }).map((_, i) => {
                const x = westFenceX + i * postSpacing;
                if (x > eastFenceX) return null;
                return (
                    <mesh key={`n-${i}`} position={[x, 1.5, northFenceZ]}>
                        <boxGeometry args={[0.5, 3.5, 0.5]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                );
            })}
            {/* Corner post at exact east-north corner */}
            <mesh position={[eastFenceX, 1.5, northFenceZ]}>
                <boxGeometry args={[0.5, 3.5, 0.5]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* South edge posts - properly spaced from west to east */}
            {Array.from({ length: numHorizontalPosts }).map((_, i) => {
                const x = westFenceX + i * postSpacing;
                if (x > eastFenceX) return null;
                return (
                    <mesh key={`s-${i}`} position={[x, 1.5, southFenceZ]}>
                        <boxGeometry args={[0.5, 3.5, 0.5]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                );
            })}
            {/* Corner post at exact east-south corner */}
            <mesh position={[eastFenceX, 1.5, southFenceZ]}>
                <boxGeometry args={[0.5, 3.5, 0.5]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* East edge posts (skip corners, already placed) */}
            {Array.from({ length: numVerticalPosts - 2 }).map((_, i) => (
                <mesh key={`e-${i}`} position={[eastFenceX, 1.5, northFenceZ + (i + 1) * postSpacing]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            ))}

            {/* Outer west posts (skip gate gaps) */}
            {Array.from({ length: numVerticalPosts }).map((_, i) => {
                const z = northFenceZ + i * postSpacing;
                if ((z > -43 && z < -27) || (z > -13 && z < 3)) return null;
                return (
                    <mesh key={`ow-${i}`} position={[westFenceX, 1.5, z]}>
                        <boxGeometry args={[0.5, 3.5, 0.5]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                );
            })}
        </group>
    );
}
