export type EventSeverity = "Low" | "Medium" | "High" | "Critical";

export type MonitoringCategory =
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "API_SECURITY"
  | "FILE_SECURITY"
  | "EMAIL_NOTIFICATION"
  | "WORKFLOW"
  | "AUDIT_COMPLIANCE"
  | "SUPABASE_HEALTH"
  | "INFRASTRUCTURE";

export interface SystemMonitoringEvent {
  eventId?: string;
  category: MonitoringCategory;
  eventType: string;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  status?: "SUCCESS" | "FAILURE" | "WARNING" | "INFO";
  reason?: string | null;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface SecurityAlertRecord {
  alertId: string;
  alertType: string;
  severity: EventSeverity;
  title: string;
  message: string;
  source: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string | null;
  metadata?: Record<string, any>;
}

export interface SupabaseHealthStatus {
  databaseHealth: "HEALTHY" | "DEGRADED" | "OUTAGE";
  connectionStatus: "CONNECTED" | "DISCONNECTED";
  activeConnections: number;
  queryPerformanceMs: number;
  slowQueriesCount: number;
  storageUsageMb: number;
  storageLimitMb: number;
  storageBucketHealth: "HEALTHY" | "DEGRADED";
  authServiceStatus: "OPERATIONAL" | "DOWN";
  realtimeServiceStatus: "OPERATIONAL" | "DOWN";
  rlsStatus: "ENFORCED" | "DISABLED" | "WARNING";
  backupStatus: "SUCCESS" | "FAILED" | "IN_PROGRESS";
  databaseSizeMb: number;
  tableGrowthPercent: number;
  checkedAt: string;
}

export interface InfrastructureStatus {
  appStatus: "ONLINE" | "DEGRADED" | "MAINTENANCE";
  apiResponseTimeMs: number;
  serverHealth: "HEALTHY" | "OVERLOADED";
  memoryUsageMb: number;
  memoryLimitMb: number;
  cpuUsagePct: number;
  vercelDeploymentStatus: "READY" | "BUILDING" | "ERROR";
  envVariableValidation: "VALID" | "MISSING_KEYS" | "MISCONFIGURED";
  checkedAt: string;
}

export interface DashboardMetricsSummary {
  authentication: {
    successfulLogins: number;
    failedLogins: number;
    lockedAccounts: number;
    mfaFailures: number;
    mfaSuccess: number;
    activeSessions: number;
    passwordResetRequests: number;
    newDeviceLogins: number;
    suspiciousLoginAttempts: number;
  };
  authorization: {
    permissionDenied: number;
    unauthorizedApiAccess: number;
    roleChanges: number;
    privilegeEscalationAttempts: number;
  };
  apiSecurity: {
    totalRequests: number;
    failedRequests: number;
    http401Errors: number;
    http403Errors: number;
    http404Errors: number;
    http429RateLimit: number;
    http500Errors: number;
    validationErrors: number;
    csrfFailures: number;
    corsBlocked: number;
  };
  workflow: {
    pendingApprovals: number;
    workflowErrors: number;
    overdueTasks: number;
    completedProjects: number;
    invalidTransitions: number;
    revisionRequests: number;
    completionRatePct: number;
    avgApprovalTimeHrs: number;
  };
  fileSecurity: {
    fileUploads: number;
    uploadFailures: number;
    unauthorizedDownloads: number;
    invalidFileTypes: number;
    oversizedUploads: number;
    malwareDetected: number;
    fileDeletions: number;
  };
  email: {
    emailsSent: number;
    emailFailures: number;
    notificationQueue: number;
    oauthStatus: "CONNECTED" | "TOKEN_EXPIRED" | "DISCONNECTED";
    msGraphConnectivity: "HEALTHY" | "ERROR";
  };
  supabase: SupabaseHealthStatus;
  infrastructure: InfrastructureStatus;
  audit: {
    auditLogsCount: number;
    securityEventsCount: number;
    adminActivitiesCount: number;
    criticalChangesCount: number;
  };
  alerts: SecurityAlertRecord[];
}
