import { create } from 'zustand';
import type { DynamicIcdLayout } from '../components/scene/infrastructure/utils/layoutUtils';
import type { ContainerPosition, CfsContainer } from '../features/yard-planning/types/containerTypes';

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

// Marking positions stored by unique ID: "Terminal-Block-Lot-Row"
export interface MarkingPosition {
  x: number;
  y: number;
  z: number;
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
  releaseContainers: { container_nbr: string }[]; // Containers selected for release
  swapConnections: SwapConnection[];
  restackLine: RestackLine | null; // New state for restack visualization
  cfsContainers: CfsContainer[]; // Containers in CFS area (no 3D position)
  customerByContainer: Record<string, string>; // Reverse lookup: container_nbr -> customer_name
  setEntitiesBatch: (updates: (Partial<ContainerEntity> & { id: string })[]) => void;
  removeEntitiesBatch: (ids: string[]) => void; // [NEW]
  setCfsContainers: (containers: CfsContainer[]) => void;
  removeCfsContainer: (containerId: string) => void;
  patchPositions: (posUpdates: { id: string; x: number; y: number; z: number }[]) => void;
  setSelectId: (id: string | null) => void;
  setSelectedBlock: (blockId: string | null) => void;
  setSelectedCustomer: (customerName: string | null) => void;
  setHoverId: (id: string | null, source?: string) => void;
  setLayout: (layout: DynamicIcdLayout) => void;
  setReserveContainers: (containers: { container_nbr: string }[]) => void;
  setReleaseContainers: (containers: { container_nbr: string }[]) => void;
  setSwapConnections: (connections: SwapConnection[]) => void;
  setRestackLine: (line: RestackLine | null) => void; // New action
  setCustomerByContainer: (map: Record<string, string>) => void;
  updateEntityStatus: (updates: { id: string; status: string }[]) => void;
  focusPosition: FocusPosition | null;
  setFocusPosition: (position: FocusPosition | null) => void;
  ghostContainer: GhostContainer | null;
  setGhostContainer: (container: GhostContainer | null) => void;
  hoveredMarker: string | null;
  setHoveredMarker: (markerId: string | null) => void;
  // Marking positions for O(1) container placement lookup
  markingPositions: Record<string, MarkingPosition>;
  setMarkingPositions: (positions: Record<string, MarkingPosition>) => void;
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
  releaseContainers: [],
  swapConnections: [],
  restackLine: null,
  cfsContainers: [],
  customerByContainer: {},
  focusPosition: null,
  ghostContainer: null,
  hoveredMarker: null,
  markingPositions: {},

  setEntitiesBatch: (updates) => set((state) => {
    const entities = { ...state.entities };
    const ids = new Set(state.ids);
    updates.forEach((u) => {
      entities[u.id] = { ...(entities[u.id] || { id: u.id, x: 0, y: 0, z: 0 }), ...u };
      ids.add(u.id);
    });
    return { entities, ids: Array.from(ids) };
  }),

  // [NEW] Remove Specific Entities (For differential updates)
  removeEntitiesBatch: (removeIds: string[]) => set((state) => {
    const entities = { ...state.entities };
    const ids = new Set(state.ids);

    removeIds.forEach((id) => {
      delete entities[id];
      ids.delete(id);
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
  setReleaseContainers: (containers) => set({ releaseContainers: containers }),
  setSwapConnections: (connections) => set({ swapConnections: connections }),
  setRestackLine: (line) => set({ restackLine: line }),
  setCustomerByContainer: (map) => set({ customerByContainer: map }),
  setCfsContainers: (containers) => set({ cfsContainers: containers }),
  removeCfsContainer: (containerId) => set((state) => ({
    cfsContainers: state.cfsContainers.filter(c => c.id !== containerId)
  })),
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
  setHoveredMarker: (markerId) => set({ hoveredMarker: markerId }),
  setMarkingPositions: (positions) => set({ markingPositions: positions }),
}));

