import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("custom_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ detail: "No refresh token provided." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { SessionService } = await import("@/lib/security/sessionService");
    const sessionService = new SessionService(supabase);
    
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    const { accessToken, sessionValid, reason } = await sessionService.refreshSession(refreshToken, ipAddress, userAgent);
    
    if (!sessionValid) {
      // Clear cookie if session is revoked
      cookieStore.delete("custom_refresh_token");
      return NextResponse.json({ detail: reason || "Session revoked or invalid." }, { status: 401 });
    }

    return NextResponse.json({ success: true, access_token: accessToken });
  } catch (err: any) {
    console.error("Refresh token error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
