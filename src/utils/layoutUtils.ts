import { Vector3, Euler } from 'three';

export interface TerminalZone {
    id: string;
    type: string;
    dimensions: { width: number; height: number; unit: string };
    position: { x: number; y: number; z: number; unit: string };
    rotation: number;
    description: string;
    container_type?: string;
    bays?: number;
    rows?: number;
    bay_gap?: number;
    row_labels?: string[];
    bay_numbers?: number[];
    capacity?: string;
}

export interface TerminalLayout {
    id: string;
    terminal_info: any;
    zone_types: any;
    zones: {
        main_operational_zones: Record<string, TerminalZone>;
        yard_base: TerminalZone;
        trs_container_blocks: Record<string, TerminalZone | TerminalZone[]>;
        trm_container_blocks: Record<string, TerminalZone>;
    };
}

/**
 * New multi-terminal structure (v2.0)
 * Supports multiple terminals with easy switching
 */
export interface TerminalsData {
    version: string;
    terminals: Record<string, TerminalLayout>;
}

/**
 * Parse the multi-terminal JSON structure
 * @param json - Raw JSON data from naqleen_terminals.json
 * @param terminalId - Optional terminal ID (defaults to first terminal)
 * @returns Single terminal layout
 */
export const parseTerminals = (json: TerminalsData, terminalId?: string): TerminalLayout => {
    const selectedTerminalId = terminalId || Object.keys(json.terminals)[0];
    return json.terminals[selectedTerminalId];
};

/**
 * Get list of all available terminals
 */
export const getAvailableTerminals = (json: TerminalsData): Array<{ id: string; name: string; location: string }> => {
    return Object.entries(json.terminals).map(([id, terminal]) => ({
        id,
        name: terminal.terminal_info.name,
        location: terminal.terminal_info.location,
    }));
};

export const getContainerPosition = (
    zone: TerminalZone,
    bayIndex: number,
    rowIndex: number,
    tierIndex: number
): Vector3 => {
    // Container dimensions (approximate for 20ft and 40ft)
    const is20ft = zone.container_type === '20ft';
    const containerLength = is20ft ? 6.058 : 12.192;
    const containerWidth = 2.438;
    const containerHeight = 2.591;

    const gapX = zone.bay_gap || 0.5; // Gap between bays
    const gapZ = 0.3; // Gap between rows

    // Calculate local position within the block
    // Assuming bays are along X and rows are along Z
    // Center the block

    const totalWidth = (zone.bays || 1) * (containerLength + gapX);
    const totalDepth = (zone.rows || 1) * (containerWidth + gapZ);

    const startX = -totalWidth / 2 + containerLength / 2;
    const startZ = -totalDepth / 2 + containerWidth / 2;

    const x = startX + bayIndex * (containerLength + gapX);
    const y = zone.position.y + containerHeight / 2 + tierIndex * containerHeight;
    const z = startZ + rowIndex * (containerWidth + gapZ);

    // Apply zone position and rotation
    const position = new Vector3(x, y, z);

    // Simple rotation around Y axis if needed (assuming rotation is in degrees)
    if (zone.rotation) {
        const euler = new Euler(0, (zone.rotation * Math.PI) / 180, 0);
        position.applyEuler(euler);
    }

    position.add(new Vector3(zone.position.x, 0, zone.position.z));

    return position;
};

export const getAllBlocks = (layout: TerminalLayout): TerminalZone[] => {
    const blocks: TerminalZone[] = [];

    Object.values(layout.zones.trs_container_blocks).forEach(block => {
        if (Array.isArray(block)) {
            blocks.push(...block);
        } else {
            blocks.push(block);
        }
    });

    Object.values(layout.zones.trm_container_blocks).forEach(block => {
        blocks.push(block);
    });

    return blocks;
};
