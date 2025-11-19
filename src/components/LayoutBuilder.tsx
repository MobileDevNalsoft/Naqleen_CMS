import React, { useMemo, useState, useEffect } from 'react';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

interface ZoneData {
    id: string;
    type: string;
    dimensions: { width: number; height: number };
    position: { x: number; y: number; z: number };
    rotation: number;
    corner_points?: Array<{ x: number; z: number; description?: string }>;
}

interface BlockData extends ZoneData {
    bays: number;
    rows: number;
    row_labels?: string[];
    bay_numbers?: number[];
    container_type: string;
}

const Zone: React.FC<{ zone: ZoneData }> = ({ zone }) => {
    const zoneTypes: Record<string, { color: string; opacity: number }> = {
        container_block_a: { color: '#FF9800', opacity: 0.4 },
        container_block_b: { color: '#F44336', opacity: 0.4 },
        container_block_c: { color: '#9C27B0', opacity: 0.4 },
        container_block_d: { color: '#607D8B', opacity: 0.4 },
        road: { color: '#000000', opacity: 0.1 },
        access: { color: '#8BC34A', opacity: 0.3 },
        customhouse: { color: '#795548', opacity: 0.5 },
        toplift: { color: '#FFC107', opacity: 0.6 },
        yard_base: { color: '#393838', opacity: 1.0 },
    };

    const config = zoneTypes[zone.type] || { color: '#9E9E9E', opacity: 0.3 };
    const isYardBase = zone.type === 'yard_base';

    // For yard_base, create geometry from corner points
    const geometry = useMemo(() => {
        if (isYardBase && zone.corner_points) {
            const shape = new THREE.Shape();
            const points = zone.corner_points;

            if (points.length > 0) {
                // Start from the first point
                shape.moveTo(points[0].x - zone.position.x, points[0].z - zone.position.z);

                // Connect to subsequent points
                for (let i = 1; i < points.length; i++) {
                    shape.lineTo(points[i].x - zone.position.x, points[i].z - zone.position.z);
                }

                // Close the shape by connecting back to the first point
                shape.lineTo(points[0].x - zone.position.x, points[0].z - zone.position.z);
            }

            return new THREE.ShapeGeometry(shape);
        } else {
            // Default rectangle geometry
            return new THREE.PlaneGeometry(zone.dimensions.width, zone.dimensions.height);
        }
    }, [isYardBase, zone]);

    return (
        <mesh
            position={[zone.position.x, zone.position.y, zone.position.z]}
            rotation={[-Math.PI / 2, zone.rotation || 0, 0]}
            receiveShadow={isYardBase}
        >
            <primitive object={geometry} />
            <meshStandardMaterial
                color={config.color}
                transparent={true}
                opacity={0.5}
                side={THREE.DoubleSide}
                roughness={0.9}
                metalness={0.1}
            />
        </mesh>
    );
};

const BlockLots: React.FC<{ block: BlockData }> = ({ block }) => {
    const lots = useMemo(() => {
        const lotList = [];
        const { width, height } = block.dimensions;
        const baseX = block.position.x;
        const baseZ = block.position.z;

        const containerType = block.container_type;
        const lotWidth = containerType === '40ft' ? 12.5 : 6.5;
        const lotDepth = containerType === '40ft' ? 2.3 : 2.6;
        const horizontalGap = 1.25;
        const verticalGap = 0.12;
        const slotWidth = lotWidth + horizontalGap;
        const slotHeight = lotDepth + verticalGap;

        const rowsArray = block.row_labels || [];
        const bayNumbers = block.bay_numbers || [];

        for (let bay = 0; bay < block.bays; bay++) {
            for (let row = 0; row < block.rows; row++) {
                const x = baseX - width / 2 + (bay * slotWidth) + (slotWidth / 2);
                const z = baseZ - height / 2 + (row * slotHeight) + (slotHeight / 2);

                const bayNumber = bayNumbers[bay] || (bay + 1);
                const rowLetter = rowsArray[row] || String.fromCharCode(65 + row);

                lotList.push({
                    id: `${block.id}_${rowLetter}${bayNumber}`,
                    position: [x, 0.2, z] as [number, number, number],
                    size: [lotWidth, 0.1, lotDepth] as [number, number, number],
                });
            }
        }

        return lotList;
    }, [block]);

    return (
        <group>
            {lots.map((lot) => (
                <mesh key={lot.id} position={lot.position}>
                    <boxGeometry args={lot.size} />
                </mesh>
            ))}
        </group>
    );
};

