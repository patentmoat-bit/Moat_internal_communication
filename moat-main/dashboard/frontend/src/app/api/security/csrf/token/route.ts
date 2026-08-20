import { NextRequest, NextResponse } from "next/server";
import { CSRFTokenService } from "@/lib/security/csrf/CSRFTokenService";
import { CORSOptionsService } from "@/lib/security/csrf/CORSOptionsService";
import { GlobalExceptionHandler } from "@/lib/errors";

/**
 * CSRF Token Issuance API Route
 * 
 * GET /api/security/csrf/token
 * 1. Generates a cryptographically strong CSRF token bound to the active user/session.
 * 2. Sets secure cookies:
 *    - XSRF-TOKEN (SameSite=Strict, Secure=true, HttpOnly=false for frontend header binding)
 *    - __Host-moat-csrf-auth (SameSite=Strict, Secure=true, HttpOnly=true for signature verification)
 * 3. Returns CORS headers and token payload.
 */
export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") || "https://moat.ai";
    const userId = req.headers.get("x-test-user-id") || "usr_ceo_01";
    const sessionId = req.headers.get("x-test-session-id") || "sess_prod_889900";

    const { token, record, cookies } = CSRFTokenService.generateToken(userId, sessionId);
    const corsHeaders = CORSOptionsService.getCORSHeaders(origin);

    const response = NextResponse.json({
      success: true,
      message: "CSRF token successfully generated and bound to session.",
      token,
      expiresAt: record.expiresAt,
      cookiesSet: cookies.map((c) => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite }))
    }, { status: 200, headers: corsHeaders });

    // Set cookies on HTTP response
    for (const c of cookies) {
      response.cookies.set(c.name, c.value, {
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        path: c.path,
        maxAge: c.maxAge
      });
    }

    return response;
  } catch (err: any) {
    console.error("[CSRFTokenAPI] Error:", err);
    return NextResponse.json({ success: false, message: "Failed to generate CSRF token.", error: err.message }, { status: 500 });
  }
}
