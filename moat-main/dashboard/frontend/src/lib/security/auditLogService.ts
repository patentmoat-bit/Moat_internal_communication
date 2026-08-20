import { SupabaseClient } from "@supabase/supabase-js";

export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_UNLOCKED"
  | "IP_BLOCKED"
  | "RATE_LIMIT_EXCEEDED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_EMAIL_SENT"
  | "PASSWORD_RESET_COMPLETED"
  | "PASSWORD_RESET_FAILED"
  | "PASSWORD_RESET_RATE_LIMIT"
  | "PASSWORD_RESET_TOKEN_REJECTED"
  | "PASSWORD_RESET_TOKEN_REUSED"
  | "PASSWORD_RESET_TOKEN_EXPIRED"
  | "PASSWORD_RESET_SESSIONS_REVOKED"
  | "PASSWORD_RESET_SUCCESS"
  | "MFA_VERIFIED"
  | "MFA_FAILED"
  | "MFA_LOCKED"
  | "MFA_ENROLLMENT_STARTED"
  | "MFA_ENROLLMENT_COMPLETED"
  | "CAPTCHA_REQUIRED"
  | "CAPTCHA_FAILED"
  | "CREDENTIAL_STUFFING_DETECTED"
  | "BRUTE_FORCE_DETECTED"
  | "SESSION_CREATED"
  | "SESSION_REVOKED"
  | "EXCEPTION_OCCURRED"
  | "SECURITY_EXCEPTION"
  | "VALIDATION_FAILURE"
  | "ALLOW_LIST_VIOLATION"
  | "SIZE_LIMIT_EXCEEDED"
  | "SCHEMA_VIOLATION"
  | "INJECTION_ATTEMPT"
  | "HEADER_VIOLATION"
  // Admin & Module Events
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_ACTIVATED"
  | "USER_DEACTIVATED"
  | "USER_DELETED"
  | "USER_RESTORED"
  | "ROLE_ASSIGNED"
  | "ROLE_CHANGED"
  | "ROLE_REMOVED"
  | "PERMISSION_GRANTED"
  | "PERMISSION_REVOKED"
  | "PERMISSION_MODIFIED"
  | "SECURITY_SETTING_CHANGED"
  | "MFA_POLICY_CHANGED"
  | "PASSWORD_POLICY_CHANGED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_VIEWED"
  | "DOCUMENT_DOWNLOADED"
  | "DOCUMENT_SHARED"
  | "DOCUMENT_MODIFIED"
  | "DOCUMENT_DELETED"
  | "PATENT_CREATED"
  | "PATENT_ASSIGNED"
  | "PATENT_STATUS_CHANGED"
  | "PATENT_REVIEWED"
  | "PATENT_APPROVED"
  | "PATENT_REJECTED"
  | "SYSTEM_CONFIG_CHANGED"
  | "PERMISSION_DENIED"
  | "DOMAIN_ACCESS_DENIED"
  | "DOMAIN_DISABLED"
  | "DOMAIN_ADDED"
  | "DOMAIN_LOGIN_ALLOWED"
  | "REPORT_GENERATED"
  | "AI_RESEARCH_EXECUTED"
  | "PATENT_DOCUMENT_SEARCH_EXECUTED";

export interface SecurityLogPayload {
  userId?: string | null;
  email?: string | null;
  eventType: SecurityEventType;
  ipAddress: string;
  userAgent: string;
  endpoint?: string;
  status?: "SUCCESS" | "FAILURE" | "WARNING" | "INFO";
  failureReason?: string;
  location?: string;
  errorId?: string;
  severity?: "INFO" | "WARNING" | "FAILURE" | "CRITICAL";
  resolutionStatus?: "UNRESOLVED" | "INVESTIGATING" | "RESOLVED";
  actorRole?: string;
  category?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  oldValue?: string | Record<string, any>;
  newValue?: string | Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ImmutableAuditLogRecord {
  id: string;
  timestamp: string;
  userId: string | null;
  email: string | null;
  eventType: SecurityEventType;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  status: "SUCCESS" | "FAILURE" | "WARNING" | "INFO";
  failureReason: string | null;
  location: string;
  errorId?: string;
  severity?: "INFO" | "WARNING" | "FAILURE" | "CRITICAL";
  resolutionStatus?: "UNRESOLVED" | "INVESTIGATING" | "RESOLVED";
  actorRole?: string;
  category?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  oldValue?: string | Record<string, any>;
  newValue?: string | Record<string, any>;
  metadata?: Record<string, any>;
}

export class AuditLogService {
  constructor(private supabase?: SupabaseClient) {}

