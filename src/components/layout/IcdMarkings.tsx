import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Text, Billboard, Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/store';
import { useUIStore } from '../../store/uiStore';
import { type DynamicEntity, type DynamicIcdLayout, getAllDynamicBlocks, calculateBlockPosition, calculateBlockDimensions } from '../../utils/layoutUtils';


// Block Marker Component - Premium pulsing annotation with hover tooltip
interface BlockMarkerProps {
    position: [number, number, number];
    blockName: string;
    onClick: () => void;
    isHovered: boolean;
    isOtherMarkerHovered: boolean; // True when a different marker is hovered
    onPointerOver: () => void;
    onPointerOut: () => void;
}

// CSS Keyframe styles injected into the document
const pulseStyles = `
@keyframes block-marker-pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(247, 207, 155, 0.7), 0 0 0 0 rgba(75, 104, 108, 0.5);
    }
    40% {
        box-shadow: 0 0 0 20px transparent, 0 0 0 0 rgba(75, 104, 108, 0.5);
    }
    80% {
        box-shadow: 0 0 0 20px transparent, 0 0 0 12px transparent;
    }
    100% {
        box-shadow: 0 0 0 0 transparent, 0 0 0 12px transparent;
    }
}

@keyframes block-marker-glow {
    0%, 100% {
        filter: drop-shadow(0 0 8px rgba(247, 207, 155, 0.6));
    }
    50% {
        filter: drop-shadow(0 0 16px rgba(247, 207, 155, 0.9));
    }
}

@keyframes block-marker-float {
    0%, 100% {
        transform: translateY(0px);
    }
    50% {
        transform: translateY(-3px);
    }
}

.block-marker-container {
    position: relative;
    cursor: pointer;
    user-select: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
}

.block-marker-container:hover {
    z-index: 9999;
}

.block-marker-pulse {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(255, 255, 255, 0.9);
    background: linear-gradient(145deg, #4B686C 0%, #3A5255 100%);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), 0 0 0 0 rgba(247, 207, 155, 0);
}

.block-marker-pulse:hover {
    background: linear-gradient(145deg, #F7CF9B 0%, #E5B070 100%);
    border-color: #ffffff;
    transform: scale(1.2);
    animation: block-marker-pulse 2s ease-out infinite, block-marker-glow 1.5s ease-in-out infinite;
    box-shadow: 0 6px 28px rgba(247, 207, 155, 0.4);
}

.block-marker-icon {
    font-size: 14px;
    font-weight: 800;
    color: #ffffff;
    font-family: 'Outfit', system-ui, sans-serif;
    letter-spacing: -0.5px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
}

.block-marker-pulse:hover .block-marker-icon {
    color: #4B686C;
    text-shadow: none;
    transform: scale(1.1);
}

.block-marker-tooltip {
    position: absolute;
    left: calc(100% + 16px);
    top: 50%;
    transform: translateY(-50%);
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 12px 18px;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(247, 207, 155, 0.5);
    display: flex;
    align-items: center;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-50%) translateX(-10px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 9999;
}

.block-marker-pulse:hover + .block-marker-tooltip,
.block-marker-container:hover .block-marker-tooltip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
}

.block-marker-tooltip-icon {
    background: linear-gradient(135deg, #4B686C 0%, #5a9aa8 100%);
    padding: 8px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(75, 104, 108, 0.3);
}

.block-marker-tooltip-text {
    font-size: 1.05rem;
    font-weight: 700;
    color: #ffffff;
    font-family: 'Outfit', system-ui, sans-serif;
    letter-spacing: 0.3px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Outer glow ring that pulses */
.block-marker-outer-ring {
    position: absolute;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 2px solid rgba(247, 207, 155, 0.3);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0;
    transition: all 0.3s ease;
}

.block-marker-pulse:hover ~ .block-marker-outer-ring {
    opacity: 1;
    animation: block-marker-pulse 2s ease-out infinite;
}

/* Faded state when another marker is hovered */
.block-marker-container.faded {
    opacity: 0.15;
    pointer-events: none;
    transform: scale(0.9);
    filter: grayscale(0.5);
    z-index: 0;
}
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('block-marker-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'block-marker-styles';
    styleSheet.textContent = pulseStyles;
    document.head.appendChild(styleSheet);
}

const BlockMarker: React.FC<BlockMarkerProps> = ({
    position,
    blockName,
    onClick,
    isHovered: _isHovered, // Reserved for future use
    isOtherMarkerHovered,
    onPointerOver,
    onPointerOut
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    const hoverSound = useMemo(() => {
        const audio = new Audio('/sounds/hover.mp3');
        audio.volume = 0.4;
        return audio;
    }, []);

    // Distance-responsive scaling for the marker
    useFrame(() => {
        if (!groupRef.current) return;

        const markerWorldPos = new THREE.Vector3(...position);
        const distance = camera.position.distanceTo(markerWorldPos);

        // Scale based on distance: closer = smaller, further = larger
        const baseDistance = 100;
        const minScale = 0.6;
        const maxScale = 2.0;
        const scaleFactor = Math.max(minScale, Math.min(maxScale, distance / baseDistance));

        groupRef.current.scale.setScalar(scaleFactor);
    });

    return (
        <Billboard position={position}>
            <group ref={groupRef}>
                {/* HTML-based premium marker with CSS animations */}
                <Html
                    center
                    style={{
                        pointerEvents: 'auto',
                        transform: 'translate(-50%, -50%)'
                    }}
                    zIndexRange={[100, 0]}
                >
                    <div
                        className={`block-marker-container ${isOtherMarkerHovered ? 'faded' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        onMouseEnter={() => {
                            try {
                                hoverSound.currentTime = 0;
                                hoverSound.play().catch(() => { });
                            } catch (e) { }
                            onPointerOver();
                        }}
                        onMouseLeave={onPointerOut}
                    >
                        {/* Main Pulse Circle */}
                        <div className="block-marker-pulse">
                            <span className="block-marker-icon">i</span>
                        </div>

                        {/* Tooltip */}
                        <div className="block-marker-tooltip">
                            <span className="block-marker-tooltip-text">{blockName}</span>
                        </div>

                        {/* Outer Glow Ring */}
                        <div className="block-marker-outer-ring"></div>
                    </div>
                </Html>
            </group>
        </Billboard>
    );
};

