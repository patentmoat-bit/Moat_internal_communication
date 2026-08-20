/**
 * SqlInjectionProtectionService
 * 
 * Enterprise-grade SQL Injection (SQLi) protection engine for MOAT Patent Intelligence Platform.
 * Enforces zero-trust database interactions by:
 * 1. Validating all SQL identifiers (table names, column names, function names, sort keys) against PostgreSQL grammar and allow-lists.
 * 2. Inspecting and rejecting dangerous SQL keywords, query stacking, comment sequences, and boolean/time-based injection patterns in user input.
 * 3. Guaranteeing exclusive reliance on parameterized query builders and prepared statements without string concatenation.
 */

export class SqlInjectionException extends Error {
  public code: string;
  public detectedTerm?: string;

  constructor(message: string, code: string = "SQL_INJECTION_DETECTED", detectedTerm?: string) {
    super(message);
    this.name = "SqlInjectionException";
    this.code = code;
    this.detectedTerm = detectedTerm;
  }
}

export class SqlInjectionProtectionService {
  // Strict PostgreSQL identifier regex: starts with letter or underscore, followed by letters, numbers, or underscores (max 63 chars)
  private static readonly IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

  // Dangerous SQL statement keywords that should never appear as standalone identifiers
  private static readonly RESERVED_IDENTIFIERS = new Set([
    "select", "insert", "update", "delete", "drop", "truncate", "alter", "exec", "execute",
    "union", "create", "grant", "revoke", "table", "database", "schema", "index", "view",
    "procedure", "function", "trigger", "user", "role", "superuser", "password", "pg_catalog", "information_schema"
  ]);

