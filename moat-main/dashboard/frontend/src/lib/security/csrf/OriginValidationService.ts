import { CORSConfig, DEFAULT_CORS_CONFIG } from "./types";

/**
 * OriginValidationService
 * 
 * Enterprise origin and referer header inspection service.
 * 1. Strictly validates Origin and Referer headers against trusted domain allow lists.
 * 2. Prevents Cross-Site Request Forgery (CSRF) and Cross-Origin Data Theft by rejecting unknown or spoofed origins.
 */
export class OriginValidationService {
  /**
   * Validate incoming Origin or Referer header against allowed CORS origins.
   */
  static validateOrigin(
    originHeader: string | null | undefined,
    refererHeader: string | null | undefined,
    httpMethod: string,
    config: CORSConfig = DEFAULT_CORS_CONFIG
  ): { allowed: boolean; origin?: string; reason?: string; errorType?: "ORIGIN_MISMATCH" | "ORIGIN_MISSING_ON_STATE_CHANGE" | "CORS_ORIGIN_BLOCKED" } {
    const isStateChanging = httpMethod === "POST" || httpMethod === "PUT" || httpMethod === "PATCH" || httpMethod === "DELETE";

    // If both Origin and Referer are missing
    if (!originHeader && !refererHeader) {
      if (isStateChanging) {
        // Strict OWASP rule: For state-changing API calls from browsers, Origin or Referer must be present
        return {
          allowed: false,
          reason: `Security Violation: Missing both Origin and Referer headers on state-changing '${httpMethod}' request. Possible CSRF or unauthorized script execution blocked.`,
          errorType: "ORIGIN_MISSING_ON_STATE_CHANGE"
        };
      }
      // For GET/HEAD requests without Origin (same-origin navigation or server-to-server API call), allow default origin
      return { allowed: true, origin: config.allowedOrigins[0] };
    }

    let resolvedOrigin = originHeader || "";
    if (!resolvedOrigin && refererHeader) {
      try {
        const url = new URL(refererHeader);
        resolvedOrigin = url.origin;
      } catch (err) {
        return {
          allowed: false,
          reason: `Security Violation: Malformed Referer header URL: '${refererHeader}'.`,
          errorType: "ORIGIN_MISMATCH"
        };
      }
    }

    // Check against allow list
    const isAllowed = config.allowedOrigins.some((allowed) => {
      if (allowed === "*") return true;
      return resolvedOrigin.toLowerCase() === allowed.toLowerCase();
    });

    if (!isAllowed) {
      return {
        allowed: false,
        origin: resolvedOrigin,
        reason: `CORS Policy Violation: Origin '${resolvedOrigin}' is not in the trusted allow list. Unauthorized cross-origin request blocked.`,
        errorType: "CORS_ORIGIN_BLOCKED"
      };
    }

    return { allowed: true, origin: resolvedOrigin };
  }
}
