import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnterpriseAuthenticationService, createAuthResponse } from "@/lib/security";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, captchaToken } = body;

    if (!email) {
      return createAuthResponse({ success: false, error: "Email is required.", detail: "Email is required." }, 400);
    }

    const supabase = createAdminClient();
    const authService = new EnterpriseAuthenticationService(supabase);

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    const result = await authService.requestPasswordReset(email, ipAddress, userAgent, captchaToken);

    const backend = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    if (backend && backend.startsWith("http")) {
      try {
        await fetch(`${backend}/auth/forgot-password`, {
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
    console.error("Forgot password error:", err);
    const status = err.status || 500;
    const message = err.error || err.message || err.detail || "Internal server error";
    return createAuthResponse({ success: false, error: message, detail: message, message }, status);
  }
}
