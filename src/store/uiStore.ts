import { create } from 'zustand';

export type ActivePanel =
    | null
    | 'position'
    | 'gateIn'
    | 'gateOut'
    | 'stuffing'
    | 'destuffing'
    | 'plugInOut'
    | 'cfsTask'
    | 'reserveContainers'
    | 'customerInventory'
    | 'releaseContainer';

interface UIState {
    activePanel: ActivePanel;
    openPanel: (panel: ActivePanel) => void;
    closePanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    activePanel: null,
    openPanel: (panel) => set({ activePanel: panel }),
    closePanel: () => set({ activePanel: null }),
}));
