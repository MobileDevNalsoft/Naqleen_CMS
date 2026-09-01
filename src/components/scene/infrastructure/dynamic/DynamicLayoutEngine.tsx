import React, { useMemo, useEffect } from 'react';
import { useStore } from '../../../../store/store';
import { ComponentRegistry } from './Registry';
import { getBlocksWithCalculatedPositions } from '../utils/layoutUtils';
import type { DynamicEntity, DynamicIcdLayout } from '../utils/layoutUtils';
import { validateLayout } from '../utils/icdValidator';

const DynamicLayoutEngine: React.FC = () => {
    // We need to cast the layout to Dynamic type because we haven't updated the store type yet
    // but at runtime it will be the new JSON
    const layoutWrapper = useStore((state) => state.layout) as DynamicIcdLayout | null;
    const selectedBlock = useStore((state) => state.selectedBlock);

    // Validate Layout on Load
    useEffect(() => {
        if (layoutWrapper) {
            try {
                const result = validateLayout(layoutWrapper);
                if (!result.isValid) {
                    console.error('❌ [ICD Engine] Validation Failed:', result.errors);
                } else if (result.warnings.length > 0) {
                    console.warn('⚠️ [ICD Engine] Layout Warnings:', result.warnings);
                } else {
                    console.log('✅ [ICD Engine] Layout Validated Successfully');
                }
            } catch (err) {
                console.error('🔥 [ICD Engine] Validation CRASHED:', err);
            }
        }
    }, [layoutWrapper]);

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

    // Build parent-child entity map (for grouping trucks under CFS areas, etc.)
    const childrenByParent = useMemo(() => {
        if (!layoutWrapper) return new Map<string, DynamicEntity[]>();
        const map = new Map<string, DynamicEntity[]>();

        layoutWrapper.entities?.forEach(entity => {
            const parentId = entity.placement?.relative_to;
            if (parentId) {
                if (!map.has(parentId)) {
                    map.set(parentId, []);
                }
                map.get(parentId)!.push(entity);
            }
        });

        return map;
    }, [layoutWrapper]);

    if (!layoutWrapper) return null;

    // Use entities directly if available (new format), or fail gracefully
    const entities = layoutWrapper.entities || [];

    // Filter out entities that have a parent (they'll be rendered by their parent)
    const topLevelEntities = entities.filter(entity => !entity.placement?.relative_to);

    return (
        <group>
            {topLevelEntities.map((entity: DynamicEntity) => {
                // Block entities belong to IcdMarkings (SlotMarkings + BlockLabels), which draws
                // their slot grid, row/lot labels and selection dimming. Skipped here with the
                // same predicate getAllDynamicBlocks() uses, so the two never disagree.
                // Silencing them one type at a time in the Registry didn't scale: only
                // 'container_block_a' was ever listed, so 'container_block_b'..'_e' (Jeddah)
                // and 'container_block' (Dammam) warned on every single render.
                if (entity.type.includes('block')) return null;

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

                // Get child entities for this parent (e.g., trucks for CFS areas)
                const childEntities = childrenByParent.get(entity.id) || [];

                // 2. Merge root fields and props
                const componentProps = {
                    id: entity.id,
                    type: entity.type,
                    name: entity.name, // Strict type access
                    position,
                    rotation: entity.rotation || 0,
                    dimensions: entity.dimensions,
                    corner_points: entity.corner_points,
                    isSelected,
                    isDimmed,
                    childEntities, // Pass child entities for parent-child grouping
                    entityPositionMap, // Pass position map so children can resolve their positions
                    props: entity.props, // Pass original props object explicitly so components like GenericBlock can access structured data (lots, gaps)
                    ...entity.props // Spread generic props (color, opacity, etc.) as top-level props
                };

                return <Component key={entity.id} {...componentProps} />;
            })}
        </group>
    );
};

export default DynamicLayoutEngine;

