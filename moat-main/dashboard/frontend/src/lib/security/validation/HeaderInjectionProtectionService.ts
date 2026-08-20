/**
 * HeaderInjectionProtectionService
 * 
 * Enterprise-grade HTTP Header Injection (CRLF) and Outgoing Email Header defense for MOAT Patent Intelligence Platform.
 * Enforces zero-trust header processing by:
 * 1. Validating all incoming HTTP headers against CRLF injection, invalid header naming syntax, duplicate dangerous headers, and oversized values.
 * 2. Sanitizing all outgoing email headers (Subject, To, Cc, Bcc, From, Reply-To) to eliminate email header injection and recipient smuggling.
 */

export class HeaderInjectionException extends Error {
  public code: string;
  public detectedHeader?: string;

  constructor(message: string, code: string = "HEADER_INJECTION_DETECTED", detectedHeader?: string) {
    super(message);
    this.name = "HeaderInjectionException";
    this.code = code;
    this.detectedHeader = detectedHeader;
  }
}

export class HeaderInjectionProtectionService {
  // Strict HTTP header name syntax (RFC 7230 / RFC 9110): visible ASCII chars without spaces, colons, or delimiters (max 100 chars)
  private static readonly VALID_HEADER_NAME_REGEX = /^[a-zA-Z0-9_\-\.\$]{1,100}$/;

  // Dangerous CRLF and newline injection characters (\r, \n, %0d, %0a, null byte)
  private static readonly CRLF_REGEX = /(?:\r|\n|%0d|%0a|%0D|%0A|\x00)/;

  // Maximum allowed byte length for a single header value (4KB)
  private static readonly MAX_HEADER_VALUE_LENGTH = 4096;

  // Maximum allowed cumulative byte length for all headers in a single request (8KB)
  private static readonly MAX_TOTAL_HEADERS_LENGTH = 8192;

  // Dangerous headers that should NEVER appear duplicated or with conflicting values (prevents HTTP Request Smuggling / Response Splitting)
  private static readonly DANGEROUS_SINGLETON_HEADERS = new Set([
    "host",
    "content-length",
    "transfer-encoding",
    "authorization",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "content-type",
    "cookie"
  ]);

  /**
   * 1. Validate All Incoming HTTP Headers.
   * Scans Next.js Headers object or raw headers dictionary, enforcing strict bounds and zero CRLF injection.
   */
  static validateIncomingHeaders(headersInput: any): void {
    if (!headersInput) return;

    let totalLength = 0;
    const seenHeaders = new Map<string, string>();

    // Normalize iterable Headers or plain objects
    const entries: Array<[string, any]> = typeof headersInput.entries === "function"
      ? Array.from(headersInput.entries())
      : Object.entries(headersInput);

    for (const [rawName, rawValue] of entries) {
      if (!rawName) continue;
      const name = String(rawName).trim();
      const lowerName = name.toLowerCase();

      // Rule 1: Validate Header Name Syntax
      if (!this.VALID_HEADER_NAME_REGEX.test(name)) {
        throw new HeaderInjectionException(
          `Invalid HTTP header name syntax: '${name}'. Header names must be visible ASCII without spaces or delimiters.`,
          "INVALID_HEADER_NAME",
          name
        );
      }

      // Check for CRLF in header name
      if (this.CRLF_REGEX.test(name)) {
        throw new HeaderInjectionException(
          `CRLF injection detected in HTTP header name: '${name}'. Request rejected.`,
          "CRLF_INJECTION_DETECTED",
          name
        );
      }

      // Handle multiple values / array values
      const values: string[] = Array.isArray(rawValue)
        ? rawValue.map((v) => String(v))
        : [String(rawValue ?? "")];

      // Rule 2: Check for Duplicate Dangerous Headers
      if (this.DANGEROUS_SINGLETON_HEADERS.has(lowerName)) {
        if (values.length > 1) {
          const uniqueVals = new Set(values);
          if (uniqueVals.size > 1) {
            throw new HeaderInjectionException(
              `Duplicate dangerous HTTP header detected with conflicting values in array: '${name}'. This is an indicator of HTTP Request Smuggling or Response Splitting.`,
              "DUPLICATE_DANGEROUS_HEADER",
              name
            );
          }
        }
        if (seenHeaders.has(lowerName)) {
          const previousVal = seenHeaders.get(lowerName);
          if (previousVal !== values[0]) {
            throw new HeaderInjectionException(
              `Duplicate dangerous HTTP header detected with conflicting values across entries: '${name}'. This is an indicator of HTTP Request Smuggling or Response Splitting.`,
              "DUPLICATE_DANGEROUS_HEADER",
              name
            );
          }
        }
      }

      for (const val of values) {
        // Rule 3: Check Oversized Header Values
        if (val.length > this.MAX_HEADER_VALUE_LENGTH) {
          throw new HeaderInjectionException(
            `HTTP header value for '${name}' exceeds maximum permitted length of ${this.MAX_HEADER_VALUE_LENGTH} bytes.`,
            "OVERSIZED_HEADER_VALUE",
            name
          );
        }

        totalLength += name.length + val.length;

        // Rule 4: Reject CRLF Injection in Header Values
        if (this.CRLF_REGEX.test(val)) {
          throw new HeaderInjectionException(
            `CRLF injection sequence (carriage return / line feed / null byte) detected in HTTP header value for '${name}'. Request rejected.`,
            "CRLF_INJECTION_DETECTED",
            name
          );
        }
      }

      seenHeaders.set(lowerName, values[0]);
    }

    // Rule 5: Enforce cumulative header size bounds
    if (totalLength > this.MAX_TOTAL_HEADERS_LENGTH) {
      throw new HeaderInjectionException(
        `Cumulative HTTP headers size (${totalLength} bytes) exceeds maximum allowed threshold (${this.MAX_TOTAL_HEADERS_LENGTH} bytes).`,
        "OVERSIZED_TOTAL_HEADERS"
      );
    }
  }

  /**
   * 2. Sanitize Outgoing Email Header Value.
   * MUST be strictly single-line! Removes carriage returns (\r), line feeds (\n), URL-encoded line breaks (%0d, %0a), and null bytes to prevent Email Header Injection (e.g., injecting Bcc: attacker@evil.com).
   */
  static sanitizeEmailHeaderValue(value: string): string {
    if (!value || typeof value !== "string") return "";

    return value
      .replace(/(?:[\r\n\x00-\x1F\x7F]|%0d|%0a|%0D|%0A)+/g, " ") // Replace all CRLF and control chars with a single space
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * 3. Sanitize a dictionary of outgoing email headers (To, Cc, Bcc, Subject, From, Reply-To, X-Priority).
   */
  static sanitizeEmailHeaders(headers: Record<string, string>): Record<string, string> {
    if (!headers || typeof headers !== "object") return {};

    const cleanHeaders: Record<string, string> = {};
    for (const [key, val] of Object.entries(headers)) {
      const cleanKey = this.sanitizeEmailHeaderValue(key);
      if (!cleanKey) continue;
      cleanHeaders[cleanKey] = this.sanitizeEmailHeaderValue(String(val || ""));
    }
    return cleanHeaders;
  }
}
