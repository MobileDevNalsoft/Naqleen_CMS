import { create } from 'zustand';
import type { DynamicIcdLayout } from '../utils/layoutUtils';
import type { ContainerPosition } from '../api';

export type ContainerEntity = ContainerPosition;

export interface SwapConnection {
  from: string;  // Original container ID
  to: string;    // Replacement container ID
}

export interface RestackLine {
  fromId: string;
  toPosition: { x: number; y: number; z: number };
}

export interface FocusPosition {
  positionString: string;  // e.g., "TRM-A-01-5-1"
  x: number;
  y: number;
  z: number;
  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;
}

export interface GhostContainer {
  x: number;
  y: number;
  z: number;
  containerType: string;  // '20ft' or '40ft'
  blockId: string;        // For determining rotation
}

interface StoreState {
  entities: Record<string, ContainerEntity>;
  ids: string[];
  selectId: string | null;
  selectedBlock: string | null;
  selectedCustomer: string | null;
  hoverId: string | null;
  hoverSource: string | null;
  layout: DynamicIcdLayout | null;
  reserveContainers: { container_nbr: string }[];
  swapConnections: SwapConnection[];
  restackLine: RestackLine | null; // New state for restack visualization
  customerByContainer: Record<string, string>; // Reverse lookup: container_nbr -> customer_name
  setEntitiesBatch: (updates: (Partial<ContainerEntity> & { id: string })[]) => void;
  patchPositions: (posUpdates: { id: string; x: number; y: number; z: number }[]) => void;
  setSelectId: (id: string | null) => void;
  setSelectedBlock: (blockId: string | null) => void;
  setSelectedCustomer: (customerName: string | null) => void;
  setHoverId: (id: string | null, source?: string) => void;
  setLayout: (layout: DynamicIcdLayout) => void;
  setReserveContainers: (containers: { container_nbr: string }[]) => void;
  setSwapConnections: (connections: SwapConnection[]) => void;
  setRestackLine: (line: RestackLine | null) => void; // New action
  setCustomerByContainer: (map: Record<string, string>) => void;
  updateEntityStatus: (updates: { id: string; status: string }[]) => void;
  focusPosition: FocusPosition | null;
  setFocusPosition: (position: FocusPosition | null) => void;
  ghostContainer: GhostContainer | null;
  setGhostContainer: (container: GhostContainer | null) => void;
}



export const useStore = create<StoreState>((set) => ({
  entities: {},
  ids: [],
  selectId: null,
  selectedBlock: null,
  selectedCustomer: null,
  hoverId: null,
  hoverSource: null,
  layout: null,
  reserveContainers: [],
  swapConnections: [],
  restackLine: null,
  customerByContainer: {},
  focusPosition: null,
  ghostContainer: null,

  setEntitiesBatch: (updates) => set((state) => {
    const entities = { ...state.entities };
    const ids = new Set(state.ids);
    updates.forEach((u) => {
      entities[u.id] = { ...(entities[u.id] || { id: u.id, x: 0, y: 0, z: 0 }), ...u };
      ids.add(u.id);
    });
    return { entities, ids: Array.from(ids) };
  }),

  patchPositions: (posUpdates) => set((state) => {
    const entities = { ...state.entities };
    let changed = false;
    posUpdates.forEach((p) => {
      if (entities[p.id]) {
        entities[p.id] = { ...entities[p.id], x: p.x, y: p.y, z: p.z };
        changed = true;
      }
    });
    return changed ? { entities } : {};
  }),

  setSelectId: (id) => set({ selectId: id }),
  setSelectedBlock: (blockId) => set({ selectedBlock: blockId }),
  setSelectedCustomer: (customerName) => set({ selectedCustomer: customerName }),
  setHoverId: (id, source) => set({ hoverId: id, hoverSource: source || null }),
  setLayout: (layout) => set({ layout }),
  setReserveContainers: (containers) => set({ reserveContainers: containers }),
  setSwapConnections: (connections) => set({ swapConnections: connections }),
  setRestackLine: (line) => set({ restackLine: line }),
  setCustomerByContainer: (map) => set({ customerByContainer: map }),
  updateEntityStatus: (updates) => set((state) => {
    const entities = { ...state.entities };
    let changed = false;
    updates.forEach(({ id, status }) => {
      if (entities[id]) {
        entities[id] = { ...entities[id], status };
        changed = true;
      }
    });
    return changed ? { entities } : {};
  }),
  setFocusPosition: (position) => set({ focusPosition: position }),
  setGhostContainer: (container) => set({ ghostContainer: container }),
}));

