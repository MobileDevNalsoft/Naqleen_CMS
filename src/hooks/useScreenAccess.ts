// Custom hook for screen-based access control
import { useAuthStore } from '../features/auth/store/authStore';
import type { UserScreen } from '../features/auth/types/authTypes';

// Define a stable empty array constant outside the hook to prevent infinite loops
const EMPTY_SCREENS: UserScreen[] = [];

/**
 * useScreenAccess Hook
 * Provides utilities for checking user's screen-level permissions
 */
export function useScreenAccess() {
    // Use the stable constant instead of a new array literal
    const screens = useAuthStore(state => state.user?.screens || EMPTY_SCREENS);

    /**
     * Check if user has access to a specific path
     */
    const hasPath = (path: string): boolean => {
        return screens.some((s: UserScreen) => s.screen_path === path && s.is_active);
    };

    /**
     * Check if user has access to ANY of the provided paths
     */
    const hasAnyPath = (...paths: string[]): boolean => {
        return paths.some(p => hasPath(p));
    };

    /**
     * Check if user has access to ALL of the provided paths
     */
    const hasAllPaths = (...paths: string[]): boolean => {
        return paths.every(p => hasPath(p));
    };

    // Common access checks
    const has3DView = hasPath('/3d-view');
    const hasDashboard = hasPath('/dashboards');
    const hasAccessControl = hasPath('/access-control');
    const hasManageRole = hasPath('/manage-role');

    // Derived states for UI
    const hasBothViews = has3DView && hasDashboard;
    const hasOnlyDashboard = hasDashboard && !has3DView;
    const hasOnly3DView = has3DView && !hasDashboard;

    return {
        screens,
        hasPath,
        hasAnyPath,
        hasAllPaths,
        // Common checks
        has3DView,
        hasDashboard,
        hasAccessControl,
        hasManageRole,
        // Derived
        hasBothViews,
        hasOnlyDashboard,
        hasOnly3DView,
    };
}
