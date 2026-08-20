import { CORSConfig, DEFAULT_CORS_CONFIG } from "./types";

/**
 * CORSOptionsService
 * 
 * Enterprise CORS hardening and OPTIONS preflight validation engine.
 * 1. Generates secure CORS response headers based on trusted allow lists.
 * 2. Validates OPTIONS preflight requests, verifying Access-Control-Request-Method and Access-Control-Request-Headers.
 * 3. Rejects unauthorized methods or prohibited headers with CORS failure errors.
 */
export class CORSOptionsService {
  /**
   * Generate secure CORS HTTP headers for an authorized origin.
   */
  static getCORSHeaders(origin: string = "https://moat.ai", config: CORSConfig = DEFAULT_CORS_CONFIG): Record<string, string> {
    const isAllowed = config.allowedOrigins.includes(origin) ? origin : config.allowedOrigins[0];

    return {
      "Access-Control-Allow-Origin": isAllowed,
      "Access-Control-Allow-Methods": config.allowedMethods.join(", "),
      "Access-Control-Allow-Headers": config.allowedHeaders.join(", "),
      "Access-Control-Allow-Credentials": String(config.allowCredentials),
      "Access-Control-Max-Age": String(config.maxAge),
      "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
    };
  }

  /**
   * Validate an OPTIONS preflight request against strict CORS allow lists.
   */
  static validatePreflight(
    originHeader: string | null | undefined,
    requestMethod: string | null | undefined,
    requestHeaders: string | null | undefined,
    config: CORSConfig = DEFAULT_CORS_CONFIG
  ): { allowed: boolean; corsHeaders: Record<string, string>; reason?: string; errorType?: "CORS_ORIGIN_BLOCKED" | "CORS_METHOD_BLOCKED" | "CORS_HEADER_BLOCKED" } {
    const origin = originHeader || "";
    if (!origin || !config.allowedOrigins.includes(origin.toLowerCase())) {
      return {
        allowed: false,
        corsHeaders: {},
        reason: `Preflight CORS Violation: Origin '${origin}' is not in the trusted allow list.`,
        errorType: "CORS_ORIGIN_BLOCKED"
      };
    }

    const corsHeaders = this.getCORSHeaders(origin, config);

    if (requestMethod && !config.allowedMethods.includes(requestMethod.toUpperCase())) {
      return {
        allowed: false,
        corsHeaders: {},
        reason: `Preflight CORS Violation: Method '${requestMethod}' is not permitted by CORS policy. Allowed methods: [${config.allowedMethods.join(", ")}].`,
        errorType: "CORS_METHOD_BLOCKED"
      };
    }

    if (requestHeaders) {
      const requestedList = requestHeaders.split(",").map((h) => h.trim().toLowerCase());
      const allowedLower = config.allowedHeaders.map((h) => h.toLowerCase());

      for (const reqH of requestedList) {
        if (!allowedLower.includes(reqH)) {
          return {
            allowed: false,
            corsHeaders: {},
            reason: `Preflight CORS Violation: Header '${reqH}' is prohibited by CORS policy.`,
            errorType: "CORS_HEADER_BLOCKED"
          };
        }
      }
    }

    return { allowed: true, corsHeaders };
  }
}
