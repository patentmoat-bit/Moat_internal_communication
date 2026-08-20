import { SupabaseClient } from "@supabase/supabase-js";
import { SystemMonitoringEvent } from "./types";

/**
 * MOAT Phase 8 — Email & Notification Monitoring Service
 * Monitors outgoing emails, notification delivery, scheduled reminders, Microsoft Graph health, and OAuth tokens.
 */
export class EmailMonitoringService {
  constructor(private supabase?: SupabaseClient) {}

  public async recordEmailEvent(payload: {
    eventType:
      | "EMAIL_SENT"
      | "EMAIL_FAILED"
      | "NOTIFICATION_SENT"
      | "NOTIFICATION_FAILED"
      | "REMINDER_STATUS"
      | "MS_GRAPH_CONNECTIVITY_ERROR"
      | "OAUTH_TOKEN_EXPIRED";
    recipient?: string;
    subject?: string;
    errorMessage?: string;
    providerStatus?: string;
  }): Promise<SystemMonitoringEvent> {
    const isError =
      payload.eventType.includes("FAILED") ||
      payload.eventType === "MS_GRAPH_CONNECTIVITY_ERROR" ||
      payload.eventType === "OAUTH_TOKEN_EXPIRED";

    const event: SystemMonitoringEvent = {
      category: "EMAIL_NOTIFICATION",
      eventType: payload.eventType,
      email: payload.recipient || null,
      status: isError ? "FAILURE" : "SUCCESS",
      reason: payload.errorMessage || null,
      metadata: {
        subject: payload.subject || "System Notification",
        providerStatus: payload.providerStatus || "MS_GRAPH_HEALTHY",
      },
      timestamp: new Date().toISOString(),
    };

    if (this.supabase) {
      try {
        await this.supabase.from("EmailLogs").insert({
          log_id: `em_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          recipient: payload.recipient || "admin@moat.ai",
          subject: payload.subject || "Notification",
          status: isError ? "FAILED" : "SENT",
          provider_status: payload.providerStatus || "MS_GRAPH_HEALTHY",
          error_message: payload.errorMessage || null,
          sent_at: event.timestamp,
        });
      } catch {
        // Fallback silently
      }
    }

    return event;
  }
}
