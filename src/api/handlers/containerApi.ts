import { useQuery } from '@tanstack/react-query';
import { useStore } from '../../store/store';
import { useEffect } from 'react';
import type { DynamicIcdLayout } from '../../utils/layoutUtils';
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
    GetContainersResponse,
    CfsContainer
} from '../types/containerTypes';

// Container height constant - standardized for visual consistency
// Using 2.591m for all containers to match the visual geometry in Containers.tsx
const CONTAINER_HEIGHT = 2.591;
const LEVEL_GAP = 0.02;

/**
 * Calculate Y position based on level
 * Uses consistent height to prevent floating containers at higher levels
 */
function calculateYPosition(baseY: number, level: number, _containerType?: string): number {
    // Level 1 = ground level (baseY), Level 2 = one container up, etc.
    return baseY + CONTAINER_HEIGHT / 2 + (level - 1) * (CONTAINER_HEIGHT + LEVEL_GAP);
}

/**
 * Fetch containers data (grouped by customer) and calculate positions
 * Uses marking positions for O(1) position lookup
 */
export async function getContainers(): Promise<GetContainersResponse> {
    // Fetch from ORDS API (returns grouped structure)
    const response = await apiClient.get<ApiResponse<CustomerContainerGroup[]>>(API_CONFIG.ENDPOINTS.GET_CONTAINERS);
    const apiResponse = response.data;

    // Validate response structure
    if (apiResponse.response_code !== 200 || !Array.isArray(apiResponse.data)) {
        console.error('Invalid API response:', apiResponse);
        return { positions: [], cfsContainers: [], customerByContainer: {} };
    }

    const customerGroups = apiResponse.data;

    // Build reverse lookup map: container_nbr -> customer_name
    const customerByContainer: Record<string, string> = {};
    const cfsContainers: CfsContainer[] = [];
    const yardContainers: { container: ContainerFromApi & { customer_name: string }; position: string }[] = [];

    customerGroups.forEach(group => {
        group.containers.forEach(container => {
            customerByContainer[container.container_nbr] = group.customer_name;

            if (container.position === 'CFS') {
                cfsContainers.push({
                    id: container.container_nbr,
                    type: container.type || '20GP',
                    status: container.status || 'Active',
                    area: 'CFS',
                    customerName: group.customer_name
                });
            } else {
                yardContainers.push({
                    container: { ...container, customer_name: group.customer_name },
                    position: container.position
                });
            }
        });
    });

    // Get marking positions from store for O(1) lookup
    const markingPositions = useStore.getState().markingPositions;

    // Build container positions using marking positions
    const positions = yardContainers.map(({ container, position }) => {
        // Position format: "TRS-A-2-D-1" = markingKey + level
        // Extract level (last segment) and marking key (everything before last dash)
        const lastDashIndex = position.lastIndexOf('-');
        if (lastDashIndex === -1) {
            console.warn(`Invalid position format: ${position}`);
            return null;
        }

        const markingKey = position.substring(0, lastDashIndex).toUpperCase(); // "TRS-A-2-D"
        const level = parseInt(position.substring(lastDashIndex + 1), 10) || 1;

        const markingPos = markingPositions[markingKey];
        if (!markingPos) {
            console.warn(`Marking position not found for container ${container.container_nbr} (${markingKey})`);
            return null;
        }

        // Calculate Y position based on level and container type
        const y = calculateYPosition(markingPos.y, level, container.type);

        // Derive blockId and other values from markingKey: "TRS-A-2-D" -> terminal=TRS, block=A
        const keyParts = markingKey.split('-');
        const terminal = keyParts[0] || '';
        const block = keyParts[1] || '';
        const lot = parseInt(keyParts[2], 10) || 1;
        const row = keyParts[3] || 'A';
        const blockId = `${terminal.toLowerCase()}_block_${block.toLowerCase()}`;

        return {
            id: container.container_nbr,
            x: markingPos.x,
            y,
            z: markingPos.z,
            status: container.status || 'N',
            terminal,
            block,
            blockId,
            lot,
            row: row.charCodeAt(0) - 'A'.charCodeAt(0), // Store as 0-based index
            level,
            type: container.type,
            customerName: container.customer_name
        } as ContainerPosition;
    }).filter((c): c is ContainerPosition => c !== null);

    return { positions, cfsContainers, customerByContainer };
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

    // Query depends on layout being loaded and marking positions being populated
    const markingPositions = useStore((state) => state.markingPositions);
    const hasMarkingPositions = Object.keys(markingPositions).length > 0;

    const query = useQuery({
        queryKey: ['containers', layout?.name || 'no-layout', hasMarkingPositions],
        queryFn: async () => {
            if (!layout || !hasMarkingPositions) return { positions: [], cfsContainers: [], customerByContainer: {} };
            return getContainers();
        },
        enabled: !!layout && hasMarkingPositions,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    const setCfsContainers = useStore((state) => state.setCfsContainers);

    useEffect(() => {
        if (query.data && (query.data.positions.length > 0 || query.data.cfsContainers?.length > 0)) {
            const currentIds = useStore.getState().ids;
            if (currentIds.length === 0) {
                setEntitiesBatch(query.data.positions);
                setCustomerByContainer(query.data.customerByContainer);
                setCfsContainers(query.data.cfsContainers || []);
            }
        }
    }, [query.data, setEntitiesBatch, setCfsContainers, setCustomerByContainer]);

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