  private getImmutableStore(): ImmutableAuditLogRecord[] {
    if (!(global as any).__enterpriseImmutableAuditLogs) {
      (global as any).__enterpriseImmutableAuditLogs = [];
    }
    return (global as any).__enterpriseImmutableAuditLogs;
  }

  /**
   * Layer 7 — Audit Logging
   * Log every authentication event with full context: Timestamp, User ID, Email, IP, User Agent, Endpoint, Status, Failure Reason, Location.
   * Logs are frozen (immutable in memory and append-only in database).
   */
  async logEvent(payload: SecurityLogPayload): Promise<void> {
    const timestamp = new Date().toISOString();
    const id = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const logRecord: ImmutableAuditLogRecord = {
      id,
      timestamp,
      userId: payload.userId || null,
      email: payload.email ? this.maskEmail(payload.email) : null,
      eventType: payload.eventType,
      ipAddress: payload.ipAddress || "Unknown",
      userAgent: payload.userAgent || "Unknown",
      endpoint: payload.endpoint || "/api/auth",
      status: payload.status || "INFO",
      failureReason: payload.failureReason || null,
      location: payload.location || this.resolveMockGeoLocation(payload.ipAddress),
      errorId: payload.errorId,
      severity: payload.severity || (payload.status === "FAILURE" ? "FAILURE" : "INFO"),
      resolutionStatus: payload.resolutionStatus || (payload.errorId ? "UNRESOLVED" : undefined),
      actorRole: payload.actorRole,
      category: payload.category || "SYSTEM",
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      resourceName: payload.resourceName,
      oldValue: payload.oldValue,
      newValue: payload.newValue,
      metadata: payload.metadata || {},
    };

    // Make immutable in memory
    Object.freeze(logRecord);
    const store = this.getImmutableStore();
    store.unshift(logRecord);
    if (store.length > 2000) store.pop(); // Keep recent 2000 events in memory

    if (payload.status === "FAILURE" || payload.eventType.includes("LOCKED") || payload.eventType.includes("BLOCKED") || payload.eventType.includes("EXCEEDED")) {
      console.warn(`[SECURITY_ALERT] ${payload.eventType}: IP=${logRecord.ipAddress} User=${logRecord.email || logRecord.userId || "anonymous"} Reason=${logRecord.failureReason || "N/A"}`);
    } else {
      console.log(`[SECURITY_LOG] ${payload.eventType}: IP=${logRecord.ipAddress} User=${logRecord.email || logRecord.userId || "anonymous"}`);
    }

    if (this.supabase) {
      // Insert into audit_logs directly

      try {
        const payload = {
          user_id: logRecord.userId,
          event_type: logRecord.eventType,
          entity_type: logRecord.endpoint || "SYSTEM",
          ip_address: logRecord.ipAddress,
          user_agent: logRecord.userAgent,
          before_data: typeof logRecord.oldValue === 'string' ? { value: logRecord.oldValue } : logRecord.oldValue,
          after_data: typeof logRecord.newValue === 'string' ? { value: logRecord.newValue } : logRecord.newValue,
          metadata: logRecord.metadata || {},
          created_at: logRecord.timestamp || new Date().toISOString()
        };

        const { error: auditError } = await this.supabase.from("audit_logs").insert(payload);
        
        if (auditError) {
          console.error("Failed to insert into audit_logs:", auditError);
          // 23503 is Postgres Foreign Key Violation (e.g. auth.users constraint)
          // If public.users is used instead of auth.users, user_id inserts will fail.
          if (auditError.code === "23503" || auditError.message?.includes("foreign key")) {
            console.log("Attempting fallback insertion without restricted user_id constraint...");
            
            const fallbackPayload = {
               ...payload,
               user_id: null,
               metadata: {
                 ...payload.metadata,
                 fallback_user_id: logRecord.userId
               }
            };
            
            const { error: fallbackError } = await this.supabase.from("audit_logs").insert(fallbackPayload);
            if (fallbackError) {
                console.error("Fallback audit_logs insertion also failed:", fallbackError);
            }
          }
        }
      } catch (e) {
        console.error("Exception inserting into audit_logs:", e);
      }
    }
  }

