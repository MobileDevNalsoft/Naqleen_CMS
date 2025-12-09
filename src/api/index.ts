import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/store';
import { useEffect } from 'react';
import {
    parseDynamicIcds,
    getAvailableIcds,
    getDynamicContainerPosition,
    getAllDynamicBlocks
} from '../utils/layoutUtils';
import type { DynamicIcdLayout, DynamicEntity, DynamicIcdsData } from '../utils/layoutUtils';
import apiClient from './apiClient';

export interface ContainerData {
    id: string;
    x: number;
    y: number;
    z: number;
    status: 'active' | 'inactive' | 'maintenance';
    blockId: string;
    lot: number;
    row: number;
    level: number;
    type?: string;
}

/**
 * Fetch all icds data
 */
export async function getAllIcds(): Promise<any> {
    const response = await apiClient.get('/dynamic_icds.json');
    return response.data;
}

/**
 * Fetch a specific icd layout
 */
export async function getLayout(icdId?: string): Promise<DynamicIcdLayout> {
    const icdsData = await getAllIcds();
    return parseDynamicIcds(icdsData, icdId);
}

/**
 * Fetch containers data and calculate positions based on layout
 */
export async function getContainers(layout: DynamicIcdLayout): Promise<ContainerData[]> {
    const response = await apiClient.get('/containers.json');
    const rawContainers = response.data;

    // Calculate positions
    const blocks = getAllDynamicBlocks(layout);
    const blockMap = new Map<string, DynamicEntity>();
    blocks.forEach(b => blockMap.set(b.id, b));

    return rawContainers.map((c: any) => {
        const block = blockMap.get(c.blockId);
        if (!block) {
            console.warn(`Block not found for container ${c.id}`);
            return { ...c, x: 0, y: 0, z: 0 };
        }

        const pos = getDynamicContainerPosition(block, c.lot, c.row, c.level);
        return {
            ...c,
            x: pos.x,
            y: pos.y,
            z: pos.z
        };
    });
}

export const useIcdsQuery = () => {
    return useQuery({
        queryKey: ['icds-list'],
        queryFn: async () => {
            const data = await getAllIcds();
            return getAvailableIcds(data);
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

export const useContainersQuery = (layout: DynamicIcdLayout | null) => {
    const setEntitiesBatch = useStore((state) => state.setEntitiesBatch);

    const query = useQuery({
        queryKey: ['containers', layout?.name || 'no-layout'],
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
