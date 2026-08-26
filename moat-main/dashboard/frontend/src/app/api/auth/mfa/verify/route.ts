import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnterpriseAuthenticationService, createAuthResponse } from "@/lib/security";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challengeToken, code } = body;

    if (!challengeToken || !code) {
      return createAuthResponse({ success: false, error: "Challenge token and code are required.", detail: "Challenge token and code are required." }, 400);
    }

    const supabase = createAdminClient();
    const authService = new EnterpriseAuthenticationService(supabase);

    const userAgent = request.headers.get("user-agent") || "Unknown";
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";

    const user = await authService.verifyMfaChallenge(challengeToken, code, ipAddress, userAgent);

    try {
      const cookieStore = await cookies();
      cookieStore.set("mfa_enrolled", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 3600,
        path: "/",
      });
    } catch {
      // Cookie might not be writable in test environment
    }

    const { accessToken, ...userProfile } = user;
    return createAuthResponse({ success: true, user: userProfile, access_token: accessToken });
  } catch (err: any) {
    console.error("MFA Verify error:", err);
    const status = err.status || 500;
    const message = err.error || err.message || err.detail || "Internal server error";
    return createAuthResponse({ success: false, error: message, detail: message, message }, status);
  }
}