  async getLogs(filter?: {
    user?: string;
    ip?: string;
    date?: string;
    event?: string;
    errorId?: string;
    severity?: string;
    resolutionStatus?: string;
  }): Promise<ImmutableAuditLogRecord[]> {
    if (!this.supabase) return [];
    
    const { data: dbLogs, error } = await this.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
       console.error("Failed to fetch live audit logs:", error);
       return [];
    }

    let logs: ImmutableAuditLogRecord[] = (dbLogs || []).map((l: any) => ({
      id: l.id || `sec_${Date.now()}`,
      timestamp: l.created_at,
      userId: l.user_id || l.metadata?.fallback_user_id || null,
      email: l.metadata?.email || null,
      eventType: l.event_type as SecurityEventType,
      ipAddress: l.ip_address || l.metadata?.ipAddress || "Unknown",
      userAgent: l.user_agent || l.metadata?.userAgent || "Unknown",
      endpoint: l.metadata?.endpoint || "Unknown",
      status: l.metadata?.status || "INFO",
      failureReason: l.metadata?.failureReason || null,
      location: l.metadata?.location || "Unknown",
      errorId: l.metadata?.errorId,
      severity: l.metadata?.severity || "INFO",
      resolutionStatus: l.metadata?.resolutionStatus,
      actorRole: l.metadata?.actorRole,
      category: l.metadata?.category || "SYSTEM",
      resourceType: l.metadata?.resourceType,
      resourceId: l.metadata?.resourceId,
      resourceName: l.metadata?.resourceName,
      oldValue: l.metadata?.oldValue,
      newValue: l.metadata?.newValue,
      metadata: l.metadata
    }));

    if (!filter) return logs;

    if (filter.user) {
      const q = filter.user.toLowerCase();
      logs = logs.filter((l) => (l.email && l.email.toLowerCase().includes(q)) || (l.userId && l.userId.toLowerCase().includes(q)));
    }
    if (filter.ip) {
      logs = logs.filter((l) => l.ipAddress.includes(filter.ip!));
    }
    if (filter.date) {
      logs = logs.filter((l) => l.timestamp.startsWith(filter.date!));
    }
    if (filter.event) {
      logs = logs.filter((l) => l.eventType === filter.event);
    }
    if (filter.errorId) {
      logs = logs.filter((l) => l.errorId === filter.errorId);
    }
    if (filter.severity) {
      logs = logs.filter((l) => l.severity === filter.severity);
    }
    if (filter.resolutionStatus) {
      logs = logs.filter((l) => l.resolutionStatus === filter.resolutionStatus);
    }

    return logs;
  }

  async getSecurityMetrics(): Promise<{
    failedLoginsToday: number;
    lockedAccounts: number;
    blockedIps: number;
    passwordResetRequests: number;
    rateLimitedRequests: number;
    mfaFailures: number;
    captchaChallenges: number;
  }> {
    const logs = await this.getLogs();
    const todayStr = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter((l) => l.timestamp.startsWith(todayStr));

    return {
      failedLoginsToday: todayLogs.filter((l) => l.eventType === "LOGIN_FAILED").length,
      lockedAccounts: logs.filter((l) => l.eventType === "ACCOUNT_LOCKED" || l.eventType === "MFA_LOCKED").length,
      blockedIps: logs.filter((l) => l.eventType === "IP_BLOCKED").length,
      passwordResetRequests: logs.filter((l) => l.eventType === "PASSWORD_RESET_REQUESTED").length,
      rateLimitedRequests: logs.filter((l) => l.eventType === "RATE_LIMIT_EXCEEDED" || l.eventType === "PASSWORD_RESET_RATE_LIMIT" || l.eventType === "BRUTE_FORCE_DETECTED").length,
      mfaFailures: logs.filter((l) => l.eventType === "MFA_FAILED" || l.eventType === "MFA_LOCKED").length,
      captchaChallenges: logs.filter((l) => l.eventType === "CAPTCHA_REQUIRED" || l.eventType === "CAPTCHA_FAILED").length,
    };
  }

  private maskEmail(email: string): string {
    const parts = email.split("@");
    if (parts.length !== 2) return "*****";
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  }

  private resolveMockGeoLocation(ip: string): string {
    if (ip === "127.0.0.1" || ip === "::1" || ip === "Unknown") return "Local / Internal";
    const geos = ["US - Virginia", "US - California", "UK - London", "DE - Frankfurt", "SG - Singapore", "JP - Tokyo"];
    const hash = ip.split(".").reduce((acc, part) => acc + parseInt(part || "0", 10), 0);
    return geos[hash % geos.length] || "US - Virginia";
  }

