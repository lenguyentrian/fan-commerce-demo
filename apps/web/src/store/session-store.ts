'use client';

import { create } from 'zustand';

import { responseSchemas, routes, type SessionUser } from '@fc/core';

import { apiClient } from '@/lib/api-client';

/**
 * Client-side cache of "who am I".
 *
 * The header lives in the root layout, so it does not remount on a soft
 * navigation. Without a shared store, anything that changes the session would
 * leave the header stale until a full reload, and every component that cares
 * would probe the endpoint for itself.
 *
 * This is a UI convenience only. It is never the authority on access: the
 * server re-reads the signed cookie on every protected request, so poking
 * this store from the console grants nothing.
 */
interface SessionState {
  user: SessionUser | null;
  status: 'idle' | 'loading' | 'ready';

  /** Probes the session endpoint once. Safe to call from several components. */
  load: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  status: 'idle',

  async load() {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });

    try {
      const response = await apiClient.get(routes.session(), {
        schema: responseSchemas.session,
      });
      set({ user: response.user, status: 'ready' });
    } catch {
      // A failed probe means "treat as anonymous", not "show an error".
      set({ user: null, status: 'ready' });
    }
  },

  setUser(user) {
    set({ user, status: 'ready' });
  },

  clear() {
    set({ user: null, status: 'ready' });
  },
}));

export const useSessionUser = (): SessionUser | null => useSessionStore((state) => state.user);
export const useSessionStatus = (): SessionState['status'] =>
  useSessionStore((state) => state.status);
