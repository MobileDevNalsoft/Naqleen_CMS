import { useEffect } from 'react';

/**
 * Hook to synchronize authentication state across browser tabs.
 * Listens for the 'storage' event which fires when localStorage is modified by another tab.
 */
export const useAuthSync = () => {
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            // Zustand persist middleware uses the name provided in the config as the key
            if (event.key === 'auth-storage') {
                console.log('[AuthSync] Auth storage changed in another tab. Synchronizing...');

                // If the value is null, it means the storage was cleared (logout)
                if (!event.newValue) {
                    window.location.reload(); // Hard reload to clear all state and redirect to login
                    return;
                }

                try {
                    const newState = JSON.parse(event.newValue);
                    const oldState = event.oldValue ? JSON.parse(event.oldValue) : null;

                    // Check if isAuthenticated changed from true to false (logout)
                    if (oldState?.state?.isAuthenticated === true && newState?.state?.isAuthenticated === false) {
                        console.log('[AuthSync] Logout detected in another tab. Reloading...');
                        window.location.reload();
                    }

                    // Note: Login sync (false -> true) is mostly handled by Zustand itsel f
                    // as it rehydrates from localStorage. But we can force a sync if needed.
                } catch (error) {
                    console.error('[AuthSync] Error parsing storage event data:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);
};
