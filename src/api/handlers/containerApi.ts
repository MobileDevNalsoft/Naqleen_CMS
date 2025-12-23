import { useQuery } from '@tanstack/react-query';
import { useStore } from '../../store/store';
import { useEffect } from 'react';
import {
    getDynamicContainerPosition,
    getAllDynamicBlocks
} from '../../utils/layoutUtils';
import type { DynamicIcdLayout, DynamicEntity } from '../../utils/layoutUtils';
import apiClient from '../apiClient';
import { API_CONFIG } from '../apiConfig';

import type { ApiResponse } from '../types/commonTypes';
import type {
    ContainerPosition,
    ContainerDetailsResponse,
    SwapCandidate,
    CustomerContainerGroup,
    ContainerFromApi,
    RecommendedContainersResponse,
    GetContainersResponse
} from '../types/containerTypes';


/**
 * Fetch containers data (grouped by customer) and calculate positions based on layout
 * Implements Approach 2: Keep nested structure + Build Index Map
 */
export async function getContainers(layout: DynamicIcdLayout): Promise<GetContainersResponse> {
    // Fetch from ORDS API (now returns grouped structure)
    const response = await apiClient.get<ApiResponse<CustomerContainerGroup[]>>(API_CONFIG.ENDPOINTS.GET_CONTAINERS);
    const apiResponse = response.data;

    // Validate response structure
    if (apiResponse.response_code !== 200 || !Array.isArray(apiResponse.data)) {
        console.error('Invalid API response:', apiResponse);
        return { positions: [], customerByContainer: {} };
    }

    const customerGroups = apiResponse.data;

    // Build reverse lookup map: container_nbr -> customer_name
    const customerByContainer: Record<string, string> = {};

    // Flatten containers while preserving customer link
    const flatContainers: (ContainerFromApi & { customer_name: string })[] = [];

    customerGroups.forEach(group => {
        group.containers.forEach(container => {
            customerByContainer[container.container_nbr] = group.customer_name;
            flatContainers.push({
                ...container,
                customer_name: group.customer_name
            });
        });
    });

    // Calculate positions
    const blocks = getAllDynamicBlocks(layout);
    const blockMap = new Map<string, DynamicEntity>();
    blocks.forEach(b => blockMap.set(b.id, b));

    const positions = flatContainers.map((c) => {
        // Use block_id directly from API response
        const mappedBlockId = c.position.block_id;
        const terminal = c.position.terminal?.toUpperCase() || '';
        const blockLetter = c.position.block?.toUpperCase() || '';

        const block = blockMap.get(mappedBlockId);
        if (!block) {
            console.warn(`Block not found for container ${c.container_nbr} (${c.position.block_id})`);
            return null; // Filter out invalid
        }

        // Lot index is always 0-based from 1-based API value
        const lotIndex = Math.max(0, c.position.lot - 1);
        let rowIndex = Math.max(0, c.position.row - 1);
        const levelIndex = Math.max(0, c.position.level - 1);

        // Get number of rows from block props for reversal calculation
        const blockRows = block.props?.rows || 11;

        // Blocks B and D have reversed row labels (A at bottom, K at top)
        // So we need to reverse the row index to match the physical label positions
        const shouldReverseRowPlacement = blockLetter === 'B' || blockLetter === 'D';
        if (shouldReverseRowPlacement) {
            rowIndex = blockRows - 1 - rowIndex;
        }

        // Pass container type to ensure correct slot sizing (dynamic 20ft vs 40ft spacing)
        const pos = getDynamicContainerPosition(block, lotIndex, rowIndex, levelIndex);


        return {
            id: c.container_nbr,
            x: pos.x,
            y: pos.y,
            z: pos.z,
            status: c.status, // Use status from API ('R' or 'N'), default to 'active'
            terminal: terminal,       // Store terminal for easy access
            block: blockLetter,       // Store block letter for easy access
            blockId: mappedBlockId,   // Use mapped ID so UI finds the correct block entity (part1/part2)
            lot: c.position.lot,      // Store as 1-based (matches API/UI)
            row: rowIndex,            // Store as 0-based in app state
            level: c.position.level,  // Store as 1-based (matches API/UI)
            type: c.type,
            customerName: c.customer_name // Embedded customer link
        } as ContainerPosition;
    }).filter((c): c is ContainerPosition => c !== null);

    return { positions, customerByContainer };
}