const SlotMarkings = ({ blocks }: { blocks: DynamicEntity[] }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const selectedBlock = useStore((state) => state.selectedBlock);
    const selectId = useStore((state) => state.selectId);
    const [meshReady, setMeshReady] = useState(false);

    // Store blocks in a ref to avoid stale closure in useFrame
    const blocksRef = useRef(blocks);
    blocksRef.current = blocks;

    // Track state for each block to handle smooth animation
    const blockStates = useRef<Record<string, { startIndex: number; count: number; currentY: number }>>({});
    const lotLiftHeight = useRef(0);
    const useFrameLogged = useRef(false);
    const frameCount = useRef(0);

    // Callback ref to detect when mesh is ready
    const meshCallbackRef = useCallback((node: THREE.InstancedMesh | null) => {
        meshRef.current = node;
        if (node) {
            setMeshReady(true);
        } else {
            // When mesh unmounts (due to totalSlots change), toggle off so useEffect re-runs
            setMeshReady(false);
        }
    }, []);

    // Initialize block states and static matrices
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh || !meshReady) return;

        let index = 0;
        const states: Record<string, { startIndex: number; count: number; currentY: number }> = {};

        blocks.forEach(block => {
            const startIndex = index;
            let count = 0;

            const props = block.props || {};
            const lots = props.lots || 1;
            const rows = props.rows || 1;
            const lotNumbers: number[] = props.lot_numbers || Array.from({ length: lots }, (_, i) => i + 1);
            const lotGaps: Record<string, number> = props.lot_gaps || {};

            // Calculate slot dimensions - use fixed block dimensions if provided
            let containerLength: number;
            let containerWidth: number;
            let gapX: number;
            let gapZ: number;
            let totalWidth: number;
            let totalDepth: number;

            if (props.block_width && props.block_depth) {
                // Fixed block dimensions - calculate slot size from total
                totalWidth = props.block_width;
                totalDepth = props.block_depth;

                // Derive slot dimensions: width = totalWidth / lots (assuming uniform slots)
                // For simplicity, assume uniform gaps distributed
                gapX = 0.5; // Default gap
                gapZ = 0.3;
                containerLength = (totalWidth - (lots - 1) * gapX) / lots;
                containerWidth = (totalDepth - (rows - 1) * gapZ) / rows;
            } else {
                // Calculate from container dimensions
                const is20ft = props.container_type === '20ft';
                containerLength = is20ft ? 6.058 : 12.192;
                containerWidth = 2.438;
                gapX = props.lot_gap || 0.5;
                gapZ = 0.3;

                // Calculate total width with custom lot gaps
                totalWidth = 0;
                for (let i = 0; i < lots; i++) {
                    totalWidth += containerLength;
                    if (i < lots - 1) {
                        const lotNum = lotNumbers[i];
                        totalWidth += lotGaps[String(lotNum)] ?? gapX;
                    }
                }
                totalDepth = rows * (containerWidth + gapZ);
            }

            const startX = -totalWidth / 2 + containerLength / 2;
            const startZ = -totalDepth / 2 + containerWidth / 2;

            const blockPos = new THREE.Vector3(block.position.x, block.position.y, block.position.z);
            const blockRot = new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0);

            // Debug logging for dynamic blocks
            if (block.id.includes('trm_block') || block.id.includes('trs_block_a')) {
                console.log(`[SlotMarkings] ${block.id}: position=${JSON.stringify(block.position)}, placement=${JSON.stringify(block.placement)}`);
            }

            // Calculate cumulative X offset for each lot
            let xOffset = 0;
            const excludedSlots: { lot: number; row: string }[] = props.excluded_slots || [];
            const rowLabels: string[] = props.row_labels || [];

            for (let b = 0; b < lots; b++) {
                const currentLotNumber = lotNumbers[b];
                for (let r = 0; r < rows; r++) {
                    // Check if this slot is excluded
                    // Row labels are visually inverted (J at top, A at bottom), so use reverse index
                    const visualRowIndex = rows - 1 - r;
                    const currentRowLabel = rowLabels[visualRowIndex] || String.fromCharCode(65 + visualRowIndex);
                    const isExcluded = excludedSlots.some(
                        (es) => es.lot === currentLotNumber && es.row === currentRowLabel
                    );

                    if (isExcluded) {
                        // Skip this slot but don't increment index
                        continue;
                    }

                    const x = startX + xOffset;
                    const z = startZ + r * (containerWidth + gapZ);

                    const pos = new THREE.Vector3(x, 0.02, z);
                    pos.applyEuler(blockRot);
                    pos.add(blockPos);

                    // Debug: log final world position of first slot for trm_block_a
                    if (block.id === 'trm_block_a' && b === 0 && r === 0) {
                        console.log(`[useEffect] trm_block_a slot[0,0]: local=(${x.toFixed(2)}, ${z.toFixed(2)}), blockPos=(${blockPos.x.toFixed(2)}, ${blockPos.z.toFixed(2)}), final=(${pos.x.toFixed(2)}, ${pos.z.toFixed(2)})`);
                    }

                    dummy.position.copy(pos);
                    dummy.rotation.set(-Math.PI / 2, blockRot.y, 0, 'YXZ');
                    dummy.scale.set(containerLength, containerWidth, 1);
                    dummy.updateMatrix();

                    mesh.setMatrixAt(index++, dummy.matrix);
                    count++;
                }
                // Add gap after this lot for next iteration
                const lotNum = lotNumbers[b];
                xOffset += containerLength + (lotGaps[String(lotNum)] ?? gapX);
            }

            states[block.id] = { startIndex, count, currentY: 0 };
        });

        blockStates.current = states;
        mesh.instanceMatrix.needsUpdate = true;

        // Debug: show total slots set vs expected
        const totalSet = Object.values(states).reduce((acc, s) => acc + s.count, 0);
        console.log(`[useEffect] Total matrices set: ${totalSet}, mesh.count: ${mesh.count}`);
    }, [blocks, dummy, meshReady]); // Re-run when blocks change or mesh becomes ready

    // Animate Y positions
    useFrame((_, delta) => {
        const mesh = meshRef.current;
        if (!mesh || !blockStates.current) return;

        let needsUpdate = false;
        const lerpSpeed = delta * 2; // Slower animation

        // Force update for first few frames to ensure positions are synced
        frameCount.current += 1;
        if (frameCount.current < 10) {
            needsUpdate = true;
        }

        // Animate Lot Lift
        const targetLotLift = selectId ? 10 : 0;
        if (Math.abs(lotLiftHeight.current - targetLotLift) > 0.01) {
            lotLiftHeight.current = THREE.MathUtils.lerp(lotLiftHeight.current, targetLotLift, lerpSpeed);
            needsUpdate = true;
        } else {
            lotLiftHeight.current = targetLotLift;
        }


        // Use blocksRef to avoid stale closure - always get latest blocks with calculated positions
        blocksRef.current.forEach(block => {
            const state = blockStates.current[block.id];
            if (!state) return;

            const isSelected = block.id === selectedBlock;
            const targetY = isSelected ? 16 : 0;

            // Only update if not at target OR if we have a lot lift active (since it affects individual slots)
            if (Math.abs(state.currentY - targetY) > 0.01 || lotLiftHeight.current > 0 || needsUpdate) {
                // Lerp currentY
                state.currentY = THREE.MathUtils.lerp(state.currentY, targetY, lerpSpeed);
                needsUpdate = true;

                // Re-calculate matrices for this block with new Y
                const props = block.props || {};
                const lots = props.lots || 1;
                const rows = props.rows || 1;
                const lotNumbers: number[] = props.lot_numbers || Array.from({ length: lots }, (_, i) => i + 1);
                const lotGaps: Record<string, number> = props.lot_gaps || {};

                // Calculate slot dimensions - use fixed block dimensions if provided
                let containerLength: number;
                let containerWidth: number;
                let gapX: number;
                let gapZ: number;
                let totalWidth: number;
                let totalDepth: number;

                if (props.block_width && props.block_depth) {
                    // Fixed block dimensions
                    totalWidth = props.block_width;
                    totalDepth = props.block_depth;
                    gapX = 0.5;
                    gapZ = 0.3;
                    containerLength = (totalWidth - (lots - 1) * gapX) / lots;
                    containerWidth = (totalDepth - (rows - 1) * gapZ) / rows;
                } else {
                    // Calculate from container dimensions
                    const is20ft = props.container_type === '20ft';
                    containerLength = is20ft ? 6.058 : 12.192;
                    containerWidth = 2.438;
                    gapX = props.lot_gap || 0.5;
                    gapZ = 0.3;

                    totalWidth = 0;
                    for (let i = 0; i < lots; i++) {
                        totalWidth += containerLength;
                        if (i < lots - 1) {
                            const lotNum = lotNumbers[i];
                            totalWidth += lotGaps[String(lotNum)] ?? gapX;
                        }
                    }
                    totalDepth = rows * (containerWidth + gapZ);
                }

                const startX = -totalWidth / 2 + containerLength / 2;
                const startZ = -totalDepth / 2 + containerWidth / 2;

                const blockPos = new THREE.Vector3(block.position.x, block.position.y + state.currentY, block.position.z);

                // Debug log for trm_block_a and d blocks in useFrame (frame 5)
                if (frameCount.current === 5 && (block.id === 'trm_block_a' || block.id.includes('_d'))) {
                    console.log(`[useFrame] ${block.id}: pos=(${blockPos.x.toFixed(2)}, ${blockPos.z.toFixed(2)})`);
                }

                // Warn on 0,0 for blocks that shouldn't be there
                if (frameCount.current === 5 && (block.id.includes('trm_') || block.id.includes('trs_')) && blockPos.x === 0 && blockPos.z === 0) {
                    console.warn(`[useFrame] WARN: ${block.id} at (0,0)`);
                }

                const isTrmA = block.id === 'trm_block_a';
                if (isTrmA && !useFrameLogged.current) {
                    console.log(`[useFrame] trm_block_a: blockPos=(${blockPos.x.toFixed(2)}, ${blockPos.y.toFixed(2)}, ${blockPos.z.toFixed(2)}), state.currentY=${state.currentY}`);
                    if (block.position.x === 0 && block.position.z === 0) {
                        console.warn(`[useFrame] WARN: trm_block_a has (0,0) position in useFrame loop! Stale closure suspected.`);
                    }
                    useFrameLogged.current = true;
                }

                const blockRot = new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0);

                let idx = state.startIndex;
                let xOffset = 0;
                const excludedSlots: { lot: number; row: string }[] = props.excluded_slots || [];
                const rowLabelsFrame: string[] = props.row_labels || [];

                for (let b = 0; b < lots; b++) {
                    const currentLotNumber = lotNumbers[b];
                    for (let r = 0; r < rows; r++) {
                        // Check if this slot is excluded
                        // Row labels are visually inverted (J at top, A at bottom), so use reverse index
                        const visualRowIndex = rows - 1 - r;
                        const currentRowLabel = rowLabelsFrame[visualRowIndex] || String.fromCharCode(65 + visualRowIndex);
                        const isExcluded = excludedSlots.some(
                            (es) => es.lot === currentLotNumber && es.row === currentRowLabel
                        );

                        if (isExcluded) {
                            continue;
                        }

                        const x = startX + xOffset;
                        const z = startZ + r * (containerWidth + gapZ);

                        const pos = new THREE.Vector3(x, 0.02, z);
                        pos.applyEuler(blockRot);
                        pos.add(blockPos);

                        // Check if this slot matches the selected container
                        // REMOVED: extraLift logic to keep the marking on the ground
                        /*
                        let extraLift = 0;
                        if (selectedEntity) {
                            if (Math.abs(pos.x - selectedEntity.x) < 0.5 && Math.abs(pos.z - selectedEntity.z) < 0.5) {
                                extraLift = lotLiftHeight.current;
                            }
                        }
                        pos.y += extraLift;
                        */

                        dummy.position.copy(pos);
                        dummy.rotation.set(-Math.PI / 2, blockRot.y, 0, 'YXZ');
                        dummy.scale.set(containerLength, containerWidth, 1);
                        dummy.updateMatrix();

                        mesh.setMatrixAt(idx++, dummy.matrix);
                    }
                    // Add gap after this lot for next iteration
                    const lotNum = lotNumbers[b];
                    xOffset += containerLength + (lotGaps[String(lotNum)] ?? gapX);
                }
            }
        });

        if (needsUpdate) {
            mesh.instanceMatrix.needsUpdate = true;
        }
    });

    const totalSlots = useMemo(() => {
        return blocks.reduce((acc, block) => {
            const totalBlockSlots = (block.props?.lots || 1) * (block.props?.rows || 1);
            const excludedCount = block.props?.excluded_slots?.length || 0;
            return acc + totalBlockSlots - excludedCount;
        }, 0);
    }, [blocks]);

    return (
        <instancedMesh ref={meshCallbackRef} args={[undefined, undefined, totalSlots]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </instancedMesh>
    );
};

