import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@plastmassa/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Omit<User, 'password'> | null;
  permissions: string[];
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: Omit<User, 'password'>) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

function extractPermissions(user: Omit<User, 'password'>): string[] {
  if (user.role && typeof user.role === 'object' && 'permissions' in user.role) {
    return user.role.permissions;
  }
  return [];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      permissions: [],
      isAuthenticated: false,

      login: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          user,
          permissions: extractPermissions(user),
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          permissions: [],
          isAuthenticated: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
    }),
    {
      name: 'saidbaraka-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
