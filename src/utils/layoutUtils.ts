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
        trs_container_blocks: Record<string, IcdTerminal | IcdTerminal[]>;
        trm_container_blocks: Record<string, IcdTerminal>;
    };
}

/**
 * New multi-icd structure (v2.0)
 * Supports multiple icds with easy switching
 */
export interface IcdsData {
    version: string;
    icds: Record<string, IcdLayout>;
}

/**
 * Parse the multi-icd JSON structure
 * @param json - Raw JSON data from naqleen_icds.json
 * @param icdId - Optional icd ID (defaults to first icd)
 * @returns Single icd layout
 */
export const parseIcds = (json: IcdsData, icdId?: string): IcdLayout => {
    const selectedIcdId = icdId || Object.keys(json.icds)[0];
    return json.icds[selectedIcdId];
};

/**
 * Get list of all available icds
 */
export const getAvailableIcds = (json: IcdsData): Array<{ id: string; name: string; location: string }> => {
    return Object.entries(json.icds).map(([id, icd]) => ({
        id,
        name: icd.icd_info.name,
        location: icd.icd_info.location,
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
    const y = terminal.position.y + containerHeight / 2 + levelIndex * containerHeight;
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

    Object.values(layout.terminals.trs_container_blocks).forEach(block => {
        if (Array.isArray(block)) {
            blocks.push(...block);
        } else {
            blocks.push(block);
        }
    });

    Object.values(layout.terminals.trm_container_blocks).forEach(block => {
        blocks.push(block);
    });

    return blocks;
};
