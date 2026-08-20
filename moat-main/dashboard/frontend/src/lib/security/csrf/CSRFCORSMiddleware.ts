import { CORSConfig, CSRFCORSValidationResult, DEFAULT_CORS_CONFIG } from "./types";
import { OriginValidationService } from "./OriginValidationService";
import { CORSOptionsService } from "./CORSOptionsService";
import { CSRFTokenService } from "./CSRFTokenService";
import { CSRFAuditLogService } from "./CSRFAuditLogService";

export interface CSRFCORSRequestContext {
  endpoint: string;
  httpMethod: string;
  ipAddress: string;
  originHeader?: string | null;
  refererHeader?: string | null;
  csrfTokenHeader?: string | null;
  requestMethodHeader?: string | null;
  requestHeadersHeader?: string | null;
  userId?: string;
  sessionId?: string;
}

/**
 * CSRFCORSMiddleware
 * 
 * Central enterprise zero-trust middleware coordinating Phase 6 security controls:
 * User Request -> Validate Origin -> Validate CORS Policy -> Validate CSRF Token -> Authentication -> Authorization -> Audit Log.
 */
export class CSRFCORSMiddleware {
  /**
   * Execute the zero-trust origin, CORS, and CSRF token validation pipeline.
   */
  static async validateRequest(
    ctx: CSRFCORSRequestContext,
    config: CORSConfig = DEFAULT_CORS_CONFIG
  ): Promise<CSRFCORSValidationResult> {
    const { endpoint, httpMethod, ipAddress, originHeader, refererHeader, csrfTokenHeader, requestMethodHeader, requestHeadersHeader, userId, sessionId } = ctx;

    // Step 1: Handle OPTIONS preflight request
    if (httpMethod.toUpperCase() === "OPTIONS") {
      const preflightRes = CORSOptionsService.validatePreflight(originHeader, requestMethodHeader, requestHeadersHeader, config);
      if (!preflightRes.allowed) {
        const auditLog = await CSRFAuditLogService.logEvent(endpoint, "OPTIONS", ipAddress, preflightRes.errorType || "PREFLIGHT_FAILED", preflightRes.reason!, "WARNING", originHeader || undefined, refererHeader || undefined, userId);
        return { allowed: false, reason: preflightRes.reason, violationType: preflightRes.errorType, corsHeaders: {}, auditLogId: auditLog.id };
      }
      const auditLog = await CSRFAuditLogService.logEvent(endpoint, "OPTIONS", ipAddress, "VALID_PREFLIGHT", `Successful preflight check for method '${requestMethodHeader || "ANY"}' from origin '${originHeader}'.`, "INFO", originHeader || undefined, refererHeader || undefined, userId);
      return { allowed: true, corsHeaders: preflightRes.corsHeaders, auditLogId: auditLog.id };
    }

    // Step 2: Validate Origin and Referer
    const originRes = OriginValidationService.validateOrigin(originHeader, refererHeader, httpMethod, config);
    if (!originRes.allowed) {
      const auditLog = await CSRFAuditLogService.logEvent(endpoint, httpMethod, ipAddress, originRes.errorType || "ORIGIN_MISMATCH", originRes.reason!, "CRITICAL", originHeader || undefined, refererHeader || undefined, userId);
      return { allowed: false, reason: originRes.reason, violationType: originRes.errorType, corsHeaders: {}, auditLogId: auditLog.id };
    }

    // Generate secure CORS headers for allowed origin
    const corsHeaders = CORSOptionsService.getCORSHeaders(originRes.origin || "https://moat.ai", config);

    // Step 3: Validate CSRF Token for state-changing requests
    if (CSRFTokenService.requiresCSRFProtection(httpMethod)) {
      const csrfRes = CSRFTokenService.validateToken(csrfTokenHeader, userId || "anonymous", sessionId || "default_session");
      if (!csrfRes.valid) {
        const auditLog = await CSRFAuditLogService.logEvent(endpoint, httpMethod, ipAddress, csrfRes.errorType || "CSRF_TOKEN_INVALID", csrfRes.reason!, "CRITICAL", originHeader || undefined, refererHeader || undefined, userId);
        return { allowed: false, reason: csrfRes.reason, violationType: csrfRes.errorType, corsHeaders, auditLogId: auditLog.id };
      }
    }

    // Step 4 & 5: Proceed to Authentication & Authorization (Pipeline verification passed)
    const auditLog = await CSRFAuditLogService.logEvent(
      endpoint,
      httpMethod,
      ipAddress,
      "VALID_REQUEST",
      `Successfully validated origin '${originRes.origin || "same-origin"}' and CSRF token (if required) for ${httpMethod} request.`,
      "INFO",
      originHeader || undefined,
      refererHeader || undefined,
      userId
    );

    return { allowed: true, corsHeaders, auditLogId: auditLog.id };
  }
}
