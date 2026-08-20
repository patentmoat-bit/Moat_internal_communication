import { SupabaseClient } from "@supabase/supabase-js";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export class SessionService {
  constructor(private supabase: SupabaseClient) {}

  async createSession(userId: string, email: string, name: string, roleName: string, ipAddress: string, userAgent: string) {
    const payload = { sub: userId, email, role: roleName, name };

    const accessToken = await signToken(payload, "1h");
    const refreshToken = await signToken({ sub: userId }, "7d");

    // Update last login
    await this.supabase.from("users").update({ last_login: new Date().toISOString() }).eq("id", userId);

    // Track active session
    await this.supabase.from("user_sessions").insert({
      user_id: userId,
      jwt_token: accessToken,
      refresh_token: refreshToken,
      device: userAgent,
      ip_address: ipAddress
    });

    // Set secure HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set("custom_access_token", accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 3600, path: "/"
    });
    cookieStore.set("custom_refresh_token", refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 3600, path: "/api/auth/refresh"
    });
  }
}
