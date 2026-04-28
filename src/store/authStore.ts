/**
 * Zustand auth store — holds the currently logged-in community user.
 * Persisted to AsyncStorage via tokenStore in src/api/client.ts
 */

import { create } from 'zustand';
import type { AuthUser } from '../api/types';
import { tokenStore } from '../api/client';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),

  logout: async () => {
    await tokenStore.clear();
    set({ user: null });
  },
}));
