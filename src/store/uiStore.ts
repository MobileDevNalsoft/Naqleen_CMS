import { create } from 'zustand';

export type ActivePanel =
    | null
    | 'position'
    | 'restack'
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
    panelData: any;
    openPanel: (panel: ActivePanel, data?: any) => void;
    closePanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    activePanel: null,
    panelData: null,
    openPanel: (panel, data = null) => set({ activePanel: panel, panelData: data }),
    closePanel: () => set({ activePanel: null, panelData: null }),
}));
