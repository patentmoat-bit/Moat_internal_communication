"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";
import { getRoleWorkspace } from "@/lib/roleIntelligence";

/**
 * OAuth callback page — called after Supabase OAuth redirect.
 * Supabase SSR middleware handles the session token automatically.
 * This page simply calls checkAuth() to populate the store, then
 * redirects to the appropriate role workspace.
 */
function getSafeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth().then((authed) => {
      if (!authed) {
        router.push("/login?error=oauth_failed");
        return;
      }
      // checkAuth populates the store; read user from store directly
      const { user } = useAuthStore.getState();
      const workspace = getRoleWorkspace(user?.role);
      router.push(getSafeNext(searchParams.get("next")) ?? workspace.route);
    });
  }, [checkAuth, router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0c08] text-white">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#8a6a1e] mb-6">
        <span className="font-black text-sm">IP</span>
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c] mb-3" />
      <p className="text-sm text-slate-500">Completing sign in…</p>
    </div>
  );
}
