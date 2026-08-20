import { NextRequest, NextResponse } from "next/server";
import { InjectionProtectionService } from "./InjectionProtectionService";
import { InputSanitizationService } from "./InputSanitizationService";
import { HeaderInjectionProtectionService, HeaderInjectionException } from "./HeaderInjectionProtectionService";
import { RequestSizeValidationService, RequestSizeException, PayloadSizeCategory } from "./RequestSizeValidationService";
import { OutputEncodingService } from "./OutputEncodingService";
import { AllowListValidationService, AllowListException, AllowListCategory } from "./AllowListValidationService";
import { ErrorResponseBuilder, GlobalExceptionHandler } from "../../errors";
import { SecurityLoggingService } from "../SecurityLoggingService";

const securityLoggingService = new SecurityLoggingService();

export interface ValidationOptions {
  maxBodySizeByte?: number;
  payloadSizeCategory?: PayloadSizeCategory;
  fieldSizeLimits?: Record<string, PayloadSizeCategory>;
  encodeResponse?: boolean;
  richTextFields?: string[];
  allowLists?: Record<string, AllowListCategory | string[]>;
  allowedKeys?: string[];
  allowedQueryParams?: string[];
  allowedFileMimeTypes?: string[];
  maxFileSizeByte?: number;
  requireAuthHeader?: boolean;
  schema?: any;
}

export interface ValidatedRequest<T = any> {
  req: NextRequest;
  body?: T;
  query?: Record<string, any>;
  files?: Array<{ name: string; type: string; size: number }>;
}

/**
 * GlobalValidationMiddleware
 * 
 * Centralized, reusable validation middleware layer executing before any protected API route.
 * Enforces strict request size limits, checks for malformed JSON, rejects unexpected attributes,
 * sanitizes against all 15 injection vectors, and returns standardized validation errors.
 */
