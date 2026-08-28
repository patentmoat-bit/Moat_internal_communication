import { NextRequest } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnterpriseAuthenticationService, createAuthResponse } from "@/lib/security";
import { GlobalExceptionHandler } from "@/lib/errors";

/**
 * Called by /auth/callback right after a user completes Microsoft/Azure AD
 * sign-in via Supabase Auth's own OAuth flow. The browser already carries a
 * real Supabase session (sb-* cookies) at this point — this route reads that
 * session (never trusts a client-supplied email) to find out who actually
 * authenticated, then hands off into the same domain-allowlist + MFA-challenge
 * logic used by password login (EnterpriseAuthenticationService.authenticateSso).
 * No app session is issued here — same as password login, that only happens
 * once /api/auth/mfa/verify succeeds.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: supabaseUser }, error: getUserError } = await supabase.auth.getUser();

    if (getUserError || !supabaseUser?.email) {
      return createAuthResponse({ success: false, error: "No Microsoft session found.", detail: "No Microsoft session found." }, 401);
    }

    const adminClient = createAdminClient();
    const authService = new EnterpriseAuthenticationService(adminClient);

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    const challenge = await authService.authenticateSso(supabaseUser.email, ipAddress, userAgent);
    return createAuthResponse({ success: true, ...challenge });
  } catch (err: any) {
    console.error("SSO bridge error:", err);
    const status = err.status || 500;
    const message = err.error || err.message || err.detail || "Internal server error";
    return createAuthResponse({ success: false, error: message, detail: message, code: err.code || "AUTH_ERROR" }, status);
  }
}
