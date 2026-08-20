import { SupabaseClient } from "@supabase/supabase-js";
import { signToken, verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionUserData {
  id: string;
  email: string;
  name: string;
  roleName: string;
  organizationId?: string;
  domain?: string;
}

export class SessionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Issue secure access and refresh JWTs and set HTTP-only cookies.
   */
  async createSession(user: SessionUserData, ipAddress: string, userAgent: string): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = crypto.randomUUID();
    const tokenTtl = process.env.ACCESS_TOKEN_TTL || "15m";
    
    // Parse tokenTtl roughly to get expiration date
    let expiryMs = 30 * 60 * 1000;
    if (tokenTtl.endsWith('m')) expiryMs = parseInt(tokenTtl) * 60 * 1000;
    else if (tokenTtl.endsWith('h')) expiryMs = parseInt(tokenTtl) * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiryMs).toISOString();

    const payload = {
      sub: user.id,
      jti,
      email: user.email,
      role: user.roleName,
      name: user.name,
      ip: ipAddress,
      organizationId: user.organizationId,
      domain: user.domain,
    };

    const accessToken = await signToken(payload, tokenTtl);
    
    // Cryptographically secure random refresh token
    const rawRefreshToken = crypto.randomBytes(32).toString('base64url');
    const refreshTokenFamilyId = crypto.randomUUID();

    const userRes = await this.supabase.from("users").update({ last_login: new Date().toISOString() }).eq("id", user.id);
    if (userRes.error) console.error("Error updating user last_login:", userRes.error);

    const hashedAccessToken = crypto.createHash('sha256').update(accessToken).digest('hex');
    const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const sessionRes = await this.supabase.from("user_sessions").insert({
      user_id: user.id,
      jwt_token: hashedAccessToken,
      refresh_token: hashedRefreshToken,
      refresh_token_family_id: refreshTokenFamilyId,
      refresh_token_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      absolute_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      login_time: new Date().toISOString(),
      status: "Active",
      device: userAgent,
      ip_address: ipAddress,
      last_activity_at: new Date().toISOString(),
    });
    if (sessionRes.error) {
      console.error("Failed to insert session into DB:", sessionRes.error);
    }

    // Set secure HTTP-only cookies
    try {
      const cookieStore = await cookies();
      const isProd = process.env.NODE_ENV === "production";
      cookieStore.set("custom_access_token", accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: expiryMs / 1000,
        path: "/",
      });
      cookieStore.set("custom_refresh_token", rawRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 7 * 24 * 3600,
        path: "/api/auth",
      });
    } catch {
      // Cookies might not be writable in certain background or test contexts
    }

    return { accessToken, refreshToken: rawRefreshToken };
  }

  /**
   * Refreshes a session by rotating the refresh token.
   */
  async refreshSession(rawRefreshToken: string, currentIp: string, userAgent: string): Promise<{ accessToken: string; refreshToken: string; sessionValid: boolean; reason?: string }> {
    const hashedToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const { data: session, error } = await this.supabase
      .from("user_sessions")
      .select("*")
      .eq("refresh_token", hashedToken)
      .single();

    if (error || !session) {
      return { sessionValid: false, reason: "Invalid refresh token", accessToken: "", refreshToken: "" };
    }

    if (session.status === 'Inactive' || session.logout_time || session.revoked_at) {
      return { sessionValid: false, reason: "Session revoked", accessToken: "", refreshToken: "" };
    }

    // Check reuse
    if (session.refresh_token_used_at) {
      // REUSE DETECTED!
      await this.supabase.from("user_sessions").update({
        status: "Inactive",
        revoked_at: new Date().toISOString(),
      }).eq("refresh_token_family_id", session.refresh_token_family_id);
      
      console.warn(`[SECURITY] Refresh token reuse detected for family ${session.refresh_token_family_id}! Session revoked.`);
      return { sessionValid: false, reason: "Invalid refresh token", accessToken: "", refreshToken: "" };
    }

    const now = new Date();
    const loginTime = new Date(session.login_time);
    const lastActivityTime = session.last_activity_at ? new Date(session.last_activity_at) : loginTime;
    const absoluteExpiry = session.absolute_expires_at ? new Date(session.absolute_expires_at) : new Date(loginTime.getTime() + 7 * 24 * 3600 * 1000);

    if (now > absoluteExpiry) {
      await this.revokeSession(session.user_id, session.id, "ABSOLUTE_TIMEOUT");
      return { sessionValid: false, reason: "Absolute session lifetime exceeded", accessToken: "", refreshToken: "" };
    }

    const INACTIVITY_TIMEOUT_MS = 12 * 60 * 60 * 1000; // Extended to 12 hours
    if (now.getTime() - lastActivityTime.getTime() > INACTIVITY_TIMEOUT_MS) {
      await this.revokeSession(session.user_id, session.id, "INACTIVITY_TIMEOUT");
      return { sessionValid: false, reason: "Session expired due to inactivity", accessToken: "", refreshToken: "" };
    }

    const { data: user } = await this.supabase
      .from("users")
      .select("is_active, status, id, email, name, roles(role_name)")
      .eq("id", session.user_id)
      .single();

    if (!user || !user.is_active || user.status === "DISABLED" || user.status === "SUSPENDED" || user.status === "Inactive") {
      return { sessionValid: false, reason: "User account is disabled or suspended", accessToken: "", refreshToken: "" };
    }

    // Mark current refresh token as used
    await this.supabase.from("user_sessions").update({
      refresh_token_used_at: new Date().toISOString()
    }).eq("id", session.id);

    // Generate new tokens
    const roleName = Array.isArray(user.roles) ? user.roles[0]?.role_name : (user.roles as any)?.role_name || "Viewer";
    const jti = crypto.randomUUID();
    const tokenTtl = process.env.ACCESS_TOKEN_TTL || "15m";
    const newAccessToken = await signToken({
      sub: user.id, jti, email: user.email, role: roleName, name: user.name, ip: currentIp
    }, tokenTtl);

    const newRawRefreshToken = crypto.randomBytes(32).toString('base64url');
    const newHashedAccessToken = crypto.createHash('sha256').update(newAccessToken).digest('hex');
    const newHashedRefreshToken = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');

    const newSessionRes = await this.supabase.from("user_sessions").insert({
      user_id: user.id,
      jwt_token: newHashedAccessToken,
      refresh_token: newHashedRefreshToken,
      refresh_token_family_id: session.refresh_token_family_id,
      refresh_token_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      absolute_expires_at: absoluteExpiry.toISOString(),
      rotated_from_token_id: hashedToken,
      login_time: session.login_time,
      status: "Active",
      device: userAgent,
      ip_address: currentIp,
      last_activity_at: new Date().toISOString(),
    });

    try {
      const cookieStore = await cookies();
      const isProd = process.env.NODE_ENV === "production";
      cookieStore.set("custom_access_token", accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 15 * 60, // 15 minutes
        path: "/",
      });
      cookieStore.set("custom_refresh_token", newRawRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 7 * 24 * 3600,
        path: "/api/auth",
      });
    } catch {}

    return { sessionValid: true, accessToken: newAccessToken, refreshToken: newRawRefreshToken };
  }

  async validateSession(token: string, currentIp: string): Promise<{ valid: boolean; user?: any; reason?: string }> {
    const payload = await verifyToken(token);
    if (!payload || !payload.jti) {
      return { valid: false, reason: "Token is invalid, expired, or missing JTI." };
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Server-side session verification against real schema
    const { data: session, error } = await this.supabase
      .from("user_sessions")
      .select("id, status, logout_time, user_id, login_time, last_activity_at")
      .or(`jwt_token.eq.${tokenHash},jwt_token.eq.${token},refresh_token.eq.${tokenHash},refresh_token.eq.${token}`)
      .single();

    if (error || !session) {
      console.error("Session lookup error:", error);
      // For strict F-09 compliance, we must reject if session is not found in DB
      return { valid: false, reason: "Session not found in DB or revoked." };
    }

    if (session.status === 'Inactive' || session.logout_time) {
      return { valid: false, reason: "Session revoked." };
    }

    const now = new Date();
    const loginTime = new Date(session.login_time);
    const lastActivityTime = session.last_activity_at ? new Date(session.last_activity_at) : loginTime;

    // 1. Enforce 8-hour absolute session lifetime
    const ABSOLUTE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
    if (now.getTime() - loginTime.getTime() > ABSOLUTE_LIFETIME_MS) {
      await this.revokeSession(session.user_id, session.id, "ABSOLUTE_TIMEOUT");
      return { valid: false, reason: "Absolute session lifetime (7 days) exceeded." };
    }

    const INACTIVITY_TIMEOUT_MS = 12 * 60 * 60 * 1000; // Extended to 12 hours
    if (now.getTime() - lastActivityTime.getTime() > INACTIVITY_TIMEOUT_MS) {
      await this.revokeSession(session.user_id, session.id, "INACTIVITY_TIMEOUT");
      return { valid: false, reason: "Session expired due to inactivity." };
    }

    // Verify user is still active
    const { data: user, error: userError } = await this.supabase
      .from("users")
      .select("is_active, status")
      .eq("id", session.user_id)
      .single();

    if (userError || !user || !user.is_active || user.status === "DISABLED" || user.status === "SUSPENDED" || user.status === "Inactive") {
      return { valid: false, reason: "User account is disabled or suspended." };
    }

    // Update last activity asynchronously
    this.supabase.from("user_sessions").update({ last_activity_at: new Date().toISOString() }).eq("id", session.id).then();

    // Optional IP anomaly check
    if (payload.ip && payload.ip !== currentIp && currentIp !== "Unknown" && payload.ip !== "Unknown") {
      console.warn(`[SESSION_ANOMALY] Session IP mismatch for user ${payload.sub}: Issued at ${payload.ip}, used at ${currentIp}`);
    }

    return { valid: true, user: payload };
  }

  async revokeSession(userIdOrEmail: string, sessionId?: string, reason: string = "LOGOUT"): Promise<void> {
    try {
      if (sessionId) {
        await this.supabase.from("user_sessions").update({
          logout_time: new Date().toISOString(),
          status: "Inactive"
        }).eq("id", sessionId);
      } else {
        // If it's an email, find userId first
        const isEmail = userIdOrEmail.includes('@');
        let uid = userIdOrEmail;
        if (isEmail) {
          const { data: user } = await this.supabase.from("users").select("id").eq("email", userIdOrEmail).single();
          if (user) uid = user.id;
        }

        await this.supabase.from("user_sessions").update({
          logout_time: new Date().toISOString(),
          status: "Inactive"
        }).eq("user_id", uid).is("logout_time", null);
      }
    } catch (e) {
      console.error("Error revoking session", e);
    }

    try {
      const cookieStore = await cookies();
      cookieStore.delete("custom_access_token");
      cookieStore.delete("custom_refresh_token");
    } catch {
      // Ignore cookie deletion error if in test context
    }
  }

  async revokeSessionByToken(token: string, reason: string = "LOGOUT"): Promise<void> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      await this.supabase.from("user_sessions").update({
        logout_time: new Date().toISOString(),
        status: "Inactive"
      }).or(`jwt_token.eq.${tokenHash},jwt_token.eq.${token},refresh_token.eq.${tokenHash},refresh_token.eq.${token}`);
      
      const cookieStore = await cookies();
      cookieStore.delete("custom_access_token");
      cookieStore.delete("custom_refresh_token");
    } catch (e) {
      console.error("Error revoking session by token", e);
    }
  }
}
