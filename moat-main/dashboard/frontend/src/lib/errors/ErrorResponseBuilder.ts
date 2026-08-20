import { NextResponse } from "next/server";

export interface StandardSuccessResponse<T = any> {
  success: true;
  message?: string;
  data: T;
  [key: string]: any;
}

export interface StandardErrorResponse {
  success: false;
  message: string;
  errorId?: string;
  errors?: Array<{ field: string; message: string }>;
  validationErrors?: Array<{ field: string; message: string }>;
  [key: string]: any;
}

/**
 * ErrorResponseBuilder
 * 
 * Standardizes API responses across the entire MOAT Patent Intelligence Platform.
 * Prevents information disclosure by ensuring no stack traces, database schema names,
 * SQL statements, or PostgREST error codes ever leak to the client.
 */
export class ErrorResponseBuilder {
  /**
   * Build a standardized success API response (Phase 10).
   */
  static success<T>(data: T, message: string = "Operation completed successfully.", status: number = 200, extra: Record<string, any> = {}): NextResponse {
    const payload: StandardSuccessResponse<T> = {
      success: true,
      message,
      data,
      ...extra,
    };
    return NextResponse.json(payload, { status });
  }

  /**
   * Build a standardized validation failure API response (Phase 10).
   * Strictly formats errors as [{ field, message }] without stack traces or internal validation details.
   */
  static validationFailure(
    errors: Array<{ field: string; message: string }>,
    message: string = "Validation failed.",
    errorId?: string,
    status: number = 400
  ): NextResponse<StandardErrorResponse> {
    const payload: StandardErrorResponse = {
      success: false,
      message,
      errors,
      validationErrors: errors, // Alias for backward compatibility
    };
    if (errorId) {
      payload.errorId = errorId;
    }
    return NextResponse.json(payload, { status });
  }

  /**
   * Build a standardized generic failure API response.
   * Strictly sanitizes the response payload to ensure zero technical disclosure.
   */
  static error(message: string, errorId: string, status: number = 500, extra: Record<string, any> = {}): NextResponse<StandardErrorResponse> {
    // Perform safety sanitization on the message just in case
    const sanitizedMessage = ErrorResponseBuilder.sanitizeMessage(message);

    const payload: StandardErrorResponse = {
      success: false,
      message: sanitizedMessage,
      errorId,
      ...extra,
    };
    if (extra.validationErrors && !payload.errors) {
      payload.errors = extra.validationErrors;
    }
    if (extra.errors && !payload.validationErrors) {
      payload.validationErrors = extra.errors;
    }
    return NextResponse.json(payload, { status });
  }

  /**
   * Safety check: Strip out any accidental leakage of table names, schema names,
   * SQL fragments, stack traces, or PostgREST error codes from user-facing messages.
   */
  private static sanitizeMessage(msg: string): string {
    if (!msg || typeof msg !== "string") {
      return "An unexpected error occurred.";
    }

    // Check for PostgREST / Supabase / Postgres patterns
    const forbiddenPatterns = [
      /public\.[a-zA-Z0-9_]+/i,       // schema names e.g. public.patent_search
      /PGRST[0-9]+/i,                 // PostgREST error codes e.g. PGRST205
      /syntax error/i,                // SQL syntax errors
      /relation "[^"]+" does not exist/i,
      /column "[^"]+" does not exist/i,
      /violates [a-z0-9_]+ constraint/i,
      /duplicate key value violates/i,
      /at [a-zA-Z0-9_$.]+ \(/i,       // Stack trace lines e.g. at Object.POST (
      /lib\/supabase\//i,             // Internal file path hints
      /node_modules/i,                // Node modules paths
      /SELECT .* FROM/i,              // SQL queries
      /INSERT INTO/i,
      /UPDATE .* SET/i,
      /DELETE FROM/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(msg)) {
        return "Unable to process your request. Please try again later.";
      }
    }

    return msg;
  }
}
