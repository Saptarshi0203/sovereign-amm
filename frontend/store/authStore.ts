/**
 * @file authStore.ts
 * @description Persisted Zustand authentication store.
 *
 * State
 *   token       JWT issued by POST /api/auth/google (or /login); null when logged out
 *   user        public user payload (email, name, picture, role, wallet_balance…)
 *   isLoggedIn  token && user present
 *   isAdmin     user.role === 'admin'
 *
 * Actions
 *   login(token, user)   store the session, mirror it into the central app store
 *   logout()             clear it (and drop back to the Demo Sandbox)
 *   setWallet(balance)   live wallet updates from the portfolio stream
 *
 * Persistence: `zustand/middleware` `persist` → localStorage key
 * `sovereign-auth`, so the session survives refreshes. The central UI store
 * (`@/lib/store`) is kept in sync so every page reacts to auth changes.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useStore } from '@/lib/store';
import type { AuthUser } from '@/lib/types';

export interface AuthSessionUser extends AuthUser {
  google_id?: string | null;
  wallet_balance?: number;
  status?: string;
  created_at?: number;
}

export interface AuthStoreState {
  token: string | null;
  user: AuthSessionUser | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  /** `true` once the persisted state has been rehydrated on the client. */
  hydrated: boolean;
  login(token: string, user: AuthSessionUser): void;
  logout(): void;
  setWallet(balance: number): void;
  setHydrated(v: boolean): void;
}

/** Mirror the auth session into the central app store (dual-state engine). */
function syncAppStore(token: string | null, user: AuthSessionUser | null): void {
  useStore.getState().setSession(token, user ? { ...user, wallet_balance_inr: user.wallet_balance ?? user.wallet_balance_inr } : null);
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoggedIn: false,
      isAdmin: false,
      hydrated: false,

      login: (token, user) => {
        const isAdmin = user.role === 'admin';
        set({ token, user, isLoggedIn: true, isAdmin });
        syncAppStore(token, user);
      },

      logout: () => {
        set({ token: null, user: null, isLoggedIn: false, isAdmin: false });
        syncAppStore(null, null);
      },

      setWallet: (balance) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, wallet_balance: balance, wallet_balance_inr: balance } });
      },

      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'sovereign-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, user: s.user, isLoggedIn: s.isLoggedIn, isAdmin: s.isAdmin }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** Bearer header for API calls (empty object when logged out). */
export function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
