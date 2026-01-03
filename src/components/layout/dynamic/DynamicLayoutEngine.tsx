import React, { useMemo } from 'react';
import { useStore } from '../../../store/store';
import { ComponentRegistry } from './Registry';
import { getBlocksWithCalculatedPositions } from '../../../utils/layoutUtils';
import type { DynamicEntity, DynamicIcdLayout } from '../../../utils/layoutUtils';

const DynamicLayoutEngine: React.FC = () => {
    // We need to cast the layout to Dynamic type because we haven't updated the store type yet
    // but at runtime it will be the new JSON
    const layoutWrapper = useStore((state) => state.layout) as DynamicIcdLayout | null;
    const selectedBlock = useStore((state) => state.selectedBlock);

    // Build a map of block IDs to their calculated positions
    const calculatedPositionMap = useMemo(() => {
        if (!layoutWrapper) return new Map<string, { x: number; z: number }>();
        const blocksWithPositions = getBlocksWithCalculatedPositions(layoutWrapper);
        const map = new Map<string, { x: number; z: number }>();
        blocksWithPositions.forEach(block => {
            map.set(block.id, { x: block.position.x, z: block.position.z });
        });
        return map;
    }, [layoutWrapper]);

    // Build a map of all entity positions (for placement resolution)
    const entityPositionMap = useMemo(() => {
        if (!layoutWrapper) return new Map<string, { x: number; z: number }>();
        const map = new Map<string, { x: number; z: number }>();

        // First pass: add entities without placement references
        layoutWrapper.entities?.forEach(entity => {
            if (!entity.placement) {
                // Check if it's in the calculated position map (blocks use this)
                const calcPos = calculatedPositionMap.get(entity.id);
                if (calcPos) {
                    map.set(entity.id, calcPos);
                } else {
                    map.set(entity.id, { x: entity.position.x, z: entity.position.z });
                }
            }
        });

        // Second pass: resolve placement references
        layoutWrapper.entities?.forEach(entity => {
            if (entity.placement && entity.placement.relative_to) {
                const parent = map.get(entity.placement.relative_to);
                if (parent) {
                    const offsetX = entity.placement.offset_x || 0;
                    const offsetZ = entity.placement.offset_z || 0;
                    map.set(entity.id, {
                        x: parent.x + offsetX,
                        z: parent.z + offsetZ
                    });
                } else {
                    // Check if it's in the calculated block position map
                    const calcPos = calculatedPositionMap.get(entity.id);
                    if (calcPos) {
                        map.set(entity.id, calcPos);
                    }
                }
            }
        });

        return map;
    }, [layoutWrapper, calculatedPositionMap]);

    if (!layoutWrapper) return null;

    // Use entities directly if available (new format), or fail gracefully
    const entities = layoutWrapper.entities || [];

    return (
        <group>
            {entities.map((entity: DynamicEntity) => {
                const Component = ComponentRegistry[entity.type];
                if (!Component) {
                    console.warn(`DynamicLayoutEngine: Unknown entity type '${entity.type}' for id '${entity.id}'`);
                    return null;
                }

                const isSelected = entity.id === selectedBlock;

                // Dimming logic: If something is selected, dim everything else except 'yard_base'
                const isDimmed = !!selectedBlock && !isSelected && entity.type !== 'yard_base';

                // Get calculated position from entity map
                const calculatedPos = entityPositionMap.get(entity.id);

                // Normalize props
                // 1. Position object {x,y,z} -> Array [x,y,z]
                const position: [number, number, number] = [
                    calculatedPos?.x ?? entity.position.x,
                    entity.position.y,
                    calculatedPos?.z ?? entity.position.z
                ];

                // 2. Merge root fields and props
                const componentProps = {
                    id: entity.id,
                    type: entity.type,
                    name: (entity as any).name, // Pass name from entity root
                    position,
                    rotation: entity.rotation || 0,
                    dimensions: entity.dimensions,
                    corner_points: entity.corner_points,
                    isSelected,
                    isDimmed,
                    ...entity.props // Spread generic props (color, opacity, etc.)
                };

                return <Component key={entity.id} {...componentProps} />;
            })}
        </group>
    );
};

export default DynamicLayoutEngine;

