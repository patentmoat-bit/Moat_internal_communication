import { AuditLogService } from "./auditLogService";

export interface ServerSideErrorLog {
  errorId: string;
  timestamp: string;
  userId: string | null;
  email: string | null;
  ipAddress: string;
  endpoint: string;
  httpMethod: string;
  requestId: string;
  fullException: string;
  stackTrace: string | null;
  sqlError: string | null;
  postgrestErrorCode: string | null;
  userAgent: string;
  internalCategory: string;
  severity: "INFO" | "WARNING" | "FAILURE" | "CRITICAL";
  resolutionStatus: "UNRESOLVED" | "INVESTIGATING" | "RESOLVED";
}

export interface ValidationFailureLog {
  logId: string;
  timestamp: string;
  userId: string | null;
  ipAddress: string;
  endpoint: string;
  requestId: string;
  validationErrors: Array<{ field: string; message: string; rejectedValue?: any }>;
  rejectedFields: string[];
  userAgent: string;
  category: "SCHEMA_VIOLATION" | "ALLOW_LIST_VIOLATION" | "SIZE_VIOLATION" | "INJECTION_ATTEMPT" | "HEADER_VIOLATION" | "GENERAL_VALIDATION";
  severity: "WARNING" | "FAILURE" | "CRITICAL";
}

/**
 * SecurityLoggingService
 * 
 * Captures complete technical error details (SQL statements, stack traces, PostgREST error codes)
 * on the server side for administrator troubleshooting and telemetry, without ever exposing them to clients.
 */
export class SecurityLoggingService {
  private auditLogService: AuditLogService;

  constructor(auditLogService?: AuditLogService) {
    this.auditLogService = auditLogService || new AuditLogService();
  }

  private getStore(): ServerSideErrorLog[] {
    if (!(global as any).__enterpriseServerSideErrorLogs) {
      (global as any).__enterpriseServerSideErrorLogs = [];
      this.seedMockErrorLogs();
    }
    return (global as any).__enterpriseServerSideErrorLogs;
  }

  private getValidationStore(): ValidationFailureLog[] {
    if (!(global as any).__enterpriseValidationFailureLogs) {
      (global as any).__enterpriseValidationFailureLogs = [];
    }
    return (global as any).__enterpriseValidationFailureLogs;
  }

