export interface MappedErrorResult {
  clientMessage: string;
  statusCode: number;
  internalCategory: string;
  isSecurityRelevant: boolean;
}

/**
 * ErrorMappingService
 * 
 * Maps internal database, PostgREST, network, and validation errors to generic business errors.
 * Never exposes the original error to external clients.
 */
export class ErrorMappingService {
  /**
   * Classify and map an arbitrary exception or error object into a generic client response.
   */
  static mapError(error: unknown): MappedErrorResult {
    if (!error) {
      return {
        clientMessage: "An unexpected error occurred.",
        statusCode: 500,
        internalCategory: "UNKNOWN",
        isSecurityRelevant: false,
      };
    }

    const errObj = typeof error === "object" ? (error as Record<string, any>) : {};
    const errCode = String(errObj.code || errObj.status || errObj.statusCode || "").toUpperCase();
    const errMsg = String(errObj.message || errObj.detail || errObj.error_description || error || "").toLowerCase();
    const errName = String(errObj.name || "").toLowerCase();

    // 1. PostgREST Error Codes
    if (errCode.startsWith("PGRST")) {
      switch (errCode) {
        case "PGRST205":
        case "PGRST204":
        case "PGRST116":
          return {
            clientMessage: "Resource unavailable.",
            statusCode: 404,
            internalCategory: "POSTGREST_RESOURCE_MISSING",
            isSecurityRelevant: false,
          };
        case "PGRST301":
        case "PGRST302":
          return {
            clientMessage: "Invalid authentication credentials.",
            statusCode: 401,
            internalCategory: "POSTGREST_AUTH_FAIL",
            isSecurityRelevant: true,
          };
        default:
          return {
            clientMessage: "Unable to process your request. Please try again later.",
            statusCode: 500,
            internalCategory: `POSTGREST_${errCode}`,
            isSecurityRelevant: false,
          };
      }
    }

    // 2. PostgreSQL Error Codes
    switch (errCode) {
      case "42501": // INSUFFICIENT_PRIVILEGE / RLS violation
        return {
          clientMessage: "Access denied.",
          statusCode: 403,
          internalCategory: "PG_INSUFFICIENT_PRIVILEGE",
          isSecurityRelevant: true,
        };
      case "42P01": // UNDEFINED_TABLE
      case "42703": // UNDEFINED_COLUMN
        return {
          clientMessage: "Resource unavailable.",
          statusCode: 404,
          internalCategory: "PG_SCHEMA_MISSING",
          isSecurityRelevant: false,
        };
      case "23505": // UNIQUE_VIOLATION
        return {
          clientMessage: "Duplicate record.",
          statusCode: 409,
          internalCategory: "PG_UNIQUE_VIOLATION",
          isSecurityRelevant: false,
        };
      case "23503": // FOREIGN_KEY_VIOLATION
        return {
          clientMessage: "Associated resource not found or cannot be modified.",
          statusCode: 400,
          internalCategory: "PG_FOREIGN_KEY_VIOLATION",
          isSecurityRelevant: false,
        };
      case "22P02": // INVALID_TEXT_REPRESENTATION (e.g. invalid uuid)
        return {
          clientMessage: "Invalid identifier or format provided.",
          statusCode: 400,
          internalCategory: "PG_INVALID_FORMAT",
          isSecurityRelevant: false,
        };
      case "57014": // QUERY_CANCELED
        return {
          clientMessage: "Request timed out while processing. Please try again.",
          statusCode: 504,
          internalCategory: "PG_QUERY_TIMEOUT",
          isSecurityRelevant: false,
        };
    }

    // 3. Network and Timeout Errors
    if (
      errMsg.includes("timeout") ||
      errMsg.includes("econnrefused") ||
      errMsg.includes("etimedout") ||
      errMsg.includes("network error") ||
      errMsg.includes("fetch failed") ||
      errCode === "ETIMEDOUT" ||
      errCode === "ECONNREFUSED" ||
      errCode === "ECONNRESET" ||
      errCode === "504"
    ) {
      return {
        clientMessage: "Service temporarily unavailable.",
        statusCode: 503,
        internalCategory: "NETWORK_TIMEOUT_OR_UNAVAILABLE",
        isSecurityRelevant: false,
      };
    }

    // 4. Validation / Formatting / Syntax Errors
    if (
      errName.includes("zoderror") ||
      errName.includes("validationerror") ||
      errName.includes("syntaxerror") ||
      errMsg.includes("invalid json") ||
      errMsg.includes("validation failed") ||
      errCode === "400"
    ) {
      return {
        clientMessage: "Invalid request parameters provided.",
        statusCode: 400,
        internalCategory: "INPUT_VALIDATION_ERROR",
        isSecurityRelevant: false,
      };
    }

    // 5. Authentication / Authorization Errors
    if (
      errMsg.includes("jwt") ||
      errMsg.includes("unauthorized") ||
      errMsg.includes("not authenticated") ||
      errMsg.includes("invalid token") ||
      errCode === "401"
    ) {
      return {
        clientMessage: "Authentication required or credentials invalid.",
        statusCode: 401,
        internalCategory: "AUTH_INVALID_TOKEN",
        isSecurityRelevant: true,
      };
    }

    if (
      errMsg.includes("forbidden") ||
      errMsg.includes("access denied") ||
      errMsg.includes("permission denied") ||
      errCode === "403"
    ) {
      return {
        clientMessage: "Access denied.",
        statusCode: 403,
        internalCategory: "AUTH_FORBIDDEN",
        isSecurityRelevant: true,
      };
    }

    // 6. Rate Limiting / Lockout Errors
    if (
      errMsg.includes("too many requests") ||
      errMsg.includes("rate limit") ||
      errMsg.includes("locked") ||
      errCode === "429"
    ) {
      return {
        clientMessage: String(errObj.message || "Too many requests. Please try again later."),
        statusCode: 429,
        internalCategory: "RATE_LIMIT_EXCEEDED",
        isSecurityRelevant: true,
      };
    }

    // 7. Check for general database table/schema/query leakage in strings
    if (
      errMsg.includes("relation") ||
      errMsg.includes("public.") ||
      errMsg.includes("select ") ||
      errMsg.includes("insert ") ||
      errMsg.includes("update ") ||
      errMsg.includes("delete ") ||
      errMsg.includes("supabase") ||
      errMsg.includes("postgres") ||
      errMsg.includes("postgrest")
    ) {
      return {
        clientMessage: "Unable to process your request. Please try again later.",
        statusCode: 500,
        internalCategory: "DATABASE_INTERNAL_EXCEPTION",
        isSecurityRelevant: true,
      };
    }

    // Default Fallback: Clean generic business error
    return {
      clientMessage: "Unable to process your request. Please try again later.",
      statusCode: Number(errObj.status || errObj.statusCode) >= 400 && Number(errObj.status || errObj.statusCode) <= 599 ? Number(errObj.status || errObj.statusCode) : 500,
      internalCategory: "GENERAL_UNEXPECTED_EXCEPTION",
      isSecurityRelevant: false,
    };
  }
}
