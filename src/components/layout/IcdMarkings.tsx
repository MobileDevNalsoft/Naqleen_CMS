import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store/store';
import { useUIStore } from '../../store/uiStore';
import { type DynamicEntity, getAllDynamicBlocks } from '../../utils/layoutUtils';

const SlotMarkings = ({ blocks }: { blocks: DynamicEntity[] }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const selectedBlock = useStore((state) => state.selectedBlock);
    const selectId = useStore((state) => state.selectId);
    const entities = useStore((state) => state.entities);

    // Track state for each block to handle smooth animation
    const blockStates = useRef<Record<string, { startIndex: number; count: number; currentY: number }>>({});
    const lotLiftHeight = useRef(0);

    // Initialize block states and static matrices
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;

        let index = 0;
        const states: Record<string, { startIndex: number; count: number; currentY: number }> = {};

        blocks.forEach(block => {
            const startIndex = index;
            let count = 0;

            const props = block.props || {};
            const is20ft = props.container_type === '20ft';
            const containerLength = is20ft ? 6.058 : 12.192;
            const containerWidth = 2.438;
            const gapX = props.lot_gap || 0.5;
            const gapZ = 0.3;
            const totalWidth = (props.lots || 1) * (containerLength + gapX);
            const totalDepth = (props.rows || 1) * (containerWidth + gapZ);
            const startX = -totalWidth / 2 + containerLength / 2;
            const startZ = -totalDepth / 2 + containerWidth / 2;

            const blockPos = new THREE.Vector3(block.position.x, block.position.y, block.position.z);
            const blockRot = new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0);

            for (let b = 0; b < (props.lots || 1); b++) {
                for (let r = 0; r < (props.rows || 1); r++) {
                    const x = startX + b * (containerLength + gapX);
                    const z = startZ + r * (containerWidth + gapZ);

                    const pos = new THREE.Vector3(x, 0.02, z);
                    pos.applyEuler(blockRot);
                    pos.add(blockPos);

                    dummy.position.copy(pos);
                    dummy.rotation.set(-Math.PI / 2, blockRot.y, 0, 'YXZ');
                    dummy.scale.set(containerLength, containerWidth, 1);
                    dummy.updateMatrix();

                    mesh.setMatrixAt(index++, dummy.matrix);
                    count++;
                }
            }

            states[block.id] = { startIndex, count, currentY: 0 };
        });

        blockStates.current = states;
        mesh.instanceMatrix.needsUpdate = true;
    }, [blocks, dummy]); // Run once on mount/blocks change

    // Animate Y positions
    useFrame((_, delta) => {
        const mesh = meshRef.current;
        if (!mesh || !blockStates.current) return;

        let needsUpdate = false;
        const lerpSpeed = delta * 2; // Slower animation

        // Animate Lot Lift
        const targetLotLift = selectId ? 10 : 0;
        if (Math.abs(lotLiftHeight.current - targetLotLift) > 0.01) {
            lotLiftHeight.current = THREE.MathUtils.lerp(lotLiftHeight.current, targetLotLift, lerpSpeed);
            needsUpdate = true;
        } else {
            lotLiftHeight.current = targetLotLift;
        }

        const selectedEntity = selectId ? entities[selectId] : null;

        blocks.forEach(block => {
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
                const is20ft = props.container_type === '20ft';
                const containerLength = is20ft ? 6.058 : 12.192;
                const containerWidth = 2.438;
                const gapX = props.lot_gap || 0.5;
                const gapZ = 0.3;
                const totalWidth = (props.lots || 1) * (containerLength + gapX);
                const totalDepth = (props.rows || 1) * (containerWidth + gapZ);
                const startX = -totalWidth / 2 + containerLength / 2;
                const startZ = -totalDepth / 2 + containerWidth / 2;

                const blockPos = new THREE.Vector3(block.position.x, block.position.y + state.currentY, block.position.z);
                const blockRot = new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0);

                let idx = state.startIndex;
                for (let b = 0; b < (props.lots || 1); b++) {
                    for (let r = 0; r < (props.rows || 1); r++) {
                        const x = startX + b * (containerLength + gapX);
                        const z = startZ + r * (containerWidth + gapZ);

                        const pos = new THREE.Vector3(x, 0.02, z);
                        pos.applyEuler(blockRot);
                        pos.add(blockPos);

                        // Check if this slot matches the selected container
                        let extraLift = 0;
                        if (selectedEntity) {
                            // We compare world positions. 
                            // pos is the slot center in world space.
                            // selectedEntity.x/z are container center in world space.
                            if (Math.abs(pos.x - selectedEntity.x) < 0.5 && Math.abs(pos.z - selectedEntity.z) < 0.5) {
                                extraLift = lotLiftHeight.current;
                            }
                        }
                        pos.y += extraLift;

                        dummy.position.copy(pos);
                        dummy.rotation.set(-Math.PI / 2, blockRot.y, 0, 'YXZ');
                        dummy.scale.set(containerLength, containerWidth, 1);
                        dummy.updateMatrix();

                        mesh.setMatrixAt(idx++, dummy.matrix);
                    }
                }
            }
        });

        if (needsUpdate) {
            mesh.instanceMatrix.needsUpdate = true;
        }
    });

    const totalSlots = useMemo(() => {
        return blocks.reduce((acc, block) => acc + (block.props?.lots || 1) * (block.props?.rows || 1), 0);
    }, [blocks]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, totalSlots]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </instancedMesh>
    );
};

