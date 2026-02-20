import { Vector3, Euler } from 'three';
import type {
    IcdLayoutSchema,
    IcdEntity,
    ContainerBlockEntity,
    LotSpecs
} from '../types/IcdSchema';


// Re-export strict types for consumers
export type {
    IcdLayoutSchema,
    IcdEntity,
    ContainerBlockEntity,
    LotSpecs
} from '../types/IcdSchema';

// Legacy Type Aliases for compatibility during migration
export type DynamicIcdLayout = IcdLayoutSchema;
export type DynamicEntity = IcdEntity;
export type DynamicIcdsData = { version: string; icds: Record<string, IcdLayoutSchema> };


/**
 * Parse the multi-icd JSON structure
 */
export const parseIcds = (json: DynamicIcdsData, icdId?: string): IcdLayoutSchema => {
    const selectedIcdId = icdId || Object.keys(json.icds)[0];
    return json.icds[selectedIcdId];
};

/**
 * Get list of all available icds
 */
export const getAvailableIcds = (json: DynamicIcdsData): Array<{ id: string; name: string; location: string }> => {
    return Object.entries(json.icds).map(([id, icd]) => ({
        id,
        name: icd.name || 'Unknown ICD',
        location: icd.location || 'Unknown Location',
    }));
};

// --- Block Dimension Calculation ---

export const calculateBlockDimensions = (
    entity: IcdEntity,
    _lotSpecs?: LotSpecs
): { width: number; height: number } => {

    // Default dimensions if explicit ones exist (e.g. Warehouse/CFS)
    if (entity.dimensions) {
        return { width: entity.dimensions.width, height: entity.dimensions.height };
    }

    // Checking if it's a container block to calculate dims from slots
    if (entity.type.includes('container_block')) {
        const blockEntity = entity as ContainerBlockEntity;
        const props = blockEntity.props;

        // Explicit override in props
        if (props.block_width && props.block_depth) {
            return { width: props.block_width, height: props.block_depth };
        }

        const lots = props.lots || 1;
        const rows = props.rows || 1;
        const containerType = props.container_type || '20ft';
        const is20ft = containerType === '20ft';
        const containerLength = is20ft ? 6.058 : 12.192;
        const containerWidth = 2.438;
        const gapX = props.lot_gap || 0.5;
        const gapZ = 0.3;

        const lotGaps = props.lot_gaps || {};
        const lotNumbers = props.lot_numbers || Array.from({ length: lots }, (_, i) => i + 1);

        let totalWidth = 0;
        for (let i = 0; i < lots; i++) {
            totalWidth += containerLength;
            if (i < lots - 1) {
                const lotNum = lotNumbers[i];
                totalWidth += lotGaps[String(lotNum)] ?? gapX;
            }
        }

        const totalHeight = rows * (containerWidth + gapZ);
        return { width: totalWidth, height: totalHeight };
    }

    return { width: 10, height: 10 }; // Fallback
};

// --- Dynamic Position Calculation ---