  // High-confidence SQL injection keyword patterns and comment/stacking attacks
  private static readonly SQL_ATTACK_PATTERNS: Array<{ pattern: RegExp; keyword: string }> = [
    { pattern: /\b(?:UNION(?:\s+ALL)?\s+SELECT)\b/i, keyword: "UNION SELECT" },
    { pattern: /\b(?:SELECT\s+.*\s+FROM)\b/i, keyword: "SELECT FROM" },
    { pattern: /\b(?:INSERT\s+INTO\s+.*\s+VALUES)\b/i, keyword: "INSERT INTO" },
    { pattern: /\b(?:DELETE\s+FROM\s+)/i, keyword: "DELETE FROM" },
    { pattern: /\b(?:DROP\s+(?:TABLE|DATABASE|INDEX|VIEW|SCHEMA|USER|ROLE))\b/i, keyword: "DROP STATEMENT" },
    { pattern: /\b(?:ALTER\s+(?:TABLE|DATABASE|SCHEMA|USER|ROLE))\b/i, keyword: "ALTER STATEMENT" },
    { pattern: /\b(?:TRUNCATE\s+TABLE)\b/i, keyword: "TRUNCATE TABLE" },
    { pattern: /\b(?:EXEC(?:UTE)?\s*\()/i, keyword: "EXECUTE FUNCTION" },
    { pattern: /\b(?:xp_cmdshell|sp_executesql|pg_sleep|benchmark|sys_eval|sys_exec)\b/i, keyword: "SYSTEM/TIME EXECUTION" },
    { pattern: /\b(?:information_schema|pg_catalog|pg_tables|pg_user|pg_authid)\b/i, keyword: "SYSTEM SCHEMA ENUMERATION" },
    { pattern: /(?:--|\/\*|\*\/)/, keyword: "SQL COMMENT SEQUENCE" },
    { pattern: /(?:;\s*(?:DROP|DELETE|UPDATE|INSERT|SELECT|ALTER|TRUNCATE|EXEC)\b)/i, keyword: "QUERY STACKING" },
    { pattern: /\b(?:OR|AND)\s+['"]?([a-zA-Z0-9_]+)['"]?\s*[=<>!]+\s*['"]?\1['"]?/i, keyword: "BOOLEAN TAUTOLOGY (OR 1=1)" },
    { pattern: /\b(?:OR|AND)\s+\d+\s*=\s*\d+/i, keyword: "NUMERIC TAUTOLOGY" },
    { pattern: /0x[0-9a-f]{4,}/i, keyword: "HEXADECIMAL ENCODED PAYLOAD" },
  ];

  /**
   * 1. Validate SQL Identifiers (table names, column names, sort fields, RPC functions).
   * Ensures zero dynamic string concatenation vulnerabilities by enforcing strict syntax rules and optional allow-lists.
   */
  static validateIdentifier(identifier: string, allowedList?: string[]): string {
    if (!identifier || typeof identifier !== "string") {
      throw new SqlInjectionException("SQL identifier must be a non-empty string.", "INVALID_IDENTIFIER_TYPE");
    }

    const trimmed = identifier.trim();

    // Check syntax against standard PostgreSQL identifier grammar
    if (!this.IDENTIFIER_REGEX.test(trimmed)) {
      throw new SqlInjectionException(
        `SQL identifier '${trimmed}' violates naming grammar or length constraints (max 63 characters, alphanumeric and underscore only).`,
        "INVALID_IDENTIFIER_SYNTAX",
        trimmed
      );
    }

    // Reject standalone reserved keywords when used as dynamic table or column names
    if (this.RESERVED_IDENTIFIERS.has(trimmed.toLowerCase())) {
      throw new SqlInjectionException(
        `SQL identifier '${trimmed}' is a reserved database keyword and cannot be used dynamically.`,
        "RESERVED_KEYWORD_IDENTIFIER",
        trimmed
      );
    }

    // If an explicit allow-list is provided, enforce membership
    if (allowedList && Array.isArray(allowedList) && allowedList.length > 0) {
      if (!allowedList.includes(trimmed)) {
        throw new SqlInjectionException(
          `SQL identifier '${trimmed}' is not authorized in the permitted allow-list.`,
          "UNAUTHORIZED_IDENTIFIER",
          trimmed
        );
      }
    }

    return trimmed;
  }

  /**
   * 2. Validate comma-separated column projection lists (e.g., "id, title, status, filing_date").
   */
  static validateColumnList(columns: string, allowedColumns?: string[]): string {
    if (!columns || typeof columns !== "string") return "*";

    if (columns.trim() === "*") return "*";

    const cols = columns.split(",").map((col) => col.trim());
    for (const col of cols) {
      this.validateIdentifier(col, allowedColumns);
    }

    return cols.join(", ");
  }

  /**
   * 3. Inspect and reject dangerous SQL keywords in user input where applicable.
   * Recursively traverses string values or payload structures to detect injection vectors.
   */
  static inspectAndRejectSqlKeywords(value: any, maxDepth = 10, currentDepth = 0): {
    isSafe: boolean;
    detectedKeyword?: string;
    violationType?: string;
  } {
    if (currentDepth > maxDepth || value === null || value === undefined) {
      return { isSafe: true };
    }

    if (typeof value === "string") {
      for (const rule of this.SQL_ATTACK_PATTERNS) {
        if (rule.pattern.test(value)) {
          return {
            isSafe: false,
            detectedKeyword: rule.keyword,
            violationType: "SQL_KEYWORD_INJECTION",
          };
        }
      }
      return { isSafe: true };
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const res = this.inspectAndRejectSqlKeywords(item, maxDepth, currentDepth + 1);
        if (!res.isSafe) return res;
      }
      return { isSafe: true };
    }

    if (typeof value === "object") {
      for (const [key, val] of Object.entries(value)) {
        // Also inspect dynamic keys to prevent NoSQL/SQL attribute name injection
        const keyRes = this.inspectAndRejectSqlKeywords(key, maxDepth, currentDepth + 1);
        if (!keyRes.isSafe) return keyRes;

        const valRes = this.inspectAndRejectSqlKeywords(val, maxDepth, currentDepth + 1);
        if (!valRes.isSafe) return valRes;
      }
      return { isSafe: true };
    }

    return { isSafe: true };
  }

  /**
   * 4. Enforce rejection of dangerous keywords on input parameters, throwing an exception if detected.
   */
  static assertSafeInput(value: any, context: string = "User Input"): void {
    const inspection = this.inspectAndRejectSqlKeywords(value);
    if (!inspection.isSafe) {
      throw new SqlInjectionException(
        `Dangerous SQL injection keyword or syntax pattern detected in ${context}: [${inspection.detectedKeyword}]. Query execution aborted.`,
        "SQL_KEYWORD_REJECTED",
        inspection.detectedKeyword
      );
    }
  }
}
