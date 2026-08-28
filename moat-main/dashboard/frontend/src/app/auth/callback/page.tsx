"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

/**
 * OAuth callback page — lands here after Supabase's Microsoft/Azure AD flow
 * redirects back with a real Supabase session already set (sb-* cookies).
 * That session alone is never enough to use the app: it hands off to the
 * exact same MFA challenge password login goes through (see
 * authStore.completeSsoLogin() / EnterpriseAuthenticationService.authenticateSso),
 * then lands on /login, whose existing MFA UI takes over from there — there is
 * no separate SSO-specific MFA form to keep in sync with the real one.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const completeSsoLogin = useAuthStore((state) => state.completeSsoLogin);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    completeSsoLogin()
      .then(() => {
        router.replace("/login");
      })
      .catch((err: any) => {
        router.replace(`/login?error=${encodeURIComponent(err?.message || "sso_failed")}`);
      });
  }, [completeSsoLogin, router]);

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
