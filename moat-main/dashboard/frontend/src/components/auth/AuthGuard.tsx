"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import type { AppRole } from "@/types";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If provided, only users whose role is in this list can access the content. */
  allowedRoles?: AppRole[];
}

/**
 * AuthGuard — wraps any page/section that requires authentication.
 *
 * - Calls checkAuth() once on mount via Supabase to validate the session.
 * - Unauthenticated users are redirected to /login.
 * - Authenticated users whose role is not in allowedRoles are redirected to /403.
 * - Does NOT block render while checking (isLoading starts false).
 */
export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    if (isAuthenticated && user) return;

    checkAuth().then((authed) => {
      if (!authed) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Not yet authenticated — render nothing while the redirect is processing
  if (!isAuthenticated) return null;

  // Role enforcement — redirect to dedicated 403 page
  if (allowedRoles && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role)) {
      router.replace("/403");
      return null;
    }
  }

  return <>{children}</>;
}