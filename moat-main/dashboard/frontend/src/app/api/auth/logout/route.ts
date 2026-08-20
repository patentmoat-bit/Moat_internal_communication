import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { SessionService } from "@/lib/security/sessionService";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get("custom_access_token")?.value;
    
    // Check Authorization header fallback
    const authHeader = request.headers.get("authorization");
    if (!accessToken && authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }

    if (accessToken) {
      const payload = await verifyToken(accessToken);
      if (payload && payload.jti) {
        const supabase = createAdminClient();
        const sessionService = new SessionService(supabase);
        
        await sessionService.revokeSessionByToken(accessToken, "LOGOUT");
          
        // Log to SecurityEvents table
        try {
          await supabase.from("SecurityEvents").insert({
            event_id: crypto.randomUUID(),
            user_id: payload.sub,
            email: payload.email,
            event_type: "LOGOUT",
            status: "SUCCESS",
            ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
            user_agent: request.headers.get("user-agent") || "Unknown",
            endpoint: "/api/auth/logout"
          });
        } catch (e) {
          console.warn("SecurityEvents insert failed on logout", e);
        }

        // Always log to audit_logs so it appears in the admin dashboard
        await supabase.from("audit_logs").insert({
          user_id: payload.sub,
          event_type: "LOGOUT_SUCCESS",
          entity_type: "AUTHENTICATION",
          ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
          user_agent: request.headers.get("user-agent") || "Unknown",
          after_data: { email: payload.email }
        });
      }
    }

    // Clear cookies explicitly
    cookieStore.delete("custom_access_token");
    cookieStore.delete("custom_refresh_token");

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (err: any) {
    console.error("Logout error:", err);
    // Ensure cookies are cleared even if token verification fails
    try {
      const cookieStore = await cookies();
      cookieStore.delete("custom_access_token");
      cookieStore.delete("custom_refresh_token");
    } catch (e) {
      // ignore
    }
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
