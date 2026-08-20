import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SessionService } from "./sessionService";
import { cookies } from "next/headers";

export function withSessionValidation(
  handler: (request: NextRequest, sessionUser: any) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest) => {
    try {
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
