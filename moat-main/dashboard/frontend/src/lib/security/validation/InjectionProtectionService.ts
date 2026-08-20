export interface InjectionDetectionResult {
  isClean: boolean;
  violationType?: string;
  sanitizedValue?: any;
  details?: string;
}

/**
 * InjectionProtectionService
 * 
 * Enterprise defense-in-depth sanitization and injection detection engine for MOAT Patent Intelligence Platform.
 * Protects against 15 OWASP & enterprise attack vectors across all inputs before business logic execution.
 */
export class InjectionProtectionService {
  // 1. Prototype Pollution check
  private static readonly PROTOTYPE_POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  // 2. SQLi patterns (UNION, SELECT, DROP, INSERT, DELETE, ALTER, EXEC, comment sequences)
  private static readonly SQLI_REGEX = /(\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|DECLARE|CAST)\b.*\b(FROM|INTO|TABLE|DATABASE|INDEX|WHERE|ON)\b|--|\/\*|\*\/|;\s*(?:DROP|DELETE|UPDATE|INSERT))/i;

  // 3. NoSQLi patterns (MongoDB/PostgREST operator injection)
  private static readonly NOSQLI_REGEX = /(\$where|\$ne|\$gt|\$gte|\$lt|\$lte|\$in|\$nin|\$regex|\$exists)/i;

  // 4. Command Injection patterns (; | & ` $(...))
  private static readonly CMD_INJECTION_REGEX = /(?:;|\b\|\||\b&&|\$\([^)]*\)|`[^`]*`|\b(?:bash|sh|cmd|powershell|wget|curl|nc|netcat|nmap|rm -rf|cat \/etc)\b)/i;

  // 5. XSS & HTML Injection patterns (<script>, javascript:, onload=, onerror=, <iframe>)
  private static readonly XSS_REGEX = /(<script\b[^>]*>|javascript:|vbscript:|data:text\/html|on(?:error|load|click|mouseover|focus|blur|submit)\s*=|<iframe\b|<object\b|<embed\b|<svg\b[^>]*on)/i;

  // 6. Path Traversal patterns (../, ..\, /etc/passwd, C:\Windows)
  private static readonly PATH_TRAVERSAL_REGEX = /(?:\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\|\/etc\/(?:passwd|shadow|hosts)|C:\\(?:Windows|System32))/i;

  // 7. XML / LDAP Injection patterns (<!ENTITY, cn=*, etc.)
  private static readonly XML_LDAP_REGEX = /(?:<!ENTITY|<!DOCTYPE|<!ELEMENT|\b(?:cn|ou|dc)=.*[*(|&!])/i;

  // 8. Header / Email / Log Injection patterns (\r, \n, %0d, %0a)
  private static readonly HEADER_LOG_REGEX = /(?:\r\n|\r|\n|%0d%0a|%0d|%0a)/i;

  /**
   * Inspect and sanitize string input against all injection vectors.
   */
  static inspectString(value: string, context: "general" | "header" | "email" | "log" | "query" = "general"): InjectionDetectionResult {
    if (typeof value !== "string") {
      return { isClean: true, sanitizedValue: value };
    }

    const trimmed = value.trim();

    // Check Header, Email Header, and Log Injection (CRLF)
    if (context === "header" || context === "email" || context === "log") {
      if (this.HEADER_LOG_REGEX.test(trimmed)) {
        return {
          isClean: false,
          violationType: "HEADER_LOG_INJECTION",
          details: "Carriage return or line feed character detected in single-line context.",
        };
      }
    }

    // Check Path Traversal
    if (this.PATH_TRAVERSAL_REGEX.test(trimmed)) {
      return {
        isClean: false,
        violationType: "PATH_TRAVERSAL",
        details: "Path traversal or restricted filesystem path pattern detected.",
      };
    }

    // Check Command Injection
    if (this.CMD_INJECTION_REGEX.test(trimmed)) {
      return {
        isClean: false,
        violationType: "COMMAND_INJECTION",
        details: "Shell command execution or chaining pattern detected.",
      };
    }

    // Check SQL Injection
    if (this.SQLI_REGEX.test(trimmed)) {
      return {
        isClean: false,
        violationType: "SQL_INJECTION",
        details: "SQL keyword sequence or query manipulation pattern detected.",
      };
    }

    // Check NoSQL Injection
    if (this.NOSQLI_REGEX.test(trimmed)) {
      return {
        isClean: false,
        violationType: "NOSQL_INJECTION",
        details: "NoSQL operator or query syntax detected.",
      };
    }

    // Check XSS and HTML Injection
    if (this.XSS_REGEX.test(trimmed)) {
      return {
        isClean: false,
        violationType: "XSS_HTML_INJECTION",
        details: "Cross-site scripting (XSS) or executable HTML tag detected.",
      };
    }

    // Check XML / LDAP Injection
    if (this.XML_LDAP_REGEX.test(trimmed)) {
      return {
        isClean: false,
        violationType: "XML_LDAP_INJECTION",
        details: "XML entity or LDAP syntax manipulation detected.",
      };
    }

    // Basic HTML Entity Sanitization for safe storage
    const sanitized = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    return {
      isClean: true,
      sanitizedValue: context === "general" ? trimmed : sanitized,
    };
  }

  /**
   * Recursively inspect and validate an object or array against Prototype Pollution and Injections.
   */
  static inspectPayload(payload: any, maxDepth = 10, currentDepth = 0): InjectionDetectionResult {
    if (currentDepth > maxDepth) {
      return {
        isClean: false,
        violationType: "JSON_INJECTION_MAX_DEPTH",
        details: "Payload nesting depth exceeded safety threshold (possible JSON denial-of-service).",
      };
    }

    if (payload === null || payload === undefined) {
      return { isClean: true, sanitizedValue: payload };
    }

    if (typeof payload === "string") {
      return this.inspectString(payload);
    }

    if (typeof payload === "number" || typeof payload === "boolean") {
      return { isClean: true, sanitizedValue: payload };
    }

    if (Array.isArray(payload)) {
      const sanitizedArray: any[] = [];
      for (const item of payload) {
        const res = this.inspectPayload(item, maxDepth, currentDepth + 1);
        if (!res.isClean) return res;
        sanitizedArray.push(res.sanitizedValue !== undefined ? res.sanitizedValue : item);
      }
      return { isClean: true, sanitizedValue: sanitizedArray };
    }

    if (typeof payload === "object") {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(payload)) {
        // Prototype Pollution Protection
        if (this.PROTOTYPE_POLLUTION_KEYS.has(key) || key.startsWith("__")) {
          return {
            isClean: false,
            violationType: "PROTOTYPE_POLLUTION",
            details: `Forbidden prototype manipulation key detected: "${key}".`,
          };
        }

        // Key sanitization check
        const keyRes = this.inspectString(key);
        if (!keyRes.isClean) {
          return {
            isClean: false,
            violationType: `KEY_${keyRes.violationType}`,
            details: `Invalid character in payload attribute key: "${key}".`,
          };
        }

        const valRes = this.inspectPayload(val, maxDepth, currentDepth + 1);
        if (!valRes.isClean) return valRes;
        sanitizedObj[key] = valRes.sanitizedValue !== undefined ? valRes.sanitizedValue : val;
      }
      return { isClean: true, sanitizedValue: sanitizedObj };
    }

    return { isClean: true, sanitizedValue: payload };
  }

  /**
   * Resolve HTTP Parameter Pollution (HPP) by normalising duplicate parameters.
   * In enterprise security, ambiguous duplicate array parameters on non-array endpoints are rejected or normalized.
   */
  static normaliseQueryParams(params: URLSearchParams, allowedArrayKeys = new Set(["searchModes", "filters", "ids", "tags"])): {
    isClean: boolean;
    normalized: Record<string, any>;
    violationType?: string;
    details?: string;
  } {
    const normalized: Record<string, any> = {};

    for (const [key, value] of params.entries()) {
      // Check for Prototype Pollution in query parameters
      if (this.PROTOTYPE_POLLUTION_KEYS.has(key) || key.startsWith("__")) {
        return {
          isClean: false,
          normalized: {},
          violationType: "PROTOTYPE_POLLUTION",
          details: `Forbidden prototype key in query parameter: "${key}".`,
        };
      }

      // Check string injection in value
      const checkRes = this.inspectString(value, "query");
      if (!checkRes.isClean) {
        return {
          isClean: false,
          normalized: {},
          violationType: checkRes.violationType,
          details: `Query parameter "${key}" failed injection check: ${checkRes.details}`,
        };
      }

      const allValues = params.getAll(key);
      if (allValues.length > 1) {
        if (!allowedArrayKeys.has(key) && !key.endsWith("[]")) {
          return {
            isClean: false,
            normalized: {},
            violationType: "HTTP_PARAMETER_POLLUTION",
            details: `Duplicate parameter "${key}" detected without array permit (HPP attack prevention).`,
          };
        }
        normalized[key] = allValues;
      } else {
        normalized[key] = value;
      }
    }

    return { isClean: true, normalized };
  }
}
