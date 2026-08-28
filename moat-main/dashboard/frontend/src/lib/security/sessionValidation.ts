import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SessionService } from "./sessionService";
import { cookies } from "next/headers";

export function withSessionValidation(
  handler: (request: NextRequest, sessionUser: any) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest) => {
    try {
      // Middleware already verified the JWT and re-checked user_sessions for
      // every request that reaches here (see middleware.ts) and forwards the
      // result via these headers, which only middleware can set (a request
      // cannot forge them — middleware always explicitly overwrites or clears
      // them). Trust that instead of repeating the same DB round-trips here.
      if (request.headers.get("x-session-verified") === "1") {
        const sessionUser = {
          sub: request.headers.get("x-session-user-id") || "",
          email: request.headers.get("x-session-user-email") || "",
          role: request.headers.get("x-session-user-role") || "",
        };
        if (sessionUser.sub) {
          return await handler(request, sessionUser);
        }
      }

      // Fallback for any request that didn't pass through middleware.
      const cookieStore = await cookies();
      let token = cookieStore.get("custom_access_token")?.value;

      const authHeader = request.headers.get("authorization");
      if (!token && authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }

      if (!token) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }

      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";

      const supabase = createAdminClient();
      const sessionService = new SessionService(supabase);

      const validation = await sessionService.validateSession(token, ip);
      if (!validation.valid) {
        console.error("Session validation failed. Reason:", validation.reason);
        return NextResponse.json({ success: false, error: "Session expired or revoked" }, { status: 401 });
      }

      return await handler(request, validation.user);
    } catch (error) {
      console.error("Session validation error:", error);
      return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
  };
}
