import React from 'react';
import CFSAreaComponent from '../../CFSArea';
import WarehouseComponent from '../../Warehouse';
import TruckComponent from '../../Truck';

// Wrapper props interface matching what DynamicLayoutEngine passes
interface DynamicComponentProps {
    id: string;
    type: string;
    position: [number, number, number];
    rotation: number;
    dimensions?: { width: number; height: number };
    isSelected?: boolean;
    isDimmed?: boolean;
    name?: string;
    containerColor?: string;
    // Allow any other props from entity.props
    [key: string]: any;
}

/**
 * Wrapper for CFSArea that maps dynamic props to CFSArea's expected props
 */
export const CFSAreaWrapper: React.FC<DynamicComponentProps> = ({
    id,
    name,
    position,
    dimensions,
    rotation,
    isDimmed = false,
    childEntities = [],
    entityPositionMap
}) => {
    return (
        <CFSAreaComponent
            id={id}
            name={name || 'CFS Area'}
            position={position}
            width={dimensions?.width || 50}
            depth={dimensions?.height || 25}
            rotation={rotation}
            isDimmed={isDimmed}
            childTrucks={childEntities}
            entityPositionMap={entityPositionMap}
        />
    );
};

/**
 * Wrapper for Warehouse that maps dynamic props to Warehouse's expected props
 */
export const WarehouseWrapper: React.FC<DynamicComponentProps> = ({
    id,
    name,
    position,
    dimensions,
    rotation,
    isDimmed = false
}) => {
    return (
        <WarehouseComponent
            id={id}
            name={name || 'Warehouse'}
            position={position}
            width={dimensions?.width || 50}
            depth={dimensions?.height || 20}
            rotation={rotation}
            isDimmed={isDimmed}
        />
    );
};

/**
 * Wrapper for Truck that maps dynamic props to Truck's expected props
 */
export const TruckWrapper: React.FC<DynamicComponentProps> = ({
    position,
    rotation,
    containerColor,
    isDimmed = false
}) => {
    // Raise y position by 0.2 to sit on top of CFS area floor
    const adjustedPosition: [number, number, number] = [
        position[0],
        position[1] + 0.2,
        position[2]
    ];

    return (
        <TruckComponent
            position={adjustedPosition}
            rotation={rotation}
            containerColor={containerColor}
            isDimmed={isDimmed}
        />
    );
};

