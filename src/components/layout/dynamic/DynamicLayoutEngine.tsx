import React from 'react';
import { useStore } from '../../../store/store';
import { ComponentRegistry } from './Registry';
import type { DynamicEntity } from '../../../utils/layoutUtils';

const DynamicLayoutEngine: React.FC = () => {
    // We need to cast the layout to Dynamic type because we haven't updated the store type yet
    // but at runtime it will be the new JSON
    const layoutWrapper = useStore((state) => state.layout) as any;
    const selectedBlock = useStore((state) => state.selectedBlock);

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

                // Normalize props
                // 1. Position object {x,y,z} -> Array [x,y,z]
                const position: [number, number, number] = [
                    entity.position.x,
                    entity.position.y,
                    entity.position.z
                ];

                // 2. Merge root fields and props
                const componentProps = {
                    id: entity.id,
                    type: entity.type,
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
