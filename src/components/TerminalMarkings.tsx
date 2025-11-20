import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useStore } from '../store/store';
import { type TerminalZone, getAllBlocks } from '../utils/layoutUtils';

const SlotMarkings = ({ blocks }: { blocks: TerminalZone[] }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;

        let index = 0;
        blocks.forEach(block => {
            const is20ft = block.container_type === '20ft';
            const containerLength = is20ft ? 6.058 : 12.192;
            const containerWidth = 2.438;

            const gapX = block.bay_gap || 0.5;
            const gapZ = 0.3;

            const totalWidth = (block.bays || 1) * (containerLength + gapX);
            const totalDepth = (block.rows || 1) * (containerWidth + gapZ);

            const startX = -totalWidth / 2 + containerLength / 2;
            const startZ = -totalDepth / 2 + containerWidth / 2;

            const blockPos = new THREE.Vector3(block.position.x, block.position.y, block.position.z);
            const blockRot = new THREE.Euler(0, (block.rotation * Math.PI) / 180, 0);

            for (let b = 0; b < (block.bays || 1); b++) {
                for (let r = 0; r < (block.rows || 1); r++) {
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
                }
            }
        });

        mesh.instanceMatrix.needsUpdate = true;
    }, [blocks, dummy]);

    const totalSlots = useMemo(() => {
        return blocks.reduce((acc, block) => acc + (block.bays || 1) * (block.rows || 1), 0);
    }, [blocks]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, totalSlots]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </instancedMesh>
    );
};

const BlockLabels = ({ block }: { block: TerminalZone }) => {
    const is20ft = block.container_type === '20ft';
    const containerLength = is20ft ? 6.058 : 12.192;
    const containerWidth = 2.438;
    const gapX = block.bay_gap || 0.5;
    const gapZ = 0.3;

    const totalWidth = (block.bays || 1) * (containerLength + gapX);
    const totalDepth = (block.rows || 1) * (containerWidth + gapZ);

    // Blocks that should have labels at the bottom instead of top
    const isBottomLabel = block.id === 'trs_block_c' || block.id === 'trm_block_c' ||
        block.id === 'trs_block_d_part2' || block.id === 'trm_block_d' || block.id === 'trs_block_d_part1';

    // Position zone label at bottom for specified blocks, top for others
    const zoneLabelZOffset = isBottomLabel ? totalDepth / 2 + 4 : -totalDepth / 2 - 4;
    const zoneLabelPos = new THREE.Vector3(0, 0, zoneLabelZOffset);
    zoneLabelPos.applyEuler(new THREE.Euler(0, (block.rotation * Math.PI) / 180, 0));
    zoneLabelPos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

    // Clean up block name - remove "Container Storage" text
    const displayName = (block.description || block.id);

    // Row Labels (A, B, C...)
    const rowLabels = [];
    const isNorth = block.position.z < 0;
    const rowCount = block.rows || 1;

    for (let r = 0; r < rowCount; r++) {
        const z = -totalDepth / 2 + containerWidth / 2 + r * (containerWidth + gapZ);
        const isRightSide = block.position.x > 0;
        const labelX = isRightSide ? totalWidth / 2 + 2 : -totalWidth / 2 - 2;

        const pos = new THREE.Vector3(labelX, 0, z);
        pos.applyEuler(new THREE.Euler(0, (block.rotation * Math.PI) / 180, 0));
        pos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

        const labelIndex = isNorth ? rowCount - 1 - r : r;
        const labelText = block.row_labels?.[labelIndex] || String.fromCharCode(65 + labelIndex);

        rowLabels.push({
            text: labelText,
            position: pos
        });
    }

    // Bay Numbers (1, 2, 3...)
    const bayLabels = [];
    const isTrsBlockB = block.id === 'trs_block_b';
    const bayZPosition = isTrsBlockB ? -totalDepth / 2 - 2 : totalDepth / 2 + 2;

    for (let b = 0; b < (block.bays || 1); b++) {
        const x = -totalWidth / 2 + containerLength / 2 + b * (containerLength + gapX);
        const pos = new THREE.Vector3(x, 0, bayZPosition);
        pos.applyEuler(new THREE.Euler(0, (block.rotation * Math.PI) / 180, 0));
        pos.add(new THREE.Vector3(block.position.x, block.position.y, block.position.z));

        bayLabels.push({
            text: block.bay_numbers?.[b]?.toString() || (b + 1).toString(),
            position: pos
        });
    }

    return (
        <group>
            {/* Zone Name - Show for all blocks with cleaned name */}
            <Text
                position={[zoneLabelPos.x, 0.1, zoneLabelPos.z]}
                rotation={[-Math.PI / 2, 0, (block.rotation * Math.PI) / 180]}
                fontSize={3}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {displayName}
            </Text>

            {/* Row Labels */}
            {rowLabels.map((label, i) => (
                <Text
                    key={`row-${i}`}
                    position={[label.position.x, 0.1, label.position.z]}
                    rotation={[-Math.PI / 2, 0, (block.rotation * Math.PI) / 180]}
                    fontSize={1.2}
                    color="#cccccc"
                    anchorX="center"
                    anchorY="middle"
                >
                    {label.text}
                </Text>
            ))}

            {/* Bay Labels */}
            {bayLabels.map((label, i) => (
                <Text
                    key={`bay-${i}`}
                    position={[label.position.x, 0.1, label.position.z]}
                    rotation={[-Math.PI / 2, 0, (block.rotation * Math.PI) / 180]}
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

export default function TerminalMarkings() {
    const layout = useStore((state) => state.layout);

    const blocks = useMemo(() => {
        if (!layout) return [];
        return getAllBlocks(layout);
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
