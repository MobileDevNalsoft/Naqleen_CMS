// Core exports
export * from './types/index';
export { default as apiClient, webApiClient, mobileApiClient } from './apiClient';
export { API_CONFIG } from './apiConfig';

// Domain exports
export * from './handlers/layoutApi';
export * from './handlers/containerApi';
export * from './handlers/bookingApi';
export * from './handlers/inventoryApi';
export * from './handlers/yardApi';
export * from './handlers/gateApi';