export const calculateBlockPosition = (
    entity: IcdEntity,
    layout: IcdLayoutSchema,
    allEntities: IcdEntity[],
    visited: Set<string> = new Set()
): { x: number; z: number } => {
    // 1. Cycle Detection
    if (visited.has(entity.id)) {
        console.error(`❌ [Layout] Infinite Loop Detected! Entity '${entity.id}' references itself indirectly. Breaking recursion at default (0,0).`);
        return { x: 0, z: 0 };
    }
    visited.add(entity.id);
    const placement = entity.placement;
    const totalDims = layout.total_dimensions;
    const lotSpecs = totalDims?.lot_specs;
    const padding = totalDims?.inner_padding || { top: 0, right: 0, bottom: 0, left: 0 };

    // Explicit position override
    if (entity.position && entity.position.x !== undefined && entity.position.z !== undefined) {
        // Check if this is a placeholder (0, 0)
        if (entity.position.x !== 0 || entity.position.z !== 0 || !placement) {
            return { x: entity.position.x, z: entity.position.z };
        }
    }

    const blockDims = calculateBlockDimensions(entity, lotSpecs);

    const yardWidth = totalDims?.width || 760;
    const yardHeight = totalDims?.height || 145;
    const yardMinX = -yardWidth / 2;
    const yardMaxX = yardWidth / 2;
    const yardMinZ = -yardHeight / 2;
    const yardMaxZ = yardHeight / 2;

    if (placement?.anchor) {
        let x = 0, z = 0;
        const offsetX = placement.offset_x || 0;
        const offsetZ = placement.offset_z || 0;

        switch (placement.anchor) {
            case 'top-right':
                x = yardMaxX - padding.right - blockDims.width / 2 + offsetX;
                z = yardMinZ + padding.top + blockDims.height / 2 + offsetZ;
                break;
            case 'top-left':
                x = yardMinX + padding.left + blockDims.width / 2 + offsetX;
                z = yardMinZ + padding.top + blockDims.height / 2 + offsetZ;
                break;
            case 'bottom-right':
                x = yardMaxX - padding.right - blockDims.width / 2 + offsetX;
                z = yardMaxZ - padding.bottom - blockDims.height / 2 + offsetZ;
                break;
            case 'bottom-left':
                x = yardMinX + padding.left + blockDims.width / 2 + offsetX;
                z = yardMaxZ - padding.bottom - blockDims.height / 2 + offsetZ;
                break;
        }
        return { x, z };
    }

    if (placement?.relative_to) {
        const refEntity = allEntities.find(e => e.id === placement.relative_to);
        if (refEntity) {
            const refPos = calculateBlockPosition(refEntity, layout, allEntities, new Set(visited));
            const refDims = calculateBlockDimensions(refEntity, lotSpecs);
            const gap = placement.gap ?? 2;
            const offsetX = placement.offset_x || 0;
            const offsetZ = placement.offset_z || 0;

            let x = refPos.x + offsetX;
            let z = refPos.z + offsetZ;

            switch (placement.placement) {
                case 'below':
                    z = refPos.z + refDims.height / 2 + gap + blockDims.height / 2;
                    break;
                case 'above':
                    z = refPos.z - refDims.height / 2 - gap - blockDims.height / 2;
                    break;
                case 'left':
                    x = refPos.x - refDims.width / 2 - gap - blockDims.width / 2;
                    break;
                case 'right':
                    x = refPos.x + refDims.width / 2 + gap + blockDims.width / 2;
                    break;
            }
            return { x, z };
        } else {
            console.warn(`[calculateBlockPosition] ${entity.id}: reference entity '${placement.relative_to}' NOT FOUND!`);
        }
    }

    return {
        x: entity.position?.x || 0,
        z: entity.position?.z || 0
    };
};

export const parseDynamicIcds = parseIcds; // Alias

export const getAllDynamicBlocks = (layout: IcdLayoutSchema): IcdEntity[] => {
    if (!layout || !layout.entities) return [];
    return layout.entities.filter(e => e && e.type && e.type.includes('block'));
};

export const getBlocksWithCalculatedPositions = (layout: IcdLayoutSchema): IcdEntity[] => {
    const rawBlocks = getAllDynamicBlocks(layout);
    const processedBlocks: IcdEntity[] = [];

    for (const block of rawBlocks) {
        if (block.placement) {
            const allBlocksForLookup = [...processedBlocks, ...rawBlocks.filter(b => !processedBlocks.find(p => p.id === b.id))];
            const calculatedPos = calculateBlockPosition(block, layout, allBlocksForLookup);
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
};

export const getDynamicContainerPosition = (
    entity: IcdEntity,
    lotIndex: number,
    rowIndex: number,
    levelIndex: number
): Vector3 => {

    // Ensure it is a container block
    if (!entity.type.includes('container_block')) return new Vector3(0, 0, 0);
    const blockEntity = entity as ContainerBlockEntity;
    const props = blockEntity.props;

    const containerType = props.container_type || '20ft';
    const is20ft = containerType === '20ft';
    const containerHeight = 2.591;
    const levelGap = 0.02;

    // Calculate local position within the block
    const lots = props.lots || 1;
    const rows = props.rows || 1;
    const lotNumbers = props.lot_numbers || Array.from({ length: lots }, (_, i) => i + 1);
    const lotGaps = props.lot_gaps || {};

    let containerLength: number;
    let containerWidth: number;
    let gapX: number;
    let gapZ: number;
    let totalWidth: number;
    let totalDepth: number;

    if (props.block_width && props.block_depth) {
        totalWidth = props.block_width;
        totalDepth = props.block_depth;
        gapX = 0.5;
        gapZ = 0.3;
        containerLength = (totalWidth - (lots - 1) * gapX) / lots;
        containerWidth = (totalDepth - (rows - 1) * gapZ) / rows;
    } else {
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

    let xOffset = 0;
    for (let i = 0; i < lotIndex; i++) {
        const lotNum = lotNumbers[i];
        xOffset += containerLength + (lotGaps[String(lotNum)] ?? gapX);
    }

    const startX = -totalWidth / 2 + containerLength / 2;
    const startZ = -totalDepth / 2 + containerWidth / 2;

    const x = startX + xOffset;
    const y = entity.position.y + containerHeight / 2 + levelIndex * (containerHeight + levelGap);
    const z = startZ + rowIndex * (containerWidth + gapZ);

    const position = new Vector3(x, y, z);

    if (entity.rotation) {
        const euler = new Euler(0, (entity.rotation * Math.PI) / 180, 0);
        position.applyEuler(euler);
    }

    position.add(new Vector3(entity.position.x, 0, entity.position.z));

    return position;
};
