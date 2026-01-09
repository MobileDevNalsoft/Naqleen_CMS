
import { useMemo, useRef, useLayoutEffect } from 'react';
import { useStore } from '../../store/store';
import * as THREE from 'three';

// --- Shared Materials (Module Scope) ---
const postMaterial = new THREE.MeshStandardMaterial({ color: '#333' });
const panelMaterial = new THREE.MeshStandardMaterial({ color: '#555', transparent: true, opacity: 0.5 });

export default function Fencing() {
    const layout = useStore((state) => state.layout);

    // Calculate fence positions from layout with padding
    const YARD_PADDING = 20;

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
    const postSpacing = 10;

    // InstancedMesh Refs
    const postsRef = useRef<THREE.InstancedMesh>(null);
    const panelsRef = useRef<THREE.InstancedMesh>(null);

    // Calculate Matrices
    useLayoutEffect(() => {
        const posts = postsRef.current;
        const panels = panelsRef.current;
        if (!posts || !panels) return;

        const dummy = new THREE.Object3D();
        let postIndex = 0;
        let panelIndex = 0;

        // Helper to add Post
        const addPost = (x: number, z: number) => {
            dummy.position.set(x, 1.5, z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            posts.setMatrixAt(postIndex++, dummy.matrix);
        };

        // Helper to add Panel
        const addPanel = (x: number, z: number, length: number, rotationY: number) => {
            dummy.position.set(x, 1.5, z);
            dummy.rotation.set(0, rotationY, 0);
            dummy.scale.set(length, 1, 1); // Scale X to match length
            dummy.updateMatrix();
            panels.setMatrixAt(panelIndex++, dummy.matrix);
        };

        if (paddedCornerPoints && paddedCornerPoints.length > 2) {
            // POLYGON MODE
            paddedCornerPoints.forEach((p1, i) => {
                const p2 = paddedCornerPoints[(i + 1) % paddedCornerPoints.length];
                const dx = p2.x - p1.x;
                const dz = p2.z - p1.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                const numPosts = Math.ceil(length / postSpacing);

                // West Edge check (simplified)
                const minX = Math.min(...paddedCornerPoints.map(p => p.x));
                const isWestEdge = Math.abs(dx) < 1 && Math.abs(p1.x - minX) < 5;

                // Add Posts
                for (let j = 0; j < numPosts; j++) {
                    const t = j / numPosts;
                    const px = p1.x + dx * t;
                    const pz = p1.z + dz * t;

                    if (isWestEdge) {
                        if ((pz > -50 && pz < -34) || (pz > -30 && pz < -14)) continue;
                    }
                    addPost(px, pz);
                }

                // Add Panels
                const panelYRot = -angle; // Standard alignment
                if (isWestEdge) {
                    // Gate Splits
                    const minZ = Math.min(p1.z, p2.z);
                    const maxZ = Math.max(p1.z, p2.z);
                    const gaps = [
                        { start: -50, end: -34 },
                        { start: -30, end: -14 }
                    ].sort((a, b) => a.start - b.start);

                    let currentZ = minZ;
                    gaps.forEach(gap => {
                        if (gap.start > currentZ && gap.start < maxZ) {
                            const segStart = currentZ;
                            const segEnd = Math.min(gap.start, maxZ);
                            const segLen = segEnd - segStart;
                            if (segLen > 0.1) {
                                // West edge panels are rotated 90 deg (PI/2) typically? 
                                // In the original code, isWestEdge implies vertical line.
                                // angle for vertical line is PI/2 or -PI/2.
                                // original rotation was [0, PI/2, 0].
                                addPanel(p1.x, (segStart + segEnd) / 2, segLen, Math.PI / 2);
                            }
                        }
                        currentZ = Math.max(currentZ, gap.end);
                    });
                    if (currentZ < maxZ) {
                        const segLen = maxZ - currentZ;
                        if (segLen > 0.1) {
                            addPanel(p1.x, (currentZ + maxZ) / 2, segLen, Math.PI / 2);
                        }
                    }
                } else {
                    const mx = (p1.x + p2.x) / 2;
                    const mz = (p1.z + p2.z) / 2;
                    addPanel(mx, mz, length, panelYRot);
                }
            });

        } else {
            // RECTANGLE MODE (Default)
            const numHorizontalPosts = Math.floor(totalWidth / postSpacing) + 1;
            const numVerticalPosts = Math.floor(totalDepth / postSpacing) + 1;

            // North/South Posts
            for (let i = 0; i < numHorizontalPosts; i++) {
                const x = westFenceX + i * postSpacing;
                if (x <= eastFenceX) {
                    addPost(x, northFenceZ);
                    addPost(x, southFenceZ);
                }
            }
            // East/West Posts
            for (let i = 0; i < numVerticalPosts; i++) {
                const z = northFenceZ + i * postSpacing;
                if (z <= southFenceZ) {
                    // East
                    if (i > 0 && i < numVerticalPosts - 1) addPost(eastFenceX, z); // Avoid corners

                    // West (with gaps)
                    if (!((z > -43 && z < -27) || (z > -13 && z < 3))) {
                        addPost(westFenceX, z);
                    }
                }
            }

            // Panels
            // North
            addPanel(0, northFenceZ, totalWidth, 0);
            // South
            addPanel(0, southFenceZ, totalWidth, 0);
            // East
            addPanel(eastFenceX, 0, totalDepth, Math.PI / 2);

            // West (Split)
            // Seg 1: Top (2.5 to southFenceZ)
            addPanel(westFenceX, (2.5 + southFenceZ) / 2, southFenceZ - 2.5, Math.PI / 2);
            // Seg 2: Middle (-27.9 to -12.5 -> length 15.4, center -20.2)
            addPanel(westFenceX, -20.2, 15.4, Math.PI / 2);
            // Seg 3: Bottom (northFenceZ to -42.9)
            addPanel(westFenceX, (northFenceZ + -42.9) / 2, -42.9 - northFenceZ, Math.PI / 2);
        }

        posts.instanceMatrix.needsUpdate = true;
        panels.instanceMatrix.needsUpdate = true;

        posts.count = postIndex;
        panels.count = panelIndex;

    }, [fenceBounds]);

    // Estimate counts for buffer (conservative max)
    const maxPosts = 500;
    const maxPanels = 100;

    return (
        <group>
            {/* Posts Instance */}
            <instancedMesh ref={postsRef} args={[undefined, undefined, maxPosts]} material={postMaterial}>
                <boxGeometry args={[0.5, 3.5, 0.5]} />
            </instancedMesh>

            {/* Panels Instance */}
            <instancedMesh ref={panelsRef} args={[undefined, undefined, maxPanels]} material={panelMaterial}>
                <boxGeometry args={[1, 3, 0.2]} /> {/* Base width 1, scaled by matrix */}
            </instancedMesh>
        </group>
    );
}