  /**
   * Phase 11: Log Validation Failures
   * Stores immutable audit logs of schema violations, allow-list rejections, size limit breaches, and injection attempts.
   */
  async logValidationFailure(payload: Partial<ValidationFailureLog> & { endpoint: string; validationErrors?: Array<{ field: string; message: string; rejectedValue?: any }> }): Promise<string> {
    const timestamp = new Date().toISOString();
    const logId = payload.logId || `VAL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const validationErrors = payload.validationErrors || [];
    const rejectedFields = payload.rejectedFields || Array.from(new Set(validationErrors.map((e) => e.field || "unknown")));
    const category = payload.category || "GENERAL_VALIDATION";
    const severity = payload.severity || "WARNING";
    const ipAddress = payload.ipAddress || "127.0.0.1";
    const userAgent = payload.userAgent || "Unknown";
    const userId = payload.userId || null;
    const requestId = payload.requestId || `req_val_${Date.now()}`;

    const logRecord: ValidationFailureLog = {
      logId,
      timestamp,
      userId,
      ipAddress,
      endpoint: payload.endpoint,
      requestId,
      validationErrors,
      rejectedFields,
      userAgent,
      category,
      severity,
    };

    Object.freeze(logRecord);
    const store = this.getValidationStore();
    store.unshift(logRecord);
    if (store.length > 2000) store.pop();

    console.warn(`[SECURITY_VALIDATION_LOG] [${logId}] ${payload.endpoint} — Cat: ${category} — Rejected Fields: [${rejectedFields.join(", ")}] — IP: ${ipAddress}`);

    try {
      let eventType: any = "VALIDATION_FAILURE";
      if (category === "ALLOW_LIST_VIOLATION") eventType = "ALLOW_LIST_VIOLATION";
      else if (category === "SIZE_VIOLATION") eventType = "SIZE_LIMIT_EXCEEDED";
      else if (category === "SCHEMA_VIOLATION") eventType = "SCHEMA_VIOLATION";
      else if (category === "INJECTION_ATTEMPT") eventType = "INJECTION_ATTEMPT";
      else if (category === "HEADER_VIOLATION") eventType = "HEADER_VIOLATION";

      await this.auditLogService.logEvent({
        eventType,
        status: severity === "CRITICAL" ? "FAILURE" : "WARNING",
        ipAddress,
        userAgent,
        endpoint: payload.endpoint,
        userId,
        failureReason: `Validation failed on fields: [${rejectedFields.join(", ")}]`,
        metadata: {
          logId,
          requestId,
          validationErrors,
          rejectedFields,
          category,
        },
      });
    } catch {
      // Fallback silently if audit log database fails
    }

    return logId;
  }

  /**
   * Retrieve validation failure logs for security investigations (ADMIN ONLY).
   */
  async getValidationLogs(filter?: { endpoint?: string; ipAddress?: string; category?: string; userId?: string }): Promise<ValidationFailureLog[]> {
    let logs = [...this.getValidationStore()];
    if (!filter) return logs;
    if (filter.endpoint) logs = logs.filter((l) => l.endpoint.toLowerCase().includes(filter.endpoint!.toLowerCase()));
    if (filter.ipAddress) logs = logs.filter((l) => l.ipAddress.includes(filter.ipAddress!));
    if (filter.category) logs = logs.filter((l) => l.category === filter.category);
    if (filter.userId) logs = logs.filter((l) => l.userId === filter.userId);
    return logs;
  }

  /**
   * Securely log technical error details on the server and generate an immutable audit log entry.
   */
  async logException(payload: Partial<ServerSideErrorLog> & { errorId: string; error?: unknown; internalCategory?: string }): Promise<void> {
    const timestamp = new Date().toISOString();
    const errObj = typeof payload.error === "object" && payload.error !== null ? (payload.error as Record<string, any>) : {};
    
    // Extract SQL / PostgREST error codes and stack traces
    const errCode = String(errObj.code || errObj.status || "").toUpperCase();
    const postgrestErrorCode = errCode.startsWith("PGRST") ? errCode : null;
    const sqlError = errObj.sql || errObj.query || (String(payload.error || "").toLowerCase().includes("syntax error") ? String(payload.error) : null);
    const stackTrace = errObj.stack || (payload.error instanceof Error ? payload.error.stack : null) || null;
    const fullException = typeof payload.error === "string" ? payload.error : JSON.stringify(payload.error || errObj, Object.getOwnPropertyNames(payload.error || errObj || {}));

    const logRecord: ServerSideErrorLog = {
      errorId: payload.errorId,
      timestamp,
      userId: payload.userId || null,
      email: payload.email || null,
      ipAddress: payload.ipAddress || "Unknown",
      endpoint: payload.endpoint || "/api/unknown",
      httpMethod: payload.httpMethod || "POST",
      requestId: payload.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullException: payload.fullException || fullException || "Unknown exception",
      stackTrace: payload.stackTrace || stackTrace,
      sqlError: payload.sqlError || sqlError,
      postgrestErrorCode: payload.postgrestErrorCode || postgrestErrorCode,
      userAgent: payload.userAgent || "Unknown",
      internalCategory: payload.internalCategory || "GENERAL_EXCEPTION",
      severity: payload.severity || (payload.internalCategory?.includes("AUTH") || payload.internalCategory?.includes("SECURITY") ? "CRITICAL" : "FAILURE"),
      resolutionStatus: payload.resolutionStatus || "UNRESOLVED",
    };

    // Store in admin-only server store
    const store = this.getStore();
    store.unshift(logRecord);
    if (store.length > 1000) store.pop();

    console.error(`[SERVER_SECURITY_LOG] [${logRecord.errorId}] ${logRecord.httpMethod} ${logRecord.endpoint} — Cat: ${logRecord.internalCategory} — Reason: ${logRecord.fullException}`);

    // Create immutable audit log entry
    try {
      await this.auditLogService.logExceptionEvent({
        errorId: logRecord.errorId,
        endpoint: logRecord.endpoint,
        ipAddress: logRecord.ipAddress,
        userAgent: logRecord.userAgent,
        userId: logRecord.userId,
        email: logRecord.email,
        exceptionType: logRecord.internalCategory,
        severity: logRecord.severity,
        resolutionStatus: logRecord.resolutionStatus,
        failureReason: logRecord.fullException.slice(0, 200),
        metadata: {
          httpMethod: logRecord.httpMethod,
          requestId: logRecord.requestId,
          hasStackTrace: !!logRecord.stackTrace,
          hasSqlError: !!logRecord.sqlError,
          postgrestErrorCode: logRecord.postgrestErrorCode,
        },
      });
    } catch {
      // Fallback silently if audit log service fails
    }
  }

  /**
   * Retrieve server-side technical logs (ADMIN ONLY).
   */
  async getLogs(filter?: {
    errorId?: string;
    endpoint?: string;
    severity?: string;
    resolutionStatus?: string;
    search?: string;
  }): Promise<ServerSideErrorLog[]> {
    let logs = [...this.getStore()];

    if (!filter) return logs;

    if (filter.errorId) {
      logs = logs.filter((l) => l.errorId.toLowerCase().includes(filter.errorId!.toLowerCase()));
    }
    if (filter.endpoint) {
      logs = logs.filter((l) => l.endpoint.toLowerCase().includes(filter.endpoint!.toLowerCase()));
    }
    if (filter.severity) {
      logs = logs.filter((l) => l.severity === filter.severity);
    }
    if (filter.resolutionStatus) {
      logs = logs.filter((l) => l.resolutionStatus === filter.resolutionStatus);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      logs = logs.filter((l) => l.fullException.toLowerCase().includes(q) || l.errorId.toLowerCase().includes(q) || l.endpoint.toLowerCase().includes(q));
    }

    return logs;
  }

  /**
   * Update the resolution status of an error log (ADMIN ONLY).
   */
  async updateResolutionStatus(errorId: string, status: "UNRESOLVED" | "INVESTIGATING" | "RESOLVED"): Promise<boolean> {
    const store = this.getStore();
    const item = store.find((l) => l.errorId === errorId);
    if (item) {
      item.resolutionStatus = status;
      return true;
    }
    return false;
  }

  private seedMockErrorLogs() {
    const mockLogs: Partial<ServerSideErrorLog>[] = [
      {
        errorId: "ERR-20260728-001245",
        endpoint: "/api/search",
        httpMethod: "POST",
        internalCategory: "POSTGREST_RESOURCE_MISSING",
        fullException: '{"code":"PGRST205","message":"relation public.patent_search does not exist"}',
        postgrestErrorCode: "PGRST205",
        sqlError: "SELECT * FROM public.patent_search",
        stackTrace: "Error: relation public.patent_search does not exist\n    at createClient (/lib/supabase/server.ts:45)",
        severity: "FAILURE",
        resolutionStatus: "UNRESOLVED",
        ipAddress: "192.168.1.104",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      {
        errorId: "ERR-20260728-001122",
        endpoint: "/api/patents/secure-data",
        httpMethod: "GET",
        internalCategory: "PG_INSUFFICIENT_PRIVILEGE",
        fullException: '{"code":"42501","message":"permission denied for table patent_analytics"}',
        postgrestErrorCode: null,
        sqlError: "SELECT * FROM patent_analytics WHERE user_id = 'usr_123'",
        stackTrace: "Error: permission denied\n    at RepositoryLayer.execute (/lib/repository/RepositoryLayer.ts:32)",
        severity: "CRITICAL",
        resolutionStatus: "INVESTIGATING",
        ipAddress: "185.220.101.5",
        userAgent: "Python-urllib/3.9",
      },
    ];

    const now = Date.now();
    mockLogs.forEach((l, idx) => {
      this.getStore().push({
        errorId: l.errorId || `ERR-MOCK-${idx}`,
        timestamp: new Date(now - idx * 3600 * 1000).toISOString(),
        userId: null,
        email: null,
        ipAddress: l.ipAddress || "127.0.0.1",
        endpoint: l.endpoint || "/api/unknown",
        httpMethod: l.httpMethod || "POST",
        requestId: `req_mock_${idx}`,
        fullException: l.fullException || "Mock exception",
        stackTrace: l.stackTrace || null,
        sqlError: l.sqlError || null,
        postgrestErrorCode: l.postgrestErrorCode || null,
        userAgent: l.userAgent || "MockUserAgent",
        internalCategory: l.internalCategory || "GENERAL",
        severity: l.severity || "FAILURE",
        resolutionStatus: l.resolutionStatus || "UNRESOLVED",
      });
    });
  }
}