const BlockLabels = ({ block }: { block: DynamicEntity }) => {
    const props = block.props || {};
    const is20ft = props.container_type === '20ft';
    const containerLength = is20ft ? 6.058 : 12.192;
    const containerWidth = 2.438;
    const containerHeight = is20ft ? 2.591 : 2.896; // Standard container heights
    const gapX = props.lot_gap || 0.5;
    const gapZ = 0.3;

    const totalWidth = (props.lots || 1) * (containerLength + gapX);
    const totalDepth = (props.rows || 1) * (containerWidth + gapZ);

    // Calculate maximum stack height (assuming up to 5 levels for containers)
    const maxLevels = 6;
    const maxStackHeight = containerHeight * maxLevels;

    // Calculate text and button height to stay above maximum container level
    const textButtonHeight = maxStackHeight + 5; // 10 units above highest container

    // Blocks that should have labels at the bottom instead of top
    const isBottomLabel = block.id === 'trs_block_c' || block.id === 'trm_block_c' ||
        block.id === 'trs_block_d_part2' || block.id === 'trm_block_d' || block.id === 'trs_block_d_part1';

    // Position terminal label at bottom for specified blocks, top for others
    const terminalLabelZOffset = isBottomLabel ? totalDepth / 2 + 4 : -totalDepth / 2 - 4;
    const terminalLabelPos = new THREE.Vector3(0, textButtonHeight, terminalLabelZOffset);
    terminalLabelPos.applyEuler(new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0));
    terminalLabelPos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

    // Clean up block name - remove "Container Storage" text
    const displayName = (props.description || block.id);

    // Row Labels (A, B, C...)
    const rowLabels = [];
    const isNorth = block.position.z < 0;
    const rowCount = props.rows || 1;

    for (let r = 0; r < rowCount; r++) {
        const z = -totalDepth / 2 + containerWidth / 2 + r * (containerWidth + gapZ);
        const isRightSide = block.position.x > 0;
        const labelX = isRightSide ? totalWidth / 2 + 2 : -totalWidth / 2 - 2;

        const pos = new THREE.Vector3(labelX, 0, z);
        pos.applyEuler(new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0));
        pos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

        const labelIndex = isNorth ? rowCount - 1 - r : r;
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

    for (let b = 0; b < (props.lots || 1); b++) {
        const x = -totalWidth / 2 + containerLength / 2 + b * (containerLength + gapX);
        const pos = new THREE.Vector3(x, 0, lotZPosition);
        pos.applyEuler(new THREE.Euler(0, ((block.rotation || 0) * Math.PI) / 180, 0));
        pos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

        lotLabels.push({
            text: props.lot_numbers?.[b]?.toString() || (b + 1).toString(),
            position: pos
        });
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
            {/* Terminal Name - Billboard at center of block (always facing camera) */}
            {!isSelected && (
                <Billboard position={[terminalLabelPos.x, terminalLabelPos.y, terminalLabelPos.z]}>
                    <group>
                        <Text
                            fontSize={4}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.1}
                            outlineColor="#000000"
                        >
                            {displayName}
                        </Text>

                        {/* Interactive Info Button with Hover Effects */}
                        <group
                            position={[displayName.length * 1.5, 0, 0]}
                            scale={isHovered ? 2.5 : 1.5}
                        >
                            <mesh
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const isReservePanelOpen = useUIStore.getState().activePanel === 'reserveContainers';
                                    if (isReservePanelOpen) return;
                                    setSelectedBlock(block.id);
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    const isReservePanelOpen = useUIStore.getState().activePanel === 'reserveContainers';
                                    if (isReservePanelOpen) return;
                                    document.body.style.cursor = 'pointer';
                                    setIsHovered(true);
                                }}
                                onPointerOut={() => {
                                    document.body.style.cursor = 'auto';
                                    setIsHovered(false);
                                }}
                                renderOrder={999}
                                frustumCulled={false}
                            >
                                <circleGeometry args={[1.5, 32]} />
                                <meshBasicMaterial
                                    color={isHovered ? "#4B686C" : "#4B686C"}
                                    transparent
                                    opacity={isHovered ? 1 : 0.9}
                                    depthTest={false}
                                />
                            </mesh>

                            {/* White Light Border Ring (always visible for better visibility) */}
                            <mesh renderOrder={999} frustumCulled={false}>
                                <ringGeometry args={[1.5, 1.7, 32]} />
                                <meshBasicMaterial
                                    color="#FFFFFF"
                                    transparent
                                    opacity={0.8}
                                    depthTest={false}
                                />
                            </mesh>

                            {/* Bright Yellow Border Ring on Hover */}
                            {isHovered && (
                                <mesh renderOrder={1000} frustumCulled={false}>
                                    <ringGeometry args={[1.7, 2.1, 32]} />
                                    <meshBasicMaterial
                                        color="#F7CF9B"
                                        transparent
                                        opacity={1}
                                        depthTest={false}
                                    />
                                </mesh>
                            )}

                            {/* Info icon (i) */}
                            <mesh position={[0, 0, 0.01]} renderOrder={1001} frustumCulled={false}>
                                <planeGeometry args={[0.8, 2]} />
                                <meshBasicMaterial
                                    color="white"
                                    transparent
                                    opacity={1}
                                    depthTest={false}
                                />
                            </mesh>
                        </group>
                    </group>
                </Billboard>
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

    const blocks = useMemo(() => {
        if (!layout) return [];
        return getAllDynamicBlocks(layout);
    }, [layout]);

    if (!layout) return null;

    return (
        <group>
            <SlotMarkings blocks={blocks} />
            {blocks.map(block => (
                <BlockLabels key={block.id} block={block} />
            ))}
        </group>
    );
}