interface BlockLabelsProps {
    block: DynamicEntity;
}

const BlockLabels = ({ block }: BlockLabelsProps) => {
    const props = block.props || {};
    // Use global store for unified hover state across all markers
    const hoveredMarker = useStore((state) => state.hoveredMarker);
    const setHoveredMarker = useStore((state) => state.setHoveredMarker);
    const lots = props.lots || 1;
    const rows = props.rows || 1;
    const lotGaps: Record<string, number> = props.lot_gaps || {};
    const lotNumbers: number[] = props.lot_numbers || Array.from({ length: lots }, (_, i) => i + 1);

    // Calculate slot dimensions - use fixed block dimensions if provided
    let containerLength: number;
    let containerWidth: number;
    let gapX: number;
    let gapZ: number;
    let totalWidth: number;
    let totalDepth: number;

    if (props.block_width && props.block_depth) {
        // Fixed block dimensions - calculate slot size from total
        totalWidth = props.block_width;
        totalDepth = props.block_depth;

        gapX = 0.5;
        gapZ = 0.3;
        containerLength = (totalWidth - (lots - 1) * gapX) / lots;
        containerWidth = (totalDepth - (rows - 1) * gapZ) / rows;
    } else {
        // Calculate from container dimensions
        const is20ft = props.container_type === '20ft';
        containerLength = is20ft ? 6.058 : 12.192;
        containerWidth = 2.438;
        gapX = props.lot_gap || 0.5;
        gapZ = 0.3;

        // Calculate total width with custom lot gaps
        totalWidth = 0;
        for (let i = 0; i < lots; i++) {
            totalWidth += containerLength;
            if (i < lots - 1) {
                const lotNum = lotNumbers[i];
                totalWidth += lotGaps[String(lotNum)] ?? gapX;
            }
        }
        totalDepth = rows * (containerWidth + gapZ);
    }

    const is20ft = props.container_type === '20ft';
    const containerHeight = is20ft ? 2.591 : 2.896;

    // Calculate maximum stack height (assuming up to 5 levels for containers)
    const maxLevels = 6;
    const maxStackHeight = containerHeight * maxLevels;

    // Calculate text and button height to stay above maximum container level
    const textButtonHeight = maxStackHeight + 15; // 10 units above highest container

    // Blocks that should have labels at the bottom instead of top
    const isBottomLabel = block.id === 'trs_block_c' || block.id === 'trm_block_c' ||
        block.id === 'trs_block_d_part2' || block.id === 'trm_block_d' || block.id === 'trs_block_d';

    // Position terminal label at bottom for specified blocks, top for others
    const terminalLabelZOffset = isBottomLabel ? totalDepth / 2 + 4 : -totalDepth / 2 - 4;
    const terminalLabelPos = new THREE.Vector3(0, textButtonHeight, terminalLabelZOffset);
    terminalLabelPos.applyEuler(new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0));
    terminalLabelPos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

    // Clean up block name - remove "Container Storage" text
    const displayName = (props.description || block.id);

    // Row Labels (A, B, C...)
    const rowLabels = [];
    const rowCount = props.rows || 1;

    // Extract block letter from block ID (e.g., 'trs_block_a' -> 'A', 'trm_block_d' -> 'D')
    const blockLetter = block.id.match(/block_([a-d])/i)?.[1]?.toUpperCase() || '';

    // Block A: A-K from top to bottom (no reversal - first physical row gets A)
    // Block B: A-K from bottom to top (reverse - first physical row gets last label)
    // Block C: keep default (no reversal)
    // Block D: A-K from bottom to top (reverse - first physical row gets last label)
    const shouldReverse = blockLetter === 'B' || blockLetter === 'D';

    for (let r = 0; r < rowCount; r++) {
        const z = -totalDepth / 2 + containerWidth / 2 + r * (containerWidth + gapZ);

        // Determine label side based on props.row_labels_side or terminal type
        // row_labels_side: 'left' or 'right' (prop override)
        // Default: TRS/TRL blocks -> left, TRM blocks -> right
        const isTrsBlock = block.id.startsWith('trs_');
        const isTrlBlock = block.id.startsWith('trl_');
        const defaultLabelSide = (isTrsBlock || isTrlBlock) ? 'left' : 'right';
        const labelSide = props.row_labels_side || defaultLabelSide;
        const labelX = labelSide === 'left' ? -totalWidth / 2 - 2 : totalWidth / 2 + 2;

        const pos = new THREE.Vector3(labelX, 0, z);
        pos.applyEuler(new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0));
        pos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

        const labelIndex = shouldReverse ? rowCount - 1 - r : r;
        const labelText = props.row_labels?.[labelIndex] || String.fromCharCode(65 + labelIndex);

        rowLabels.push({
            text: labelText,
            position: pos
        });
    }

    // Lot Numbers (1, 2, 3...)
    const lotLabels = [];
    const isTrsBlockB = block.id === 'trs_block_b';
    const isTrmBlockB = block.id === 'trm_block_b';
    const lotZPosition = isTrsBlockB || isTrmBlockB ? -totalDepth / 2 - 2 : totalDepth / 2 + 2;

    let xOffset = 0;
    for (let b = 0; b < lots; b++) {
        const x = -totalWidth / 2 + containerLength / 2 + xOffset;
        const pos = new THREE.Vector3(x, 0, lotZPosition);
        pos.applyEuler(new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0));
        pos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

        lotLabels.push({
            text: props.lot_numbers?.[b]?.toString() || (b + 1).toString(),
            position: pos
        });

        // Add gap after this lot for next iteration
        const lotNum = lotNumbers[b];
        xOffset += containerLength + (lotGaps[String(lotNum)] ?? gapX);
    }

    const setSelectedBlock = useStore(state => state.setSelectedBlock);
    const selectedBlock = useStore(state => state.selectedBlock);
    const [isHovered, setIsHovered] = useState(false);
    const groupRef = useRef<THREE.Group>(null);
    const previousSelectedBlock = useRef<string | null>(null);

    const isSelected = selectedBlock === block.id;

    // Reset hover state only when block transitions from selected to not selected
    useEffect(() => {
        if (previousSelectedBlock.current === block.id && selectedBlock !== block.id && isHovered) {
            setIsHovered(false);
        }
        previousSelectedBlock.current = selectedBlock;
    }, [selectedBlock, isHovered]);

    useFrame((_, delta) => {
        if (groupRef.current) {
            const targetY = isSelected ? 16 : 0;
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, delta * 2);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Block Marker - Interaction circle with hover tooltip */}
            {!isSelected && (
                <BlockMarker
                    position={[terminalLabelPos.x, terminalLabelPos.y, terminalLabelPos.z]}
                    blockName={displayName}
                    isHovered={isHovered}
                    isOtherMarkerHovered={hoveredMarker !== null && hoveredMarker !== block.id}
                    onClick={() => {
                        const isReservePanelOpen = useUIStore.getState().activePanel === 'reserveContainers';
                        if (isReservePanelOpen) return;
                        setSelectedBlock(block.id);
                    }}
                    onPointerOver={() => {
                        const isReservePanelOpen = useUIStore.getState().activePanel === 'reserveContainers';
                        if (isReservePanelOpen) return;
                        document.body.style.cursor = 'pointer';
                        setIsHovered(true);
                        setHoveredMarker(block.id);
                    }}
                    onPointerOut={() => {
                        document.body.style.cursor = 'auto';
                        setIsHovered(false);
                        setHoveredMarker(null);
                    }}
                />
            )}

            {/* Row Labels */}
            {rowLabels.map((label, i) => (
                <Text
                    key={`row-${i}`}
                    position={[label.position.x, 0.1, label.position.z]}
                    rotation={[-Math.PI / 2, 0, ((block.rotation || 0) * Math.PI) / 180]}
                    fontSize={1.2}
                    color="#cccccc"
                    anchorX="center"
                    anchorY="middle"
                >
                    {label.text}
                </Text>
            ))}

            {/* Lot Labels */}
            {lotLabels.map((label, i) => (
                <Text
                    key={`lot-${i}`}
                    position={[label.position.x, 0.1, label.position.z]}
                    rotation={[-Math.PI / 2, 0, ((block.rotation || 0) * Math.PI) / 180]}
                    fontSize={1.2}
                    color="#cccccc"
                    anchorX="center"
                    anchorY="middle"
                >
                    {label.text}
                </Text>
            ))}
        </group>
    );
};

