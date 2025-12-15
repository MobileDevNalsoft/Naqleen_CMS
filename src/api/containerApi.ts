import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/store';
import { useEffect } from 'react';
import {
    getDynamicContainerPosition,
    getAllDynamicBlocks
} from '../utils/layoutUtils';
import type { DynamicIcdLayout, DynamicEntity } from '../utils/layoutUtils';
import apiClient from './apiClient';
import { API_CONFIG } from './apiConfig';

import type {
    ContainerPosition,
    ContainerDetails,
    RecommendedContainerResponse,
    SwapCandidate,
    ApiResponse
} from './types';

/**
 * Fetch containers data and calculate positions based on layout
 */
export async function getContainers(layout: DynamicIcdLayout): Promise<ContainerPosition[]> {
    // Fetch from ORDS API
    const response = await apiClient.get<ApiResponse<any[]>>(API_CONFIG.ENDPOINTS.GET_CONTAINERS);
    const apiResponse = response.data;

    // Validate response structure
    if (apiResponse.response_code !== 200 || !Array.isArray(apiResponse.data)) {
        console.error('Invalid API response:', apiResponse);
        return [];
    }

    const rawContainers = apiResponse.data;

    // Calculate positions
    const blocks = getAllDynamicBlocks(layout);
    const blockMap = new Map<string, DynamicEntity>();
    blocks.forEach(b => blockMap.set(b.id, b));

    return rawContainers.map((c: any) => {
        let mappedBlockId = c.position.block_id;

        // Handle split block 'trs_block_d'
        if (mappedBlockId === 'trs_block_d') {
            // Lot 1 is part 1, Lots 2+ are part 2
            if (c.position.lot === 1) {
                mappedBlockId = 'trs_block_d_part1';
            } else {
                mappedBlockId = 'trs_block_d_part2';
            }
        }

        const block = blockMap.get(mappedBlockId);
        if (!block) {
            console.warn(`Block not found for container ${c.container_nbr} (${c.position.block_id} -> ${mappedBlockId})`);
            return null; // Filter out invalid
        }

        // Localize lot index based on block part
        let localLotIndex = c.position.lot - 1; // Default 0-based index
        if (mappedBlockId === 'trs_block_d_part2') {
            // Part 2 starts at Lot 2, so Lot 2 should be index 0
            localLotIndex = c.position.lot - 2;
        }

        const lotIndex = Math.max(0, localLotIndex);
        const rowIndex = Math.max(0, c.position.row - 1);
        const levelIndex = Math.max(0, c.position.level - 1);

        // Pass container type to ensure correct slot sizing (dynamic 20ft vs 40ft spacing)
        const pos = getDynamicContainerPosition(block, lotIndex, rowIndex, levelIndex);

        // Force type for known 40ft blocks if needed, otherwise use DB or default
        let finalType = (c.container_type || '20ft').toLowerCase();
        if (mappedBlockId.includes('trs_block_d')) {
            finalType = '40ft';
        }

        return {
            id: c.container_nbr,
            x: pos.x,
            y: pos.y,
            z: pos.z,
            status: 'active',
            blockId: mappedBlockId, // Use mapped ID so UI finds the correct block entity (part1/part2)
            lot: c.position.lot - 1, // Keep global lot index for display
            row: rowIndex, // Store as 0-based in app state
            level: levelIndex, // Store as 0-based in app state
            type: finalType
        } as ContainerPosition;
    }).filter((c): c is ContainerPosition => c !== null);
}

/**
 * Fetch full container details on demand
 */
export async function getContainerDetails(containerNbr: string): Promise<ContainerDetails | null> {
    try {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.GET_CONTAINER_DETAILS, {
            params: { containerNbr: containerNbr }
        });

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data as ContainerDetails;
        }

        console.warn('Container not found:', containerNbr);
        return null;
    } catch (error) {
        console.error('Error fetching container details:', error);
        return null;
    }
}

export const getRecommendedContainers = async (requirements: { container_type: string, container_count: number }[]): Promise<RecommendedContainerResponse[]> => {
    try {
        const url = API_CONFIG.ENDPOINTS.GET_RECOMMENDED_CONTAINERS;

        // User requested payload structure: { "container_types": [...] } directly as body
        const payload = {
            container_types: requirements
        };

        const response = await apiClient.post(url, payload);

        if (response.data.response_code === 200 && Array.isArray(response.data.data)) {
            return response.data.data.map((item: any) => ({
                container_type: item.container_type,
                recommended_containers: item.recommended_containers
            }));
        }

        console.warn('Invalid response from recommendation API', response.data);
        return [];

    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return [];
    }
};

export const getContainersToSwap = async (type: string, query: string, offset: number): Promise<SwapCandidate[]> => {
    try {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.GET_CONTAINERS_OF_TYPE, {
            params: {
                containerType: type,
                offset: offset,
                searchText: query
            }
        });

        if (response.data.response_code === 200 && Array.isArray(response.data.data)) {
            // The API returns a simple array of container numbers: ["CONT1", "CONT2"]
            // We map this to SwapCandidate objects. 
            // Note: The SQL output does not currently provide position, so we default to 'N/A'
            return response.data.data.map((nbr: string) => ({
                container_nbr: nbr,
                container_type: type
            }));
        }

        return [];
    } catch (error) {
        console.error('Error fetching swap candidates:', error);
        return [];
    }
};

// --- Hooks ---

export const useContainersQuery = (layout: DynamicIcdLayout | null) => {
    const setEntitiesBatch = useStore((state) => state.setEntitiesBatch);

    const query = useQuery({
        queryKey: ['containers', layout?.name || 'no-layout'],
        queryFn: async () => {
            if (!layout) return [];
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

export const useRecommendedContainersQuery = (bookingId: string | null, requirements: { container_type: string, container_count: number }[] | null) => {
    return useQuery({
        queryKey: ['recommendedContainers', bookingId],
        queryFn: () => getRecommendedContainers(requirements!),
        enabled: !!bookingId && !!requirements,
        staleTime: 1000 * 60 * 5,
    });
};

export const useSwapContainersQuery = (type: string | null, query: string, offset: number) => {
    return useQuery({
        queryKey: ['swapContainers', type, query, offset],
        queryFn: () => getContainersToSwap(type!, query, offset),
        enabled: !!type && query.length >= 3,
        staleTime: 1000 * 60,
    });
};
