import { Vector3, Euler } from 'three';

export interface IcdTerminal {
    id: string;
    type: string;
    dimensions: { width: number; height: number; unit: string };
    position: { x: number; y: number; z: number; unit: string };
    rotation: number;
    description: string;
    container_type?: string;
    lots?: number;
    rows?: number;
    lot_gap?: number;
    row_labels?: string[];
    lot_numbers?: number[];
    capacity?: string;
}

export interface IcdLayout {
    id: string;
    icd_info: any;
    terminal_types: any;
    terminals: {
        main_operational_terminals: Record<string, IcdTerminal>;
        yard_base: IcdTerminal;
        trs_blocks: Record<string, IcdTerminal | IcdTerminal[]>;
        trm_blocks: Record<string, IcdTerminal>;
    };
}

/**
 * Parse the multi-icd JSON structure
 * @param json - Raw JSON data from naqleen_icds.json
 * @param icdId - Optional icd ID (defaults to first icd)
 * @returns Single icd layout
 */
export const parseIcds = (json: DynamicIcdsData, icdId?: string): DynamicIcdLayout => {
    const selectedIcdId = icdId || Object.keys(json.icds)[0];
    return json.icds[selectedIcdId];
};

/**
 * Get list of all available icds
 */
export const getAvailableIcds = (json: DynamicIcdsData): Array<{ id: string; name: string; location: string }> => {
    return Object.entries(json.icds).map(([id, icd]: [string, any]) => ({
        id,
        name: icd.name || 'Unknown ICD',
        location: icd.location || 'Unknown Location',
    }));
};

export const getContainerPosition = (
    terminal: IcdTerminal,
    lotIndex: number,
    rowIndex: number,
    levelIndex: number
): Vector3 => {
    // Container dimensions (approximate for 20ft and 40ft)
    const is20ft = terminal.container_type === '20ft';
    const containerLength = is20ft ? 6.058 : 12.192;
    const containerWidth = 2.438;
    const containerHeight = 2.591;
    const levelGap = 0.02; // Small gap to prevent z-fighting between stacked containers

    const gapX = terminal.lot_gap || 0.5; // Gap between lots
    const gapZ = 0.3; // Gap between rows

    // Calculate local position within the block
    // Assuming lots are along X and rows are along Z
    // Center the block

    const totalWidth = (terminal.lots || 1) * (containerLength + gapX);
    const totalDepth = (terminal.rows || 1) * (containerWidth + gapZ);

    const startX = -totalWidth / 2 + containerLength / 2;
    const startZ = -totalDepth / 2 + containerWidth / 2;

    const x = startX + lotIndex * (containerLength + gapX);
    const y = terminal.position.y + containerHeight / 2 + levelIndex * (containerHeight + levelGap);
    const z = startZ + rowIndex * (containerWidth + gapZ);

    // Apply terminal position and rotation
    const position = new Vector3(x, y, z);

    // Simple rotation around Y axis if needed (assuming rotation is in degrees)
    if (terminal.rotation) {
        const euler = new Euler(0, (terminal.rotation * Math.PI) / 180, 0);
        position.applyEuler(euler);
    }

    position.add(new Vector3(terminal.position.x, 0, terminal.position.z));

    return position;
};

export const getAllBlocks = (layout: IcdLayout): IcdTerminal[] => {
    const blocks: IcdTerminal[] = [];

    Object.values(layout.terminals.trs_blocks).forEach(block => {
        if (Array.isArray(block)) {
            blocks.push(...block);
        } else {
            blocks.push(block);
        }
    });

    Object.values(layout.terminals.trm_blocks).forEach(block => {
        blocks.push(block);
    });

    return blocks;
};

// --- Dynamic Engine Types ---

// Block Placement (must be defined before DynamicEntity)
export interface BlockPlacement {
    anchor?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    relative_to?: string;      // ID of another block
    placement?: 'below' | 'above' | 'left' | 'right';
    gap?: number;              // Gap from reference block or edge
    offset_x?: number;         // Additional x offset
    offset_z?: number;         // Additional z offset
}

export interface DynamicEntity {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation?: number;
    dimensions?: { width: number; height: number }; // Optional base dimensions
    corner_points?: Array<{ x: number; z: number }>; // For irregular shapes
    props?: Record<string, any>; // Flexible props for specific components
    placement?: BlockPlacement; // Dynamic positioning
}

