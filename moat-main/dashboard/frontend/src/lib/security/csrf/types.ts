/**
 * MOAT Enterprise CSRF Protection & CORS Hardening Types
 * 
 * Defines type contracts, CORS allow lists, token structures, cookie security flags,
 * preflight validation parameters, and audit event records.
 */

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
}

export const DEFAULT_CORS_CONFIG: CORSConfig = {
  allowedOrigins: [
    "https://moat.ai",
    "https://app.moat.ai",
    "https://admin.moat.ai",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-XSRF-Token",
    "X-Requested-With",
    "Accept",
    "Origin",
    "User-Agent",
    "x-test-user-id",
    "x-test-user-role",
    "x-test-user-active"
  ],
  allowCredentials: true,
  maxAge: 86400 // 24 hours in seconds
};

export interface CSRFTokenRecord {
  token: string;
  userId: string;
  sessionId?: string;
  expiresAt: string;
  createdAt: string;
}

export interface CSRFCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
}

export type CSRFCORSViolationType =
  | "CSRF_TOKEN_MISSING"
  | "CSRF_TOKEN_INVALID"
  | "CSRF_TOKEN_EXPIRED"
  | "ORIGIN_MISMATCH"
  | "ORIGIN_MISSING_ON_STATE_CHANGE"
  | "CORS_ORIGIN_BLOCKED"
  | "CORS_METHOD_BLOCKED"
  | "CORS_HEADER_BLOCKED"
  | "PREFLIGHT_FAILED";

export interface CSRFCORSValidationResult {
  allowed: boolean;
  reason?: string;
  violationType?: CSRFCORSViolationType;
  corsHeaders: Record<string, string>;
  auditLogId?: string;
}

export interface CORSAuditRecord {
  id: string;
  timestamp: string;
  ipAddress: string;
  origin?: string;
  referer?: string;
  endpoint: string;
  httpMethod: string;
  violationType: CSRFCORSViolationType | "VALID_REQUEST" | "VALID_PREFLIGHT";
  details: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  userId?: string;
}
