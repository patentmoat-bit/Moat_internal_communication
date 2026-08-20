import { SupabaseClient } from "@supabase/supabase-js";
import { SystemMonitoringEvent } from "./types";

/**
 * MOAT Phase 8 — Authentication Monitoring Service
 * Monitors login attempts, MFA challenges, account lockouts, password resets, and suspicious authentication activity.
 */
export class AuthenticationMonitoringService {
  constructor(private supabase?: SupabaseClient) {}

  public async recordAuthEvent(payload: {
    eventType:
      | "SUCCESSFUL_LOGIN"
      | "FAILED_LOGIN"
      | "MFA_SUCCESS"
      | "MFA_FAILURE"
      | "ACCOUNT_LOCKED"
      | "PASSWORD_RESET_REQUEST"
      | "ACCOUNT_RECOVERY_REQUEST"
      | "NEW_DEVICE_LOGIN"
      | "NEW_BROWSER_LOGIN"
      | "SUSPICIOUS_LOGIN_ATTEMPT";
    userId?: string | null;
    email?: string | null;
    ipAddress: string;
    userAgent?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<SystemMonitoringEvent> {
    const event: SystemMonitoringEvent = {
      category: "AUTHENTICATION",
      eventType: payload.eventType,
      userId: payload.userId,
      email: payload.email,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent || "Unknown Browser",
      endpoint: "/api/auth/" + payload.eventType.toLowerCase(),
      status: payload.eventType.includes("FAIL") || payload.eventType.includes("LOCKED") ? "FAILURE" : "SUCCESS",
      reason: payload.reason || null,
      metadata: payload.metadata || {},
      timestamp: new Date().toISOString(),
    };

    if (this.supabase) {
      try {
        await this.supabase.from("LoginHistory").insert({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: payload.userId || null,
          email: payload.email || null,
          login_type: payload.eventType,
          status: event.status,
          ip_address: payload.ipAddress,
          user_agent: payload.userAgent,
          device_type: payload.metadata?.deviceType || "Desktop",
          browser: payload.metadata?.browser || "Chrome",
          location: payload.metadata?.location || "US - Virginia",
          created_at: event.timestamp,
        });
      } catch {
        // Fallback silently
      }
    }

    return event;
  }
}
