import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnterpriseAuthenticationService, createAuthResponse } from "@/lib/security";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, captchaToken } = body;

    if (!email || !password) {
      return createAuthResponse({ success: false, error: "Email and password are required.", detail: "Email and password are required." }, 400);
    }

    // Corporate Domain Validation for Login
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createAuthResponse({ success: false, error: "Invalid email format.", detail: "Invalid email format." }, 400);
    }
    // Note: Domain validation is now centrally managed in EnterpriseAuthenticationService

    const supabase = createAdminClient();
    const authService = new EnterpriseAuthenticationService(supabase);

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    const challenge = await authService.authenticateLogin(email, password, ipAddress, userAgent, captchaToken);
    return createAuthResponse({ success: true, ...challenge });
  } catch (err: any) {
    console.error("Login error:", err);
    const status = err.status || 500;
    const message = err.error || err.message || err.detail || "Internal server error";
    const code = err.code || (status === 429 ? "RATE_LIMITED" : "AUTH_ERROR");
    
    const headers: Record<string, string> = {};
    if (err.retryAfterMs) {
      headers["Retry-After"] = String(Math.ceil(err.retryAfterMs / 1000));
    }

    return createAuthResponse({ success: false, error: message, detail: message, code, message }, status, headers);
  }
}