export default function IcdMarkings() {
    const layout = useStore((state) => state.layout);
    const selectedBlock = useStore((state) => state.selectedBlock);
    const setHoveredMarker = useStore((state) => state.setHoveredMarker);

    // Reset hover state when block is deselected (closed)
    useEffect(() => {
        if (selectedBlock === null) {
            setHoveredMarker(null);
        }
    }, [selectedBlock, setHoveredMarker]);

    const blocks = useMemo(() => {
        if (!layout) return [];
        const rawBlocks = getAllDynamicBlocks(layout);

        // Apply calculated positions for blocks with placement
        // IMPORTANT: Process in order and use accumulated positions so later blocks
        // can reference earlier blocks' calculated positions
        const processedBlocks: typeof rawBlocks = [];

        for (const block of rawBlocks) {
            if (block.placement) {
                // Use processedBlocks (with calculated positions) for reference lookup
                const allBlocksForLookup = [...processedBlocks, ...rawBlocks.filter(b => !processedBlocks.find(p => p.id === b.id))];

                // Debug: log what position trm_block_d has in the lookup array
                if (block.id === 'trs_block_d') {
                    const trmD = allBlocksForLookup.find(b => b.id === 'trm_block_d');
                    console.log(`[DEBUG trs_block_d] trm_block_d in lookup: position=(${trmD?.position?.x}, ${trmD?.position?.z}), processedBlocks count=${processedBlocks.length}`);
                    console.log(`[DEBUG trs_block_d] processedBlocks IDs: ${processedBlocks.map(b => b.id).join(', ')}`);
                }

                const calculatedPos = calculateBlockPosition(block, layout, allBlocksForLookup);
                console.log(`[IcdMarkings useMemo] ${block.id}: calculated pos=(${calculatedPos.x.toFixed(2)}, ${calculatedPos.z.toFixed(2)}), original pos=(${block.position.x}, ${block.position.z})`);
                processedBlocks.push({
                    ...block,
                    position: {
                        ...block.position,
                        x: calculatedPos.x,
                        z: calculatedPos.z
                    }
                });
            } else {
                processedBlocks.push(block);
            }
        }

        return processedBlocks;
    }, [layout]);

    if (!layout) return null;

    return (
        <group>
            <SlotMarkings blocks={blocks} />
            {blocks.map(block => (
                <BlockLabels
                    key={block.id}
                    block={block}
                />
            ))}
        </group>
    );
}
