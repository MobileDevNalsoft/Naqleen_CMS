import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute

export const InactivityManager = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const logout = useAuthStore((state) => state.logout);
    const lastActivityRef = useRef<number>(Date.now());

    useEffect(() => {
        if (!isAuthenticated) return;

        const updateActivity = () => {
            lastActivityRef.current = Date.now();
        };

        // Events to track active input (still useful for when they come back)
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, updateActivity);
        });

        // Interval to check for timeout
        const intervalId = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;

            // Check timeout FIRST.
            // This catches two cases:
            // 1. Tab was backgrounded for > 10 mins (throttled interval runs on return).
            // 2. Tab was backgrounded and interval kept running (caught immediately).
            if (timeSinceLastActivity >= TIMEOUT_MS) {
                console.log('[InactivityManager] Inactive for timeout duration. Logging out.');
                logout();
                return;
            }

            // If we are here, we are within the safe zone.
            // If the document is visible, we treat "watching" as activity.
            // Update the timestamp to keep the session alive.
            if (!document.hidden) {
                lastActivityRef.current = now;
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateActivity);
            });
            clearInterval(intervalId);
        };
    }, [isAuthenticated, logout]);

    return null;
};
