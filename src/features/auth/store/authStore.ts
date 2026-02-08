import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { API_CONFIG } from '../../../api';
import { loginUser } from '../apis/authApi';
import type { User, LoginCredentials } from '../types/authTypes';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    updateUser: (user: User) => void;
    validateSubscription: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await loginUser(credentials);

                    if (response.success && response.user) {
                        set({
                            isAuthenticated: true,
                            user: response.user,
                            isLoading: false,
                            error: null
                        });
                        return true;
                    } else {
                        set({
                            isAuthenticated: false,
                            user: null,
                            isLoading: false,
                            error: response.message
                        });
                        return false;
                    }
                } catch (error) {
                    set({
                        isAuthenticated: false,
                        user: null,
                        isLoading: false,
                        error: 'An unexpected error occurred'
                    });
                    return false;
                }
            },

            logout: () => {
                set({ user: null, isAuthenticated: false, error: null });
                // Optional: Clear storage/cookies if needed
            },

            updateUser: (user) => {
                set({ user });
            },
            validateSubscription: async () => {
                const user = get().user;
                if (!user) return;

                try {
                    // We need a direct fetch here because this URL is different from the main axios client base
                    const url = new URL(API_CONFIG.ENDPOINTS.VALIDATE_SUBSCRIPTION, window.location.origin);
                    url.searchParams.append('productId', 'NAQ-1');

                    const response = await fetch(url.toString(), {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            // Use hardcoded basic auth for this specific endpoint if needed, 
                            // matching the mobile app logic which likely sends these headers
                            'Authorization': 'Basic ' + btoa('NAQLEEN.INTEGRATION:NaqleenInt@123')
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // API returns { response_code: 200, data: { is_valid: "Y" | "N" } }
                        // Check nested data structure
                        const isValid = data?.data?.is_valid === 'Y';

                        set(state => ({
                            user: state.user ? { ...state.user, isSubscriptionValid: isValid } : null
                        }));
                    }
                } catch (error) {
                    console.error('Subscription validation failed:', error);
                    // Decide: Fail open or closed? Mobile fails open on network error generally, 
                    // unless we want strict enforcement. For now, keep existing state.
                }
            }
        }),
        {
            name: 'auth-storage', // unique name for storage key
            storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for tab-close logout
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated
            }), // Only persist user and auth status
        }
    )
);
