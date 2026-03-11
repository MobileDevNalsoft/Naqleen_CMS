import React from 'react';
import CFSAreaComponent from '../../CFSArea';
import WarehouseComponent from '../../Warehouse';
import TruckComponent from '../../../objects/Truck';
import { RestingRoom, GeneratorRoom } from '../../RestingRoom';
import { TerminalDispatchOffice, TerminalOffice } from '../../TerminalOffice';
import { CabinOffice } from '../../CabinOffice';

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
        position[1], // Ensure perfectly grounded (Y=0)
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

/**
 * Wrapper for RestingRoom
 */
export const RestingRoomWrapper: React.FC<DynamicComponentProps> = ({
    position,
    rotation,
    name
}) => {
    return (
        <RestingRoom
            position={position}
            rotation={rotation}
            label={name}
        />
    );
};

/**
 * Wrapper for GeneratorRoom
 */
export const GeneratorRoomWrapper: React.FC<DynamicComponentProps> = ({
    position,
    rotation
}) => {
    return (
        <GeneratorRoom
            position={position}
            rotation={rotation}
        />
    );
};

/**
 * Wrapper for TerminalDispatchOffice
 */
export const TerminalDispatchOfficeWrapper: React.FC<DynamicComponentProps> = ({
    position,
    rotation
}) => {
    return (
        <TerminalDispatchOffice
            position={position}
            rotation={rotation}
        />
    );
};

/**
 * Wrapper for TerminalOffice
 */
export const TerminalOfficeWrapper: React.FC<DynamicComponentProps> = ({
    position,
    rotation
}) => {
    return (
        <TerminalOffice
            position={position}
            rotation={rotation}
        />
    );
};

/**
 * Wrapper for CabinOffice
 */
export const CabinOfficeWrapper: React.FC<DynamicComponentProps> = ({
    position,
    rotation,
    name,
    dimensions,
    props,
    height
}) => {
    return (
        <CabinOffice
            position={position}
            rotation={rotation}
            label={name}
            width={dimensions?.width}
            depth={dimensions?.height}
            height={height}
            doorPosition={props?.doorPosition}
        />
    );
};
