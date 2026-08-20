import { SupabaseClient } from "@supabase/supabase-js";
import { SystemMonitoringEvent } from "./types";

/**
 * MOAT Phase 8 — API Monitoring Service
 * Monitors API traffic, HTTP status codes (401, 403, 404, 429, 500), validation failures, CSRF rejection, and CORS blocks.
 */
export class ApiMonitoringService {
  constructor(private supabase?: SupabaseClient) {}

  public async recordApiEvent(payload: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    ipAddress?: string;
    userId?: string | null;
    errorType?:
      | "HTTP_401"
      | "HTTP_403"
      | "HTTP_404"
      | "HTTP_429_RATE_LIMIT"
      | "HTTP_500_INTERNAL_ERROR"
      | "VALIDATION_ERROR"
      | "CSRF_VALIDATION_FAILURE"
      | "CORS_BLOCKED_REQUEST"
      | null;
    reason?: string;
  }): Promise<SystemMonitoringEvent> {
    const isError = payload.statusCode >= 400 || !!payload.errorType;

    const event: SystemMonitoringEvent = {
      category: "API_SECURITY",
      eventType: payload.errorType || `HTTP_${payload.statusCode}`,
      userId: payload.userId || null,
      ipAddress: payload.ipAddress || "Unknown IP",
      endpoint: payload.endpoint,
      status: isError ? "FAILURE" : "SUCCESS",
      reason: payload.reason || (isError ? `HTTP status ${payload.statusCode}` : null),
      metadata: {
        method: payload.method,
        statusCode: payload.statusCode,
        responseTimeMs: payload.responseTimeMs,
      },
      timestamp: new Date().toISOString(),
    };

    if (this.supabase) {
      try {
        await this.supabase.from("ApiLogs").insert({
          log_id: `api_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          request_id: `req_${Date.now()}`,
          endpoint: payload.endpoint,
          method: payload.method,
          status_code: payload.statusCode,
          response_time_ms: payload.responseTimeMs,
          ip_address: payload.ipAddress || null,
          user_id: payload.userId || null,
          error_type: payload.errorType || null,
          created_at: event.timestamp,
        });
      } catch {
        // Fallback silently
      }
    }

    return event;
  }
}
