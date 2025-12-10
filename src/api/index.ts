import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/store';
import { useEffect } from 'react';
import {
    parseDynamicIcds,
    getAvailableIcds,
    getDynamicContainerPosition,
    getAllDynamicBlocks
} from '../utils/layoutUtils';
import type { DynamicIcdLayout, DynamicEntity } from '../utils/layoutUtils';
import apiClient from './apiClient';
import { API_CONFIG } from './apiConfig';

// Lightweight object for 3D positioning
export interface ContainerPosition {
    id: string;
    x: number;
    y: number;
    z: number;
    blockId: string;
    lot: number;
    row: number;
    level: number;
    type?: string;
}

// Detailed object for UI panel
export interface ContainerDetails {
    id: string;
    cust_name: string;
    cust_nbr: string;
    inbound_shipment_nbr?: string;
    outbound_shipment_nbr?: string;
    contents?: string;
    weight?: string;
    origin?: string;
    destination?: string;
}

/**
 * Fetch all icds data
 */
export async function getAllIcds(): Promise<any> {
    // Override baseURL to fetch from local public folder, ignoring the remote API configuration
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.GET_ICDS, {
        baseURL: '/',
        auth: undefined // Do not send credentials to local server
    });
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
export async function getContainers(layout: DynamicIcdLayout): Promise<ContainerPosition[]> {
    // Fetch from ORDS API
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.GET_CONTAINERS);
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
        };
    }).filter((c: any) => c !== null) as ContainerPosition[];
}

/**
 * Fetch full container details on demand
 */
export async function getContainerDetails(id: string): Promise<ContainerDetails> {
    // START: MOCK IMPLEMENTATION
    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 600));

    // Random demo data since we don't have a real endpoint yet
    // In production, this would be: await apiClient.get(`/containers/${id}/details`);
    return {
        id: id,
        cust_name: ['Samsung Electronics', 'IKEA', 'Huawei Technologies', 'Nestle', 'Toyota', 'Zara', 'Amazon'].sort(() => 0.5 - Math.random())[0],
        cust_nbr: ['CUST-' + Math.floor(Math.random() * 10000), 'KEY-ACC-' + Math.floor(Math.random() * 500)].sort(() => 0.5 - Math.random())[0],
        inbound_shipment_nbr: 'SHP-IN-' + Math.floor(Math.random() * 999999),
        outbound_shipment_nbr: 'SHP-OUT-' + Math.floor(Math.random() * 999999),
        contents: ['Electronics Components', 'Furniture Parts', 'Auto Parts', 'Textiles', 'Consumer Goods'].sort(() => 0.5 - Math.random())[0],
        weight: (Math.floor(Math.random() * 20000) + 5000) + ' kg',
        origin: ['Singapore', 'Shanghai', 'Rotterdam', 'Busan', 'Jebel Ali'].sort(() => 0.5 - Math.random())[0],
        destination: 'Riyadh Dry Port'
    };
    // END: MOCK IMPLEMENTATION
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
