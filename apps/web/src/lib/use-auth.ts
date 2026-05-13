'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from './api';

interface MeResponse {
  id: string;
  email: string;
  displayName?: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

/**
 * Check whether the user has a valid session cookie. Returns `undefined`
 * while loading, `null` if anonymous, or the profile when logged in.
 *
 * Designed for use in components that are rendered on BOTH public and
 * authenticated pages (e.g. landing header + model cards) — a 401 is not
 * an error here, it's the "guest" state.
 */
export function useAuth() {
  const q = useQuery<MeResponse | null>({
    queryKey: ['me-public'],
    queryFn: async () => {
      try {
        return await api<MeResponse>('/users/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
  return {
    user: q.data ?? null,
    isLoading: q.isLoading,
    isAuthenticated: q.data != null,
  };
}