  private seedMockSecurityLogs() {
    const mockEvents: Partial<ImmutableAuditLogRecord>[] = [
      { eventType: "LOGIN_SUCCESS", email: "alex.turner@moat.ai", ipAddress: "192.168.1.104", endpoint: "/api/auth/login", status: "SUCCESS", failureReason: null, location: "US - California" },
      { eventType: "LOGIN_FAILED", email: "admin@moat.ai", ipAddress: "185.220.101.5", endpoint: "/api/auth/login", status: "FAILURE", failureReason: "Invalid password", location: "DE - Frankfurt" },
      { eventType: "RATE_LIMIT_EXCEEDED", email: "admin@moat.ai", ipAddress: "185.220.101.5", endpoint: "/api/auth/login", status: "WARNING", failureReason: "Too many login attempts", location: "DE - Frankfurt" },
      { eventType: "IP_BLOCKED", email: null, ipAddress: "45.133.1.20", endpoint: "/api/auth/login", status: "FAILURE", failureReason: "Subnet reputation failure", location: "RU - Moscow" },
      { eventType: "PASSWORD_RESET_REQUESTED", email: "sara.chen@moat.ai", ipAddress: "172.16.0.42", endpoint: "/api/auth/forgot-password", status: "SUCCESS", failureReason: null, location: "UK - London" },
      { eventType: "MFA_VERIFIED", email: "alex.turner@moat.ai", ipAddress: "192.168.1.104", endpoint: "/api/auth/mfa/verify", status: "SUCCESS", failureReason: null, location: "US - California" },
      { eventType: "CAPTCHA_REQUIRED", email: "test@example.com", ipAddress: "103.145.12.9", endpoint: "/api/auth/login", status: "INFO", failureReason: null, location: "SG - Singapore" },
      { eventType: "ACCOUNT_LOCKED", email: "john@example.com", ipAddress: "89.248.165.12", endpoint: "/api/auth/login", status: "FAILURE", failureReason: "Consecutive login failures exceeded 5", location: "NL - Amsterdam" },
      { eventType: "MFA_LOCKED", email: "david.kim@moat.ai", ipAddress: "192.168.2.15", endpoint: "/api/auth/mfa/verify", status: "FAILURE", failureReason: "MFA attempts exceeded 5", location: "US - Virginia" },
    ];

    const now = Date.now();
    mockEvents.forEach((ev, idx) => {
      const rec: ImmutableAuditLogRecord = {
        id: `sec_mock_${idx}`,
        timestamp: new Date(now - idx * 3600 * 1000 * 2).toISOString(),
        userId: `usr_mock_${idx}`,
        email: ev.email || null,
        eventType: ev.eventType as SecurityEventType,
        ipAddress: ev.ipAddress || "127.0.0.1",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        endpoint: ev.endpoint || "/api/auth/login",
        status: ev.status as any,
        failureReason: ev.failureReason || null,
        location: ev.location || "US - Virginia",
      };
      Object.freeze(rec);
      this.getImmutableStore().push(rec);
    });
  }

  /**
   * Log an immutable exception or security violation event.
   */
  async logExceptionEvent(payload: {
    errorId: string;
    endpoint: string;
    ipAddress: string;
    userAgent: string;
    userId?: string | null;
    email?: string | null;
    exceptionType: string;
    severity?: "INFO" | "WARNING" | "FAILURE" | "CRITICAL";
    resolutionStatus?: "UNRESOLVED" | "INVESTIGATING" | "RESOLVED";
    failureReason?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEvent({
      eventType: payload.severity === "CRITICAL" ? "SECURITY_EXCEPTION" : "EXCEPTION_OCCURRED",
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      endpoint: payload.endpoint,
      userId: payload.userId || null,
      email: payload.email || null,
      status: payload.severity === "CRITICAL" || payload.severity === "FAILURE" ? "FAILURE" : "WARNING",
      failureReason: payload.failureReason || payload.exceptionType,
      errorId: payload.errorId,
      severity: payload.severity || "FAILURE",
      resolutionStatus: payload.resolutionStatus || "UNRESOLVED",
      metadata: {
        exceptionType: payload.exceptionType,
        ...(payload.metadata || {}),
      },
    });
  }
}
