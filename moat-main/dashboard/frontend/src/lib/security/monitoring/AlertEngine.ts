import { SupabaseClient } from "@supabase/supabase-js";
import { EventSeverity, SecurityAlertRecord } from "./types";

/**
 * MOAT Phase 8 — Alert Engine
 * Automatically generates alerts for critical system security events and operational anomalies.
 */
export class AlertEngine {
  private static mockAlertsStore: SecurityAlertRecord[] = [];

  constructor(private supabase?: SupabaseClient) {
    if (AlertEngine.mockAlertsStore.length === 0) {
      AlertEngine.seedMockAlerts();
    }
  }

  public static getAlertsStore(): SecurityAlertRecord[] {
    return AlertEngine.mockAlertsStore;
  }

  /**
   * Generate an alert, notify administrators, and record to SecurityAlerts table.
   */
  public async generateAlert(payload: {
    alertType: string;
    severity: EventSeverity;
    title: string;
    message: string;
    source: string;
    metadata?: Record<string, any>;
  }): Promise<SecurityAlertRecord> {
    const alertId = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: SecurityAlertRecord = {
      alertId,
      alertType: payload.alertType,
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      source: payload.source,
      status: "ACTIVE",
      createdAt: now,
      metadata: payload.metadata || {},
    };

    AlertEngine.mockAlertsStore.unshift(record);
    if (AlertEngine.mockAlertsStore.length > 500) {
      AlertEngine.mockAlertsStore.pop();
    }

    // Trigger Admin Notification
    this.notifyAdministrators(record);

    if (this.supabase) {
      try {
        await this.supabase.from("SecurityAlerts").insert({
          alert_id: record.alertId,
          alert_type: record.alertType,
          severity: record.severity,
          title: record.title,
          message: record.message,
          source: record.source,
          status: record.status,
          metadata: record.metadata,
          created_at: record.createdAt,
        });
      } catch {
        // Fallback silently if DB table is unavailable
      }
    }

    return record;
  }

  /**
   * Acknowledge or resolve an active security alert.
   */
  public async updateAlertStatus(alertId: string, status: "ACKNOWLEDGED" | "RESOLVED"): Promise<boolean> {
    const alert = AlertEngine.mockAlertsStore.find((a) => a.alertId === alertId);
    if (!alert) return false;

    alert.status = status;
    if (status === "RESOLVED") {
      alert.resolvedAt = new Date().toISOString();
    }

    if (this.supabase) {
      try {
        await this.supabase
          .from("SecurityAlerts")
          .update({ status, resolved_at: alert.resolvedAt || null })
          .eq("alert_id", alertId);
      } catch {
        // Fallback silently
      }
    }
    return true;
  }

  public getActiveAlerts(severity?: EventSeverity): SecurityAlertRecord[] {
    let alerts = AlertEngine.mockAlertsStore.filter((a) => a.status === "ACTIVE");
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }
    return alerts;
  }

  private notifyAdministrators(alert: SecurityAlertRecord): void {
    const banner = alert.severity === "Critical" ? "🚨 [CRITICAL_ADMIN_ALERT]" : "⚠️ [SECURITY_ADMIN_ALERT]";
    console.warn(`${banner} ${alert.title} — ${alert.message} | Source: ${alert.source}`);
  }

  private static seedMockAlerts(): void {
    const now = Date.now();
    AlertEngine.mockAlertsStore = [
      {
        alertId: "alt_seed_1",
        alertType: "MULTIPLE_LOGIN_FAILURES",
        severity: "High",
        title: "Brute-Force Login Threshold Exceeded",
        message: "5 consecutive failed login attempts detected from IP 185.220.101.5 targeting admin@moat.ai.",
        source: "AuthenticationMonitoringService",
        status: "ACTIVE",
        createdAt: new Date(now - 15 * 60000).toISOString(),
      },
      {
        alertId: "alt_seed_2",
        alertType: "UNAUTHORIZED_API_ACCESS",
        severity: "High",
        title: "Unauthorized API Endpoint Access Attempt",
        message: "HTTP 403 returned for unauthenticated request to /api/admin/patents/delete.",
        source: "ApiMonitoringService",
        status: "ACTIVE",
        createdAt: new Date(now - 45 * 60000).toISOString(),
      },
      {
        alertId: "alt_seed_3",
        alertType: "STORAGE_CAPACITY_THRESHOLD",
        severity: "High",
        title: "Supabase Storage Bucket Capacity Warning",
        message: "Storage bucket 'patents-vault' has reached 88% of configured capacity (4,400 MB / 5,000 MB).",
        source: "SupabaseHealthMonitoringService",
        status: "ACKNOWLEDGED",
        createdAt: new Date(now - 120 * 60000).toISOString(),
      },
    ];
  }
}
