import { NextRequest, NextResponse } from "next/server";
import { ErrorMappingService } from "./ErrorMappingService";
import { ErrorResponseBuilder } from "./ErrorResponseBuilder";
import { SecurityLoggingService } from "../security/SecurityLoggingService";
import { headers } from "next/headers";

const securityLoggingService = new SecurityLoggingService();

/**
 * GlobalExceptionHandler
 * 
 * Centralized exception handling layer for all MOAT Patent Intelligence Platform API routes.
 * Intercepts all errors, logs full technical telemetry server-side with a unique Error ID,
 * and returns standardized, sanitized generic responses to clients.
 */
export class GlobalExceptionHandler {
  /**
   * Generate a unique enterprise Error ID (Format: ERR-YYYYMMDD-XXXXXX).
   */
  static generateErrorId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    return `ERR-${dateStr}-${randomSuffix}`;
  }

  /**
   * Core exception processing method. Can be called inside try/catch blocks of API handlers.
   */
  static async handle(error: unknown, req?: Request | NextRequest, overrideMessage?: string): Promise<NextResponse> {
    const errorId = GlobalExceptionHandler.generateErrorId();
    const mapped = ErrorMappingService.mapError(error);

    let endpoint = "/api/unknown";
    let httpMethod = "POST";
    let ipAddress = "Unknown";
    let userAgent = "Unknown";

    if (req) {
      try {
        endpoint = new URL(req.url).pathname;
        httpMethod = req.method || "GET";
        ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
        userAgent = req.headers.get("user-agent") || "Unknown";
      } catch {
        // Ignore URL parsing errors
      }
    } else {
      try {
        const hdrs = await headers();
        ipAddress = hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || "127.0.0.1";
        userAgent = hdrs.get("user-agent") || "Unknown";
      } catch {
        // Fallback silently if headers() cannot be called outside request scope
      }
    }

    // Server-Side Technical Logging
    await securityLoggingService.logException({
      errorId,
      endpoint,
      httpMethod,
      ipAddress,
      userAgent,
      error,
      internalCategory: mapped.internalCategory,
      severity: mapped.isSecurityRelevant ? "CRITICAL" : (mapped.statusCode >= 500 ? "FAILURE" : "WARNING"),
    });

    // Client Response Sanitization
    const clientMsg = overrideMessage || mapped.clientMessage;
    return ErrorResponseBuilder.error(clientMsg, errorId, mapped.statusCode);
  }

  /**
   * Higher-order function wrapper for API route handlers.
   * Automatically catches all exceptions and routes them through the centralized handler.
   */
  static withErrorHandling(
    handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
  ): (req: NextRequest, ...args: any[]) => Promise<NextResponse> {
    return async (req: NextRequest, ...args: any[]) => {
      try {
        return await handler(req, ...args);
      } catch (err) {
        return await GlobalExceptionHandler.handle(err, req);
      }
    };
  }
}
