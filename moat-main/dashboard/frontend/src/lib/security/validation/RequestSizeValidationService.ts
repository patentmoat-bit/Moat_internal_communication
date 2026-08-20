/**
 * RequestSizeValidationService
 * 
 * Enterprise-grade Request Size Limit and Denial-of-Service defense for MOAT Patent Intelligence Platform.
 * Enforces strict bounds on all data ingestion endpoints:
 * 1. JSON requests: 1 MB threshold.
 * 2. File uploads: configurable (default 10 MB).
 * 3. Search payloads: 50 KB threshold.
 * 4. Comments: 5 KB threshold.
 * 5. Rejects oversized requests immediately with HTTP 413 (Payload Too Large).
 */

export class RequestSizeException extends Error {
  public code: string;
  public statusCode: number;
  public actualBytes: number;
  public limitBytes: number;

  constructor(message: string, actualBytes: number, limitBytes: number, code: string = "PAYLOAD_TOO_LARGE", statusCode: number = 413) {
    super(message);
    this.name = "RequestSizeException";
    this.code = code;
    this.statusCode = statusCode;
    this.actualBytes = actualBytes;
    this.limitBytes = limitBytes;
  }
}

export type PayloadSizeCategory = "json" | "file" | "search" | "comment" | "trademark" | "export" | number;

export class RequestSizeValidationService {
  // 1. JSON requests: 1 MB
  public static readonly JSON_LIMIT_BYTES = 1 * 1024 * 1024; // 1,048,576 bytes

  // 2. File uploads: configurable (default 10 MB)
  public static readonly FILE_UPLOAD_DEFAULT_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

  // 3. Search payloads: 50 KB
  public static readonly SEARCH_PAYLOAD_LIMIT_BYTES = 50 * 1024; // 51,200 bytes

  // 4. Comments: 5 KB
  public static readonly COMMENT_PAYLOAD_LIMIT_BYTES = 5 * 1024; // 5,120 bytes

  // 5. Trademark payloads: 100 KB
  public static readonly TRADEMARK_PAYLOAD_LIMIT_BYTES = 100 * 1024; // 102,400 bytes

  // 6. Bulk Export payloads: 500 KB
  public static readonly BULK_EXPORT_LIMIT_BYTES = 500 * 1024; // 512,000 bytes

  /**
   * Resolve category name or byte limit number to exact byte threshold.
   */
  static getLimitBytes(categoryOrLimit: PayloadSizeCategory, customFileLimit?: number): number {
    if (typeof categoryOrLimit === "number") {
      return categoryOrLimit;
    }

    switch (categoryOrLimit.toLowerCase()) {
      case "json":
        return this.JSON_LIMIT_BYTES;
      case "file":
        return customFileLimit || this.FILE_UPLOAD_DEFAULT_BYTES;
      case "search":
        return this.SEARCH_PAYLOAD_LIMIT_BYTES;
      case "comment":
        return this.COMMENT_PAYLOAD_LIMIT_BYTES;
      case "trademark":
        return this.TRADEMARK_PAYLOAD_LIMIT_BYTES;
      case "export":
        return this.BULK_EXPORT_LIMIT_BYTES;
      default:
        return this.JSON_LIMIT_BYTES;
    }
  }

  /**
   * 1. Assert Request / Payload Size Limit.
   * Calculates actual byte size of input string, buffer, or object and throws HTTP 413 exception if limit is exceeded.
   */
  static assertPayloadSize(payload: any, categoryOrLimit: PayloadSizeCategory = "json", customName = "Request payload", customFileLimit?: number): number {
    if (payload === null || payload === undefined) return 0;

    let actualBytes = 0;
    if (typeof payload === "number") {
      actualBytes = payload; // Can pass Content-Length integer directly
    } else if (typeof payload === "string") {
      actualBytes = Buffer.byteLength(payload, "utf8");
    } else if (Buffer.isBuffer(payload)) {
      actualBytes = payload.length;
    } else if (typeof payload === "object") {
      try {
        actualBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
      } catch (err) {
        throw new RequestSizeException(`Unable to calculate byte size for malformed circular object in ${customName}.`, 0, 0, "INVALID_PAYLOAD_STRUCTURE", 400);
      }
    }

    const limitBytes = this.getLimitBytes(categoryOrLimit, customFileLimit);

    if (actualBytes > limitBytes) {
      const limitFormatted = limitBytes >= 1024 * 1024
        ? `${Math.round((limitBytes / (1024 * 1024)) * 10) / 10} MB`
        : `${Math.round((limitBytes / 1024) * 10) / 10} KB`;
      const actualFormatted = actualBytes >= 1024 * 1024
        ? `${Math.round((actualBytes / (1024 * 1024)) * 10) / 10} MB`
        : `${Math.round((actualBytes / 1024) * 10) / 10} KB`;

      throw new RequestSizeException(
        `${customName} size (${actualFormatted} / ${actualBytes} bytes) exceeds maximum permitted limit of ${limitFormatted} (${limitBytes} bytes).`,
        actualBytes,
        limitBytes,
        "PAYLOAD_TOO_LARGE",
        413
      );
    }

    return actualBytes;
  }

  /**
   * 2. Assert Individual Field Sizes within a JSON Object.
   * Useful when an API endpoint accepts a compound JSON body (e.g., <= 1MB total) but specific fields like 'commentText' must not exceed 5 KB or 'searchQuery' must not exceed 50 KB.
   */
  static assertFieldSizes(payload: Record<string, any>, fieldLimits: Record<string, PayloadSizeCategory>): void {
    if (!payload || typeof payload !== "object") return;

    for (const [fieldName, categoryOrLimit] of Object.entries(fieldLimits)) {
      if (payload[fieldName] !== undefined && payload[fieldName] !== null) {
        this.assertPayloadSize(payload[fieldName], categoryOrLimit, `Field '${fieldName}'`);
      }
    }
  }
}
