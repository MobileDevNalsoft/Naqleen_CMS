import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/store';
import { useEffect } from 'react';
import { parseDynamicIcds, getAvailableIcds } from '../utils/layoutUtils';
import apiClient from './apiClient';
import { API_CONFIG } from './apiConfig';
import type { DynamicIcdLayout } from '../utils/layoutUtils';

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

// --- Hooks ---

const QUERY_KEY = ['icds-data'];

// Shared fetcher (internal use mostly, but exported if needed)
export const fetchIcdsData = async () => {
    return getAllIcds();
};

export const useIcdsQuery = () => {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchIcdsData,
        staleTime: Infinity,
        select: (data) => getAvailableIcds(data)
    });
};

export const useLayoutQuery = (icdId: string = 'naqleen-jeddah') => {
    const setLayout = useStore((state) => state.setLayout);

    const query = useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchIcdsData,
        staleTime: Infinity,
        select: (data) => parseDynamicIcds(data, icdId)
    });

    useEffect(() => {
        if (query.data) {
            setLayout(query.data);
        }
    }, [query.data, setLayout]);

    return query;
};
