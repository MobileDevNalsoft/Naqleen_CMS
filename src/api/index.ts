import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/store';
import { useEffect } from 'react';
import { parseTerminals, getAvailableTerminals, getAllBlocks, getContainerPosition } from '../utils/layoutUtils';
import type { TerminalLayout, TerminalsData } from '../utils/layoutUtils';
import apiClient from './apiClient';

export interface ContainerData {
    id: string;
    x: number;
    y: number;
    z: number;
    status: 'active' | 'inactive' | 'maintenance';
    blockId: string;
    bay: number;
    row: number;
    tier: number;
}

/**
 * Fetch all terminals data from the new multi-terminal JSON structure
 * @returns All terminals data
 */
export async function getAllTerminals(): Promise<TerminalsData> {
    const response = await apiClient.get('/naqleen_terminals.json');
    return response.data;
}

/**
 * Fetch a specific terminal layout (or first terminal if no ID provided)
 * @param terminalId - Optional terminal ID (defaults to first terminal in the list)
 * @returns Single terminal layout ready for 3D visualization
 */
export async function getLayout(terminalId?: string): Promise<TerminalLayout> {
    const terminalsData = await getAllTerminals();
    return parseTerminals(terminalsData, terminalId);
}

/**
 * Hook to fetch list of available terminals
 * 
 * @returns Array of terminals with id, name, and location
 * 
 * @example
 * // Future use when you have multiple terminals:
 * const { data: terminals } = useTerminalsQuery();
 * 
 * <select onChange={(e) => setSelectedTerminal(e.target.value)}>
 *   {terminals?.map(t => (
 *     <option key={t.id} value={t.id}>{t.name}</option>
 *   ))}
 * </select>
 * 
 * @note Currently unused - only one terminal exists
 * Will be needed when adding terminal selector UI
 */
export const useTerminalsQuery = () => {
    return useQuery({
        queryKey: ['terminals-list'],
        queryFn: async () => {
            const data = await getAllTerminals();
            return getAvailableTerminals(data);
        },
    });
};

// Generate containers based on the layout
const generateContainersFromLayout = (layout: TerminalLayout): ContainerData[] => {
    const containers: ContainerData[] = [];
    const blocks = getAllBlocks(layout);

    blocks.forEach(block => {
        const bays = block.bays || 1;
        const rows = block.rows || 1;
        const tiers = 3; // Assume max 3 tiers for now

        // Fill about 60% of the slots
        for (let b = 0; b < bays; b++) {
            for (let r = 0; r < rows; r++) {
                for (let t = 0; t < tiers; t++) {
                    if (Math.random() > 0.4) {
                        // Ensure we don't have floating containers
                        if (t > 0) {
                            // Check if there is a container below
                            const below = containers.find(c => c.blockId === block.id && c.bay === b && c.row === r && c.tier === t - 1);
                            if (!below) continue;
                        }

                        const pos = getContainerPosition(block, b, r, t);

                        containers.push({
                            id: `${block.id}-b${b}-r${r}-t${t}`,
                            x: pos.x,
                            y: pos.y,
                            z: pos.z,
                            status: Math.random() > 0.9 ? 'maintenance' : Math.random() > 0.7 ? 'active' : 'inactive',
                            blockId: block.id,
                            bay: b,
                            row: r,
                            tier: t
                        });
                    }
                }
            }
        }
    });

    return containers;
};

/**
 * Hook to fetch the terminal layout
 * Currently configured for "naqleen-jeddah" terminal
 * To switch terminals, change the terminalId in the queryFn
 */
export const useLayoutQuery = () => {
    const setLayout = useStore((state) => state.setLayout);

    const query = useQuery({
        queryKey: ['layout', 'naqleen-jeddah'],
        queryFn: async () => {
            // Explicitly fetch "naqleen-jeddah" terminal
            return getLayout('naqleen-jeddah');
        },
    });

    useEffect(() => {
        if (query.data) {
            setLayout(query.data);
        }
    }, [query.data, setLayout]);

    return query;
};

export const useContainersQuery = (layout: TerminalLayout | null) => {
    const setEntitiesBatch = useStore((state) => state.setEntitiesBatch);

    const query = useQuery({
        queryKey: ['containers', layout?.terminal_info?.name || 'no-layout'],
        queryFn: async () => {
            if (!layout) return [];
            await new Promise(resolve => setTimeout(resolve, 500));
            return generateContainersFromLayout(layout);
        },
        enabled: !!layout,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (query.data && query.data.length > 0) {
            const currentIds = useStore.getState().ids;
            if (currentIds.length === 0) {
                setEntitiesBatch(query.data);
            }
        }
    }, [query.data, setEntitiesBatch]);

    return query;
};
