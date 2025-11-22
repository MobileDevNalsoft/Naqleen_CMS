import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/store';
import { useEffect } from 'react';
import { parseTerminals, getAvailableTerminals, getContainerPosition, getAllBlocks } from '../utils/layoutUtils';
import type { TerminalLayout, TerminalsData, TerminalZone } from '../utils/layoutUtils';
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
    type?: string;
}

/**
 * Fetch all terminals data
 */
export async function getAllTerminals(): Promise<TerminalsData> {
    const response = await apiClient.get('/naqleen_terminals.json');
    return response.data;
}

/**
 * Fetch a specific terminal layout
 */
export async function getLayout(terminalId?: string): Promise<TerminalLayout> {
    const terminalsData = await getAllTerminals();
    return parseTerminals(terminalsData, terminalId);
}

/**
 * Fetch containers data and calculate positions based on layout
 */
export async function getContainers(layout: TerminalLayout): Promise<ContainerData[]> {
    const response = await apiClient.get('/containers.json');
    const rawContainers = response.data;

    // Calculate positions
    const blocks = getAllBlocks(layout);
    const blockMap = new Map<string, TerminalZone>();
    blocks.forEach(b => blockMap.set(b.id, b));

    return rawContainers.map((c: any) => {
        const block = blockMap.get(c.blockId);
        if (!block) {
            console.warn(`Block not found for container ${c.id}`);
            return { ...c, x: 0, y: 0, z: 0 };
        }

        const pos = getContainerPosition(block, c.bay, c.row, c.tier);
        return {
            ...c,
            x: pos.x,
            y: pos.y,
            z: pos.z
        };
    });
}

export const useTerminalsQuery = () => {
    return useQuery({
        queryKey: ['terminals-list'],
        queryFn: async () => {
            const data = await getAllTerminals();
            return getAvailableTerminals(data);
        },
    });
};

export const useLayoutQuery = () => {
    const setLayout = useStore((state) => state.setLayout);

    const query = useQuery({
        queryKey: ['layout', 'naqleen-jeddah'],
        queryFn: async () => {
            // Simulate loading delay for effect
            await new Promise(resolve => setTimeout(resolve, 1000));
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
            // Simulate loading delay for effect
            await new Promise(resolve => setTimeout(resolve, 1500));
            return getContainers(layout);
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
