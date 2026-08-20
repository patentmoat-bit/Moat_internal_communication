import { EventSeverity, MonitoringCategory, SystemMonitoringEvent } from "./types";

/**
 * MOAT Phase 8 — Risk Analysis Engine
 * Every system event is classified by severity: Low, Medium, High, or Critical.
 */
export class RiskAnalysisEngine {
  /**
   * Classify event severity based on category, event type, and context metadata.
   */
  public static classifyEvent(event: Partial<SystemMonitoringEvent>): EventSeverity {
    const type = (event.eventType || "").toUpperCase();
    const reason = (event.reason || "").toUpperCase();
    const status = event.status || "INFO";

    // Critical Severity Checks
    if (
      type.includes("PRIVILEGE_ESCALATION") ||
      type.includes("SUSPICIOUS_ADMIN") ||
      type.includes("DATA_ACCESS_VIOLATION") ||
      type.includes("AUTH_SERVICE_FAILURE") ||
      type.includes("DATABASE_OUTAGE") ||
      type.includes("MALWARE") ||
      type.includes("VIRUS_DETECTED") ||
      reason.includes("SQL INJECTION") ||
      reason.includes("COMMAND INJECTION") ||
      reason.includes("CRLF SMUGGLING")
    ) {
      return "Critical";
    }

    // High Severity Checks
    if (
      type.includes("ACCOUNT_LOCKED") ||
      type.includes("MFA_LOCKED") ||
      type.includes("REPEATED_MFA_FAILURE") ||
      type.includes("UNAUTHORIZED_API_ACCESS") ||
      type.includes("OAUTH_FAILURE") ||
      type.includes("DATABASE_CONNECTIVITY") ||
      type.includes("DATABASE_CONNECTION_FAILURE") ||
      type.includes("EMAIL_FAILED") ||
      type.includes("WORKFLOW_FAILURE") ||
      type.includes("STORAGE_CAPACITY_THRESHOLD") ||
      type.includes("CSRF_FAIL") ||
      type.includes("CORS_BLOCKED") ||
      type.includes("HTTP_401") ||
      type.includes("HTTP_403") ||
      type.includes("HTTP_500") ||
      status === "FAILURE" && (type.includes("API") || type.includes("DATABASE") || type.includes("AUTH"))
    ) {
      return "High";
    }

    // Medium Severity Checks
    if (
      type.includes("MULTIPLE_LOGIN_FAILURES") ||
      type.includes("LOGIN_FAILED") ||
      type.includes("PERMISSION_DENIED") ||
      type.includes("UPLOAD_FAIL") ||
      type.includes("OVERSIZED_FILE") ||
      type.includes("INVALID_FILE_TYPE") ||
      type.includes("HTTP_404") ||
      type.includes("HTTP_429") ||
      type.includes("RATE_LIMIT_EXCEEDED") ||
      type.includes("CAPTCHA_REQUIRED") ||
      type.includes("CAPTCHA_FAILED")
    ) {
      return "Medium";
    }

    // Default to Low Severity
    return "Low";
  }

  /**
   * Determine if an event requires immediate Alert Engine notification.
   */
  public static requiresAlert(severity: EventSeverity, eventType: string): boolean {
    if (severity === "Critical" || severity === "High") {
      return true;
    }
    const type = eventType.toUpperCase();
    if (
      type.includes("MULTIPLE_LOGIN_FAILURES") ||
      type.includes("REPEATED_MFA") ||
      type.includes("LOCKOUT") ||
      type.includes("SUSPICIOUS_IP") ||
      type.includes("UNAUTHORIZED") ||
      type.includes("EXCESSIVE_API") ||
      type.includes("EMAIL_DELIVERY_FAIL") ||
      type.includes("WORKFLOW_FAIL") ||
      type.includes("STORAGE_THRESHOLD") ||
      type.includes("OAUTH_FAIL")
    ) {
      return true;
    }
    return false;
  }
}