const BlockLabels: React.FC<{ block: BlockData }> = ({ block }) => {
    const labels = useMemo(() => {
        const labelList = [];
        const { width, height } = block.dimensions;
        const baseX = block.position.x;
        const baseZ = block.position.z;

        const containerType = block.container_type;
        const lotWidth = containerType === '40ft' ? 12.5 : 6.5;
        const lotDepth = containerType === '40ft' ? 2.3 : 2.6;
        const horizontalGap = 1.25;
        const verticalGap = 0.12;
        const actualSlotWidth = lotWidth + horizontalGap;

        const bayNumbers = block.bay_numbers || [];
        const rowsArray = block.row_labels || [];

        // Bay labels
        for (let i = 0; i < bayNumbers.length; i++) {
            const bayNumber = bayNumbers[i];
            const x = baseX - width / 2 + (i * actualSlotWidth) + (actualSlotWidth / 2);
            const z = baseZ - height / 2 - 1.2;

            labelList.push({
                text: bayNumber.toString(),
                position: [x, 0.8, z] as [number, number, number],
                size: containerType === '20ft' ? 1.2 : 1.6,
            });
        }

        // Row labels
        const isTRS = block.id.startsWith('trs_');
        const xOffset = isTRS ? -width / 2 - 2.0 : width / 2 + 2.0;

        for (let i = 0; i < rowsArray.length; i++) {
            const rowLetter = rowsArray[i];

            const actualSlotHeight = lotDepth + verticalGap;
            const z = baseZ - height / 2 + (i * actualSlotHeight) + (actualSlotHeight / 2);

            labelList.push({
                text: rowLetter,
                position: [baseX + xOffset, 0.5, z] as [number, number, number],
                size: containerType === '20ft' ? 1.2 : 1.6,
            });
        }

        return labelList;
    }, [block]);

    return (
        <group>
            {labels.map((label, index) => (
                <Billboard key={index} position={label.position}>
                    <Text
                        fontSize={label.size}
                        color="black"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.02}
                        outlineColor="black"
                    >
                        {label.text}
                    </Text>
                </Billboard>
            ))}
        </group>
    );
};

const LayoutBuilder: React.FC = () => {
    const [layoutData, setLayoutData] = useState<any>(null);

    useEffect(() => {
        fetch('/naqleen_terminal_zones.json')
            .then(response => response.json())
            .then(json => setLayoutData(json))
            .catch(error => console.error('Error loading JSON:', error));
    }, []);

    const zones = useMemo(() => {
        if (!layoutData) return { zones: [], blocks: [] };

        const allZones: ZoneData[] = [];
        const blocks: BlockData[] = [];

        // Flatten zones from all categories
        const flattenZones = (obj: any) => {
            if (Array.isArray(obj)) {
                obj.forEach(item => flattenZones(item));
            } else if (obj && typeof obj === 'object') {
                if ((obj.dimensions && obj.position) || (obj.type === 'yard_base' && obj.corner_points && obj.position)) {
                    if (obj.bays && obj.rows) {
                        blocks.push(obj);
                    } else {
                        allZones.push(obj);
                    }
                } else {
                    Object.values(obj).forEach(flattenZones);
                }
            }
        };

        flattenZones(layoutData.naqleen_terminal_zones.zones);

        return { zones: allZones, blocks };
    }, [layoutData]);

    if (!layoutData) return null;

    return (
        <group>
            {/* Render zones */}
            {zones.zones.map((zone) => (
                <Zone key={zone.id} zone={zone} />
            ))}

            {/* Render blocks and their lots/labels */}
            {zones.blocks.map((block) => (
                <group key={block.id}>
                    <Zone zone={block} />
                    <BlockLots block={block} />
                    <BlockLabels block={block} />
                </group>
            ))}
        </group>
    );
};

export default LayoutBuilder;