// --- Layout Specification Types ---

export interface ContainerLotSpec {
    lot_length: number;    // Length of each lot along X-axis (meters)
    lot_gap: number;       // Gap between lots (meters)
    row_width: number;     // Width of each row along Z-axis (meters)
    row_gap: number;       // Gap between rows (meters)
}

export interface LotSpecs {
    '20ft'?: ContainerLotSpec;
    '40ft'?: ContainerLotSpec;
    // Legacy flat structure support
    lot_height?: number;
    lot_gap?: number;
    row_width?: number;
    row_gap?: number;
}

export interface InnerPadding {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface DynamicIcdLayout {
    id: string;
    name: string;
    location: string;
    total_dimensions?: {
        width: number;
        height: number;
        unit: string;
        note?: string;
        inner_padding?: InnerPadding;
        lot_specs?: LotSpecs;
        corner_points?: Array<{ x: number; z: number }>; // For polygon yard shape
    };
    entities: DynamicEntity[];
}

export interface DynamicIcdsData {
    version: string;
    icds: Record<string, DynamicIcdLayout>;
}

// --- Block Dimension Calculation ---
// IMPORTANT: In this layout system:
//   - Width (X axis) = calculated from LOTS (containers along X)
//   - Height (Z axis) = calculated from ROWS (containers along Z)
// If block_width and block_depth are specified, use those fixed values

export const calculateBlockDimensions = (
    entity: DynamicEntity,
    _lotSpecs?: LotSpecs // Available for future use
): { width: number; height: number } => {
    const props = entity.props || {};

    // If explicit block dimensions are provided, use them
    if (props.block_width && props.block_depth) {
        return { width: props.block_width, height: props.block_depth };
    }

    // Otherwise calculate from lots/rows using container dimensions
    const lots = props.lots || 1;
    const rows = props.rows || 1;
    const containerType = props.container_type || '20ft';
    const is20ft = containerType === '20ft';
    const containerLength = is20ft ? 6.058 : 12.192; // Length along X per lot
    const containerWidth = 2.438; // Width along Z per row
    const gapX = props.lot_gap || 0.5;
    const gapZ = 0.3;

    // Match IcdMarkings.tsx totalWidth calculation
    const lotGaps: Record<string, number> = props.lot_gaps || {};
    const lotNumbers: number[] = props.lot_numbers || Array.from({ length: lots }, (_, i) => i + 1);

    // Calculate total width accounting for custom lot gaps
    let totalWidth = 0;
    for (let i = 0; i < lots; i++) {
        totalWidth += containerLength;
        if (i < lots - 1) {
            const lotNum = lotNumbers[i];
            totalWidth += lotGaps[String(lotNum)] ?? gapX;
        }
    }

    // Height (Z) = rows × container width + gaps between rows
    const totalHeight = rows * (containerWidth + gapZ);

    return { width: totalWidth, height: totalHeight };
};

// --- Dynamic Position Calculation ---

export const calculateBlockPosition = (
    entity: DynamicEntity,
    layout: DynamicIcdLayout,
    allEntities: DynamicEntity[]
): { x: number; z: number } => {
    const placement = entity.placement as BlockPlacement | undefined;
    const totalDims = layout.total_dimensions;
    const lotSpecs = totalDims?.lot_specs;
    const padding = totalDims?.inner_padding || { top: 0, right: 0, bottom: 0, left: 0 };

    // If position is explicitly set, use it
    if (entity.position && entity.position.x !== undefined && entity.position.z !== undefined) {
        // Check if this is a placeholder (0, 0) that needs calculation
        if (entity.position.x !== 0 || entity.position.z !== 0 || !placement) {
            return { x: entity.position.x, z: entity.position.z };
        }
    }

    // Calculate block dimensions
    const blockDims = calculateBlockDimensions(entity, lotSpecs);

    // Yard bounds (centered at origin)
    const yardWidth = totalDims?.width || 760;
    const yardHeight = totalDims?.height || 145;
    const yardMinX = -yardWidth / 2;
    const yardMaxX = yardWidth / 2;
    const yardMinZ = -yardHeight / 2;  // Top (north)
    const yardMaxZ = yardHeight / 2;   // Bottom (south)

    // Handle anchor-based positioning
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

    // Handle relative positioning
    if (placement?.relative_to) {
        const refEntity = allEntities.find(e => e.id === placement.relative_to);
        if (refEntity) {
            const refPos = calculateBlockPosition(refEntity, layout, allEntities);
            const refDims = calculateBlockDimensions(refEntity, lotSpecs);
            const gap = placement.gap ?? 2; // Default 2m gap
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
                    // Debug: log the calculation for trs_block_d
                    if (entity.id === 'trs_block_d') {
                        console.log(`[calculateBlockPosition] trs_block_d: refEntity=${refEntity.id}, refPos.x=${refPos.x.toFixed(2)}, refDims.width=${refDims.width.toFixed(2)}, blockDims.width=${blockDims.width.toFixed(2)}, gap=${gap}, result x=${x.toFixed(2)}`);
                    }
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

    // Fallback to explicit position or default
    return {
        x: entity.position?.x || 0,
        z: entity.position?.z || 0
    };
};

export const parseDynamicIcds = (json: DynamicIcdsData, icdId?: string): DynamicIcdLayout => {
    const selectedIcdId = icdId || Object.keys(json.icds)[0];
    return json.icds[selectedIcdId];
};

export const getAllDynamicBlocks = (layout: DynamicIcdLayout): DynamicEntity[] => {
    if (!layout || !layout.entities) return [];
    return layout.entities.filter(e => e && e.type && e.type.includes('block'));
};

/**
 * Returns all dynamic blocks with their calculated positions applied.
 * Blocks with `placement` property will have their positions calculated using calculateBlockPosition.
 * This should be used whenever you need actual rendered positions, not raw JSON positions.
 */
export const getBlocksWithCalculatedPositions = (layout: DynamicIcdLayout): DynamicEntity[] => {
    const rawBlocks = getAllDynamicBlocks(layout);
    const processedBlocks: DynamicEntity[] = [];

    for (const block of rawBlocks) {
        if (block.placement) {
            // Build lookup array with already-processed blocks first
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
    entity: DynamicEntity,
    lotIndex: number,
    rowIndex: number,
    levelIndex: number
): Vector3 => {
    const props = entity.props || {};

    // Container dimensions
    const containerType = props.container_type || '20ft';
    const is20ft = containerType === '20ft';
    const containerHeight = 2.591;
    const levelGap = 0.02; // Small gap to prevent z-fighting between stacked containers

    // Calculate local position within the block
    const lots = props.lots || 1;
    const rows = props.rows || 1;
    const lotNumbers: number[] = props.lot_numbers || Array.from({ length: lots }, (_, i) => i + 1);
    const lotGaps: Record<string, number> = props.lot_gaps || {};

    // Variables for slot dimensions
    let containerLength: number;
    let containerWidth: number;
    let gapX: number;
    let gapZ: number;
    let totalWidth: number;
    let totalDepth: number;

    // SYNC WITH IcdMarkings.tsx: Use same dimension calculation logic
    if (props.block_width && props.block_depth) {
        // Fixed block dimensions - calculate slot size from total (same as IcdMarkings)
        totalWidth = props.block_width;
        totalDepth = props.block_depth;

        // Derive slot dimensions: width = totalWidth / lots (assuming uniform slots)
        gapX = 0.5; // Default gap
        gapZ = 0.3;
        containerLength = (totalWidth - (lots - 1) * gapX) / lots;
        containerWidth = (totalDepth - (rows - 1) * gapZ) / rows;
    } else {
        // Calculate from standard container dimensions
        containerLength = is20ft ? 6.058 : 12.192;
        containerWidth = 2.438;
        gapX = props.lot_gap || 0.5;
        gapZ = 0.3;

        // Calculate total width accounting for custom lot gaps
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

    // Calculate X offset with cumulative gaps
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

    // Apply terminal position and rotation
    const position = new Vector3(x, y, z);

    // Simple rotation around Y axis
    if (entity.rotation) {
        const euler = new Euler(0, (entity.rotation * Math.PI) / 180, 0);
        position.applyEuler(euler);
    }

    position.add(new Vector3(entity.position.x, 0, entity.position.z));

    return position;
};
