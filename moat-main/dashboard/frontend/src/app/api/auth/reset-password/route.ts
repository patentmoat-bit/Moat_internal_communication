import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnterpriseAuthenticationService, createAuthResponse } from "@/lib/security";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, captchaToken } = body;

    if (!token || !password) {
      return createAuthResponse({ success: false, error: "Token and new password are required.", detail: "Token and new password are required." }, 400);
    }

    const supabase = createAdminClient();
    const authService = new EnterpriseAuthenticationService(supabase);

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    const result = await authService.completePasswordReset(token, password, ipAddress, userAgent);

    const backend = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    if (backend && backend.startsWith("http")) {
      try {
        await fetch(`${backend}/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // Ignore backend unreachable error
      }
    }

    return createAuthResponse(result);
  } catch (err: any) {
    console.error("Reset password error:", err);
    const status = err.status || 500;
    const message = err.error || err.message || err.detail || "Internal server error";
    return createAuthResponse({ success: false, error: message, detail: message, message }, status);
  }
}
