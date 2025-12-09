import { create } from 'zustand';
import type { IcdLayout } from '../utils/layoutUtils';

export interface ContainerEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  status?: string;
  blockId?: string;
  lot?: number;
  row?: number;
  level?: number;
  [key: string]: any;
}

interface StoreState {
  entities: Record<string, ContainerEntity>;
  ids: string[];
  selectId: string | null;
  selectedBlock: string | null;
  layout: IcdLayout | null;
  setEntitiesBatch: (updates: Partial<ContainerEntity> & { id: string }[]) => void;
  patchPositions: (posUpdates: { id: string; x: number; y: number; z: number }[]) => void;
  setSelectId: (id: string | null) => void;
  setSelectedBlock: (blockId: string | null) => void;
  setLayout: (layout: IcdLayout) => void;
}

export const useStore = create<StoreState>((set) => ({
  entities: {},
  ids: [],
  selectId: null,
  selectedBlock: null,
  layout: null,

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
  setLayout: (layout) => set({ layout }),
}));
