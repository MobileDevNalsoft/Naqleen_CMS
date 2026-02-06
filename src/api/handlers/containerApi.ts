import { useQuery } from '@tanstack/react-query';
import { useStore } from '../../store/store';
import { useUIStore } from '../../store/uiStore';
import { useEffect, useRef } from 'react';
import type { DynamicIcdLayout } from '../../utils/layoutUtils';
import apiClient from '../apiClient';
import { API_CONFIG } from '../apiConfig';

import type { ApiResponse } from '../types/commonTypes';
import type {
    ContainerPosition,
    ContainerDetailsResponse,
    CustomerContainerGroup,
    ContainerFromApi,
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


// CACHE (Module Level)
let lastRawDataHash = '';
let lastProcessedResult: GetContainersResponse | null = null;

/**
 * Fetch containers data (grouped by customer) and calculate positions
 * Uses marking positions for O(1) position lookup
 * [OPTIMIZED] Caches result if raw API response is identical to avoid re-renders
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

    // 1. FAST CHECK: Compare Raw Data Hash (Stringify is fast enough for ~1MB JSON < 5ms)
    // This prevents the expensive mapping loop AND returns the SAME object reference
    // so React Query's structural equality check passes instantly.
    const currentHash = JSON.stringify(apiResponse.data);

    // Count total containers for accurate logging
    const totalContainers = apiResponse.data.reduce((acc, group) => acc + (group.containers?.length || 0), 0);
    console.log(`[getContainers] Fetched ${apiResponse.data.length} groups containing ${totalContainers} total containers.`);

    if (currentHash === lastRawDataHash && lastProcessedResult) {
        console.log('[getContainers] Data identical (Hash Match), returning cached result');
        return lastProcessedResult;
    }

    console.log('[getContainers] New data detected! Processing...');

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
            // console.warn(`Invalid position format: ${position}`);
            return null;
        }

        const markingKey = position.substring(0, lastDashIndex).toUpperCase(); // "TRS-A-2-D"
        const level = parseInt(position.substring(lastDashIndex + 1), 10) || 1;

        const markingPos = markingPositions[markingKey];
        if (!markingPos) {
            // console.warn(`Marking position not found for container ${container.container_nbr} (${markingKey})`);
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
            row,  // Store row label directly (e.g., 'A', 'D', 'K') - no index conversion
            level,
            type: container.type,
            customerName: container.customer_name
        } as ContainerPosition;
    }).filter((c): c is ContainerPosition => c !== null);

    const result = { positions, cfsContainers, customerByContainer };

    // Update Cache
    lastRawDataHash = currentHash;
    lastProcessedResult = result;

    return result;
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

// --- Hooks ---

export const useContainersQuery = (layout: DynamicIcdLayout | null) => {
    // Store actions
    const removeEntitiesBatch = useStore((state) => state.removeEntitiesBatch);
    const setEntitiesBatch = useStore((state) => state.setEntitiesBatch);
    const setCustomerByContainer = useStore((state) => state.setCustomerByContainer);
    const setCfsContainers = useStore((state) => state.setCfsContainers);

    // UI Store actions
    const setSyncing = useUIStore((state) => state.setSyncing);
    const addNotification = useUIStore((state) => state.addNotification);
    const is3dInteracting = useUIStore((state) => state.is3dInteracting);

    // [NEW] Track initial load
    const isFirstLoad = useRef(true);

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
        staleTime: 5000,
        refetchInterval: 5000, // [CHANGED] 5 Second Polling
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: false,
        notifyOnChangeProps: ['data', 'isLoading', 'isError', 'error'] // [CRITICAL] Only re-render on DATA change, ignore isFetching/background updates
    });

    // Sync Logic
    useEffect(() => {
        if (query.data && (query.data.positions.length > 0 || query.data.cfsContainers?.length > 0)) {

            // GATE CHECK: If interacting, DO NOT PROCESS UPDATES
            if (is3dInteracting) {
                return;
            }

            // Sync Process
            const currentIds = useStore.getState().ids;

            // [NEW] Initial Load Handling: Populate store silently
            if (isFirstLoad.current) {
                if (currentIds.length === 0) {
                    console.log('[Sync] Initial Load - Populating store silently.');
                    setEntitiesBatch(query.data.positions);
                    setCfsContainers(query.data.cfsContainers || []);
                    setCustomerByContainer(query.data.customerByContainer);
                    isFirstLoad.current = false;
                    return;
                }
                isFirstLoad.current = false;
            }

            const newIdsSet = new Set(query.data.positions.map(p => p.id));

            // 1. Identify Diff
            // Actually, we need to know WHICH ones are added to notify specifically
            const currentIdSet = new Set(currentIds);

            const added = query.data.positions.filter(p => !currentIdSet.has(p.id));
            const removed = currentIds.filter(id => !newIdsSet.has(id));

            // If nothing changed, do nothing.
            if (added.length === 0 && removed.length === 0) {
                return;
            }

            // 2. Lock UI
            setSyncing(true);

            // 3. Process Update (setTimeout to allow UI to render lock screen)
            setTimeout(() => {
                // Batch Remove
                if (removed.length > 0) {
                    const currentEntities = useStore.getState().entities;

                    // Notify deletions BEFORE removing them from store
                    removed.forEach(id => {
                        const entity = currentEntities[id];
                        // Format: TRM-BLOCK-LOT-ROW-LEVEL e.g., TRS-A-2-D-1
                        const positionStr = entity
                            ? `${entity.terminal}-${entity.block}-${entity.lot}-${entity.row}-${entity.level}`.toUpperCase()
                            : 'UNKNOWN LOCATION';

                        addNotification({
                            type: 'DELETE',
                            message: `${id} removed from ${positionStr}`
                        });
                    });

                    removeEntitiesBatch(removed);
                }

                // Batch Add/Update
                // We always run setEntities to ensure positions update even if IDs didn't change (e.g. moved)
                // But for notifications, we focus on *added*
                setEntitiesBatch(query.data.positions);

                if (added.length > 0) {
                    added.forEach(c => {
                        // Format: TRM-BLOCK-LOT-ROW-LEVEL e.g., TRS-A-2-D-1
                        const positionStr = `${c.terminal}-${c.block}-${c.lot}-${c.row}-${c.level}`.toUpperCase();

                        addNotification({
                            type: 'ADD',
                            message: `Container ${c.id} added at ${positionStr}`
                        });
                    });
                }

                // Update CFS
                setCustomerByContainer(query.data.customerByContainer);
                setCfsContainers(query.data.cfsContainers || []);

                // 4. Unlock UI
                // Add slight buffer for visual smoothness
                setTimeout(() => {
                    setSyncing(false);
                }, 500);

            }, 100);

        }
    }, [query.data, is3dInteracting, setEntitiesBatch, setCfsContainers, setCustomerByContainer, removeEntitiesBatch, setSyncing, addNotification]);

    return {
        data: query.data?.positions || [],
        cfsContainers: query.data?.cfsContainers || [],
        customerByContainer: query.data?.customerByContainer || {},
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    };
};