import { create } from 'zustand';

export type ActivePanel =
    | null
    | 'position'
    | 'cfsPosition'
    | 'restack'
    | 'gateIn'
    | 'gateOut'
    | 'stuffing'
    | 'destuffing'
    | 'plugInOut'
    | 'cfsTask'
    | 'reserveContainers'
    | 'customerInventory'
    | 'releaseContainer'
    | 'accessControl'
    | 'settings';

interface UIState {
    // Panel State
    activePanel: ActivePanel;
    panelData: any;
    openPanel: (panel: ActivePanel, data?: any) => void;
    closePanel: () => void;

    // View Navigation Panel State
    isViewPanelOpen: boolean;
    toggleViewPanel: () => void;
    setViewPanelOpen: (open: boolean) => void;

    // Search Focus State (disables keyboard navigation)
    // Search Focus State (disables keyboard navigation)
    isSearchFocused: boolean;
    setSearchFocused: (focused: boolean) => void;

    // Settings State
    settingsTab: 'profile' | 'accessControl';
    setSettingsTab: (tab: 'profile' | 'accessControl') => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Panel State
    activePanel: null,
    panelData: null,
    openPanel: (panel, data = null) => set({ activePanel: panel, panelData: data }),
    closePanel: () => set({ activePanel: null, panelData: null }),

    // View Navigation Panel State
    isViewPanelOpen: false,
    toggleViewPanel: () => set((state) => ({ isViewPanelOpen: !state.isViewPanelOpen })),
    setViewPanelOpen: (open) => set({ isViewPanelOpen: open }),

    // Search Focus State
    isSearchFocused: false,
    setSearchFocused: (focused) => set({ isSearchFocused: focused }),

    // Settings State
    settingsTab: 'profile',
    setSettingsTab: (tab) => set({ settingsTab: tab }),
}));
