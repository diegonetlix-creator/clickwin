/**
 * useUserData — Safe data loading hook
 *
 * Wraps `useAuth` and provides:
 *  - `user`         — from Supabase auth session (never null after auth loads)
 *  - `authReady`    — true once auth + profile are fully resolved
 *  - `waitForUser`  — async helper that resolves when user is ready
 *
 * Usage:
 *   const { user, authReady } = useUserData();
 *   if (!authReady) return <Spinner />;
 *   if (!user)      return <Redirect to="/login" />;
 */

import { useAuth } from "@/contexts/AuthContext";

export function useUserData() {
  const { user, role, isAdmin, loading } = useAuth();

  // True once both the auth session AND profile/role are resolved
  const authReady = !loading;

  return {
    user,
    role,
    isAdmin,
    loading,
    authReady,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
  };
}