/**
 * Fetch full container details on demand
 */
export async function getContainerDetails(containerNbr: string): Promise<ContainerDetailsResponse | null> {
    try {
        const response = await apiClient.get<ApiResponse<ContainerDetailsResponse>>(
            API_CONFIG.ENDPOINTS.GET_CONTAINER_DETAILS,
            { params: { containerNbr: containerNbr } }
        );

        if (response.data.response_code === 200 && response.data.data) {
            return response.data.data;
        }

        console.warn('Container not found:', containerNbr);
        return null;
    } catch (error) {
        console.error('Error fetching container details:', error);
        return null;
    }
}

export const getRecommendedContainers = async (
    requirements: { container_type: string; container_count: number }[]
): Promise<RecommendedContainersResponse[]> => {
    try {
        const payload = { container_types: requirements };
        const response = await apiClient.post<ApiResponse<RecommendedContainersResponse[]>>(
            API_CONFIG.ENDPOINTS.GET_RECOMMENDED_CONTAINERS,
            payload
        );

        if (response.data.response_code === 200 && Array.isArray(response.data.data)) {
            return response.data.data;
        }

        console.warn('Invalid response from recommendation API', response.data);
        return [];
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return [];
    }
};

export const getContainersToSwap = async (
    type: string,
    query: string,
    offset: number
): Promise<SwapCandidate[]> => {
    try {
        const response = await apiClient.get<ApiResponse<string[]>>(
            API_CONFIG.ENDPOINTS.GET_CONTAINERS_OF_TYPE,
            {
                params: {
                    containerType: type,
                    offset: offset,
                    searchText: query
                }
            }
        );

        if (response.data.response_code === 200 && Array.isArray(response.data.data)) {
            const entities = useStore.getState().entities;
            return response.data.data.map((nbr: string) => {
                const ent = entities[nbr];
                let positionStr = 'Yard';
                if (ent) {
                    // Format: TERMINAL-BLOCK-LOT-ROW-LEVEL
                    // Note: row is 0-indexed in store, so +1. Lot and Level are 1-indexed.
                    positionStr = `${ent.terminal}-${ent.block}-${ent.lot}-${String.fromCharCode(64 + (ent.row + 1))}-${ent.level}`;
                }
                return {
                    container_nbr: nbr,
                    container_type: type,
                    position: positionStr
                };
            });
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
    const setCustomerByContainer = useStore((state) => state.setCustomerByContainer);

    const query = useQuery({
        queryKey: ['containers', layout?.name || 'no-layout'],
        queryFn: async () => {
            if (!layout) return { positions: [], customerByContainer: {} };
            return getContainers(layout);
        },
        enabled: !!layout,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (query.data && query.data.positions.length > 0) {
            const currentIds = useStore.getState().ids;
            if (currentIds.length === 0) {
                setEntitiesBatch(query.data.positions);
                setCustomerByContainer(query.data.customerByContainer);
            }
        }
    }, [query.data, setEntitiesBatch, setCustomerByContainer]);

    // Return positions for backwards compatibility with existing consumers
    return {
        ...query,
        data: query.data?.positions || []
    };
};

export const useRecommendedContainersQuery = (bookingId: string | null, requirements: { container_type: string, container_count: number }[] | null) => {
    return useQuery({
        queryKey: ['recommendedContainers', bookingId, requirements],
        queryFn: () => getRecommendedContainers(requirements!),
        enabled: !!bookingId && !!requirements,
        staleTime: 1000 * 60 * 5,
    });
};

export const useSwapContainersQuery = (type: string | null, query: string, offset: number, fetchAll: boolean = false) => {
    return useQuery({
        queryKey: ['swapContainers', type, query, offset, fetchAll],
        queryFn: () => getContainersToSwap(type!, query, offset),
        enabled: !!type && (fetchAll || query.length >= 3),
        staleTime: 1000 * 60,
    });
};