export class GlobalValidationMiddleware {
  private static readonly DEFAULT_MAX_JSON_SIZE = 1 * 1024 * 1024; // 1 MB
  private static readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  private static readonly DEFAULT_ALLOWED_MIMES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/json",
    "text/csv",
  ];

  /**
   * Validate request headers (e.g., check for CRLF / log injection and content-length bounds).
   */
  static validateHeaders(req: NextRequest, options: ValidationOptions = {}): { isValid: boolean; errorResponse?: NextResponse } {
    const errorId = GlobalExceptionHandler.generateErrorId();

    // 1. Check Content-Length size bound
    const contentLengthStr = req.headers.get("content-length");
    if (contentLengthStr) {
      const contentLength = parseInt(contentLengthStr, 10);
      const isFileUpload = (req.headers.get("content-type") || "").includes("multipart/form-data");
      const category = options.payloadSizeCategory || (isFileUpload ? "file" : "json");
      try {
        RequestSizeValidationService.assertPayloadSize(contentLength, category, "Request Content-Length", options.maxFileSizeByte || options.maxBodySizeByte);
      } catch (err: any) {
        if (err instanceof RequestSizeException) {
          securityLoggingService.logException({
            errorId,
            endpoint: req.nextUrl?.pathname || "/api/unknown",
            httpMethod: req.method,
            ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
            userAgent: req.headers.get("user-agent") || "Unknown",
            internalCategory: "PAYLOAD_TOO_LARGE",
            fullException: `Content-Length (${contentLength} bytes) exceeds limit for category "${category}": ${err.message}`,
            severity: "WARNING",
          });
          return {
            isValid: false,
            errorResponse: ErrorResponseBuilder.error(err.message, errorId, 413),
          };
        }
        throw err;
      }
    }

    // 2. Phase 6: Enforce strict HTTP Header Injection Protection (CRLF, invalid names, duplicate dangerous headers, oversized values)
    try {
      HeaderInjectionProtectionService.validateIncomingHeaders(req.headers);
    } catch (err: any) {
      if (err instanceof HeaderInjectionException) {
        securityLoggingService.logException({
          errorId,
          endpoint: req.nextUrl?.pathname || "/api/unknown",
          httpMethod: req.method,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "Unknown",
          internalCategory: "HEADER_INJECTION_VIOLATION",
          fullException: `HTTP header security violation [${err.code}]: ${err.message}`,
          severity: "CRITICAL",
        });
        return {
          isValid: false,
          errorResponse: ErrorResponseBuilder.error(`HTTP Header Security Violation: ${err.message}`, errorId, 400),
        };
      }
      throw err;
    }

    // 3. Check for Header / Log / CRLF Injection in custom headers
    for (const [key, value] of req.headers.entries()) {
      if (key.startsWith("x-") || key === "referer" || key === "user-agent") {
        const check = InjectionProtectionService.inspectString(value, "header");
        if (!check.isClean) {
          securityLoggingService.logException({
            errorId,
            endpoint: req.nextUrl?.pathname || "/api/unknown",
            httpMethod: req.method,
            ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
            userAgent: req.headers.get("user-agent") || "Unknown",
            internalCategory: "HEADER_INJECTION_VIOLATION",
            fullException: `Header "${key}" failed security validation: ${check.details}`,
            severity: "CRITICAL",
          });
          return {
            isValid: false,
            errorResponse: ErrorResponseBuilder.error("Invalid or malformed HTTP header detected.", errorId, 400),
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Validate URL search query parameters against HPP, Prototype Pollution, and Injections.
   */
  static validateQueryParams(req: NextRequest, options: ValidationOptions = {}): {
    isValid: boolean;
    normalized?: Record<string, any>;
    errorResponse?: NextResponse;
  } {
    const errorId = GlobalExceptionHandler.generateErrorId();
    const searchParams = req.nextUrl.searchParams;

    // Check query parameter allow-list if defined
    if (options.allowedQueryParams) {
      const allowedSet = new Set(options.allowedQueryParams);
      for (const key of searchParams.keys()) {
        if (!allowedSet.has(key) && !allowedSet.has("*")) {
          return {
            isValid: false,
            errorResponse: ErrorResponseBuilder.error(`Unexpected query parameter provided: "${key}".`, errorId, 400),
          };
        }
      }
    }

    // Run HPP and Injection detection
    const hppCheck = InjectionProtectionService.normaliseQueryParams(searchParams, new Set(options.allowedQueryParams || ["searchModes", "filters", "ids", "tags"]));
    if (!hppCheck.isClean) {
      securityLoggingService.logException({
        errorId,
        endpoint: req.nextUrl?.pathname || "/api/unknown",
        httpMethod: req.method,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "Unknown",
        internalCategory: `QUERY_${hppCheck.violationType}`,
        fullException: `Query parameter validation failed: ${hppCheck.details}`,
        severity: "WARNING",
      });
      return {
        isValid: false,
        errorResponse: ErrorResponseBuilder.error("Invalid or suspicious query parameter format.", errorId, 400),
      };
    }

    return { isValid: true, normalized: hppCheck.normalized };
  }

  /**
   * Validate JSON request body: Parse safely, reject malformed JSON, enforce size bounds, check allow-lists, and inspect for injections.
   */
  static async validateJsonBody<T = any>(req: NextRequest, options: ValidationOptions = {}): Promise<{
    isValid: boolean;
    body?: T;
    errorResponse?: NextResponse;
  }> {
    const errorId = GlobalExceptionHandler.generateErrorId();
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return { isValid: true, body: undefined }; // Not a JSON request
    }

    // 1. Check raw text size and parse JSON safely
    let rawText = "";
    try {
      rawText = await req.text();
    } catch (err: any) {
      return {
        isValid: false,
        errorResponse: ErrorResponseBuilder.error("Failed to read request stream.", errorId, 400),
      };
    }

    const category = options.payloadSizeCategory || "json";
    try {
      RequestSizeValidationService.assertPayloadSize(rawText, category, "Request body payload", options.maxBodySizeByte);
    } catch (err: any) {
      if (err instanceof RequestSizeException) {
        return {
          isValid: false,
          errorResponse: ErrorResponseBuilder.error(err.message, errorId, 413),
        };
      }
      throw err;
    }

    if (!rawText || rawText.trim() === "") {
      return { isValid: true, body: {} as T };
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawText);
    } catch (err: any) {
      securityLoggingService.logException({
        errorId,
        endpoint: req.nextUrl?.pathname || "/api/unknown",
        httpMethod: req.method,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "Unknown",
        internalCategory: "MALFORMED_JSON_VIOLATION",
        fullException: `JSON parsing syntax error: ${err.message}`,
        severity: "WARNING",
      });
      return {
        isValid: false,
        errorResponse: ErrorResponseBuilder.error("Malformed JSON payload provided.", errorId, 400),
      };
    }

    if (typeof parsedBody !== "object" || parsedBody === null) {
      return {
        isValid: false,
        errorResponse: ErrorResponseBuilder.error("Request payload must be a JSON object.", errorId, 400),
      };
    }

    // 2. Enforce attribute allow-list (Reject unexpected fields)
    if (options.allowedKeys && !Array.isArray(parsedBody)) {
      const allowedSet = new Set(options.allowedKeys);
      for (const key of Object.keys(parsedBody)) {
        if (!allowedSet.has(key)) {
          return {
            isValid: false,
            errorResponse: ErrorResponseBuilder.error(`Unexpected or unauthorized attribute in request payload: "${key}".`, errorId, 400),
          };
        }
      }
    }

    // 3. Inspect payload against 15 Injection vectors & Prototype Pollution
    const inspectRes = InjectionProtectionService.inspectPayload(parsedBody);
    if (!inspectRes.isClean) {
      securityLoggingService.logException({
        errorId,
        endpoint: req.nextUrl?.pathname || "/api/unknown",
        httpMethod: req.method,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "Unknown",
        internalCategory: `PAYLOAD_${inspectRes.violationType}`,
        fullException: `Payload security inspection failed: ${inspectRes.details}`,
        severity: "CRITICAL",
      });
      return {
        isValid: false,
        errorResponse: ErrorResponseBuilder.error("Request payload rejected by security inspection.", errorId, 422),
      };
    }

    // 4. Input Sanitization (Phase 3: Context-aware cleansing of Text, Rich Text, Comments, Search Queries, Email, Filenames)
    const sanitizedPayload = InputSanitizationService.sanitizePayload(inspectRes.sanitizedValue);

    // Validate individual field size limits if configured (Phase 8)
    if (options.fieldSizeLimits) {
      try {
        RequestSizeValidationService.assertFieldSizes(sanitizedPayload, options.fieldSizeLimits);
      } catch (err: any) {
        if (err instanceof RequestSizeException) {
          securityLoggingService.logValidationFailure({
            endpoint: req.nextUrl?.pathname || "/api/unknown",
            ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
            userAgent: req.headers.get("user-agent") || "Unknown",
            category: "SIZE_VIOLATION",
            validationErrors: [{ field: "payload", message: err.message }],
            severity: "WARNING",
          });
          return {
            isValid: false,
            errorResponse: ErrorResponseBuilder.error(err.message, errorId, 413),
          };
        }
        throw err;
      }
    }

    // Validate allow-lists if configured (Phase 9)
    if (options.allowLists) {
      try {
        for (const [fieldName, categoryOrList] of Object.entries(options.allowLists)) {
          const val = sanitizedPayload[fieldName];
          if (val !== undefined && val !== null) {
            if (Array.isArray(val)) {
              AllowListValidationService.assertAllowedArray(val, categoryOrList, fieldName, true);
            } else {
              AllowListValidationService.assertAllowedValue(val, categoryOrList, fieldName, true);
            }
          }
        }
      } catch (err: any) {
        if (err instanceof AllowListException) {
          securityLoggingService.logValidationFailure({
            endpoint: req.nextUrl?.pathname || "/api/unknown",
            ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
            userAgent: req.headers.get("user-agent") || "Unknown",
            category: "ALLOW_LIST_VIOLATION",
            validationErrors: [{ field: typeof err.category === "string" ? err.category : "field", message: err.message, rejectedValue: err.rejectedValue }],
            severity: "WARNING",
          });
          return {
            isValid: false,
            errorResponse: ErrorResponseBuilder.validationFailure(
              [{ field: typeof err.category === "string" ? err.category : "field", message: err.message }],
              "Validation failed.",
              errorId,
              400
            ),
          };
        }
        throw err;
      }
    }

    // Apply Output Encoding if enabled (Phase 7)
    const finalPayload = options.encodeResponse
      ? OutputEncodingService.encodeResponsePayload(sanitizedPayload, new Set(options.richTextFields || []))
      : sanitizedPayload;

    // 5. Schema Validation (if Zod schema is provided in options)
    if (options.schema) {
      const parseRes = options.schema.safeParse(finalPayload);
      if (!parseRes.success) {
        const errors = (parseRes.error?.errors || []).map((err: any) => ({
          field: (err.path || []).join(".") || "payload",
          message: err.message || "Validation failed",
        }));
        const firstMsg = errors[0]?.message || "Payload does not conform to required schema.";
        securityLoggingService.logException({
          errorId,
          endpoint: req.nextUrl?.pathname || "/api/unknown",
          httpMethod: req.method,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "Unknown",
          internalCategory: "SCHEMA_VALIDATION_VIOLATION",
          fullException: `Zod schema validation failed: ${JSON.stringify(errors)}`,
          severity: "WARNING",
        });
        securityLoggingService.logValidationFailure({
          endpoint: req.nextUrl?.pathname || "/api/unknown",
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "Unknown",
          category: "SCHEMA_VIOLATION",
          validationErrors: errors,
          severity: "WARNING",
        });
        return {
          isValid: false,
          errorResponse: ErrorResponseBuilder.validationFailure(
            errors,
            "Validation failed.",
            errorId,
            400
          ),
        };
      }
      return { isValid: true, body: parseRes.data as T };
    }

    return { isValid: true, body: finalPayload as T };
  }

  /**
   * Validate multipart file upload metadata (MIME types, file size bounds, name sanitization).
   */
  static validateUploadedFiles(files: Array<{ name: string; type: string; size: number }>, options: ValidationOptions = {}): {
    isValid: boolean;
    errorResponse?: NextResponse;
  } {
    const errorId = GlobalExceptionHandler.generateErrorId();
    const maxFileSize = options.maxFileSizeByte || GlobalValidationMiddleware.DEFAULT_MAX_FILE_SIZE;
    const allowedMimes = new Set(options.allowedFileMimeTypes || GlobalValidationMiddleware.DEFAULT_ALLOWED_MIMES);

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        return {
          isValid: false,
          errorResponse: ErrorResponseBuilder.error(
            `File "${file.name}" size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum limit of ${Math.round(maxFileSize / 1024 / 1024)}MB.`,
            errorId,
            413
          ),
        };
      }

      // Check MIME type
      if (!allowedMimes.has(file.type)) {
        return {
          isValid: false,
          errorResponse: ErrorResponseBuilder.error(`File type "${file.type}" is not permitted for upload.`, errorId, 415),
        };
      }

      // Check file name against path traversal or command injection
      const nameCheck = InjectionProtectionService.inspectString(file.name);
      if (!nameCheck.isClean || file.name.includes("..") || file.name.includes("/")) {
        return {
          isValid: false,
          errorResponse: ErrorResponseBuilder.error("Invalid or suspicious character sequence in filename.", errorId, 400),
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Complete Pipeline Execution:
   * Wraps an API route handler with global headers, query, and JSON body validation.
   */
  static withValidation(
    handler: (req: NextRequest, validated: ValidatedRequest, ...args: any[]) => Promise<NextResponse>,
    options: ValidationOptions = {}
  ): (req: NextRequest, ...args: any[]) => Promise<NextResponse> {
    return async (req: NextRequest, ...args: any[]) => {
      // 1. Validate Headers
      const hdrRes = GlobalValidationMiddleware.validateHeaders(req, options);
      if (!hdrRes.isValid && hdrRes.errorResponse) return hdrRes.errorResponse;

      // 2. Validate Query Parameters
      const qryRes = GlobalValidationMiddleware.validateQueryParams(req, options);
      if (!qryRes.isValid && qryRes.errorResponse) return qryRes.errorResponse;

      // 3. Validate JSON Body (if applicable)
      const bodyRes = await GlobalValidationMiddleware.validateJsonBody(req, options);
      if (!bodyRes.isValid && bodyRes.errorResponse) return bodyRes.errorResponse;

      const validated: ValidatedRequest = {
        req,
        body: bodyRes.body,
        query: qryRes.normalized,
      };

      try {
        return await handler(req, validated, ...args);
      } catch (err: any) {
        return await GlobalExceptionHandler.handle(err, req);
      }
    };
  }
}
