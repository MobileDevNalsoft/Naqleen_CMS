import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials } from '../api/types/authTypes';
import { loginUser } from '../api/handlers/authApi';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
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
            }
        }),
        {
            name: 'auth-storage', // unique name for localStorage key
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated
            }), // Only persist user and auth status
        }
    )
);
