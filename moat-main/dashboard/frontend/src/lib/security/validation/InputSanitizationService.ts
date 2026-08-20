/**
 * InputSanitizationService
 * 
 * Centralized, context-aware input sanitization engine for MOAT Patent Intelligence Platform.
 * Cleanses, escapes, and normalizes user data across 9 distinct functional contexts before schema
 * validation, business logic processing, or persistence in the database.
 * 
 * Targets: Text fields, Rich text, Comments, Patent descriptions, Search queries, Email subjects, Email bodies, Notes, File names.
 * Removes/Escapes: HTML tags, JavaScript, SQL meta characters, Shell commands, Control characters, Invalid Unicode, Dangerous encodings.
 */
export class InputSanitizationService {
  // Dangerous control characters (ASCII 0x00 to 0x1F except tab 0x09, LF 0x0A, CR 0x0D, and DEL 0x7F)
  private static readonly CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

  // Single-line control characters (strips CR and LF as well)
  private static readonly SINGLE_LINE_CONTROL_REGEX = /[\x00-\x1F\x7F]/g;

  // Invalid Unicode / Zero-Width / RTL overrides (e.g. U+200B zero-width space, U+202E RTL override, U+FEFF BOM)
  private static readonly INVALID_UNICODE_REGEX = /[\u200B-\u200D\uFEFF\u202A-\u202E\u2060-\u206F]/g;

  // Complete XSS & Executable blocks (<script>...</script>, <style>...</style>, <iframe>...</iframe>, <object>, <embed>, <form>)
  private static readonly DANGEROUS_BLOCKS_REGEX = /<(?:script|style|iframe|object|embed|form|meta|link|base)[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed|form|meta|link|base)>|<(?:script|style|iframe|object|embed|form|input|meta|link|base)[^>]*\/?>/gi;

  // Shell command injection sequences and common command names (; | & ` $(...) rm -rf cat etc.)
  private static readonly SHELL_META_REGEX = /(?:;|\b\|\||\b&&|\$\([^)]*\)|`[^`]*`|\b(?:rm\s+-rf|rmdir|mkfs|dd\b|wget\b|curl\b|nc\b|cat\s+\/)|[|&$;`<>])/g;

  // SQL meta comments and dangerous command keywords
  private static readonly SQL_META_REGEX = /(?:--|\/\*|\*\/|\b(?:DROP|DELETE|TRUNCATE|ALTER|EXEC|UNION)\s+(?:TABLE|DATABASE|INDEX|VIEW|FROM|INTO|SELECT)\b)/gi;

  // Inline event handlers and style/data injection attributes
  private static readonly DANGEROUS_ATTRIBUTES_REGEX = /\s+(?:on[a-z]+|style|data|formaction|background|cite|codebase)\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;

  // Dangerous JavaScript / VBScript / Data URI schemes in attributes
  private static readonly DANGEROUS_SCHEMES_REGEX = /(?:javascript|vbscript|data:text\/html):/gi;

  // Safe subset of HTML tags allowed in rich text / patent descriptions
  private static readonly ALLOWED_RICH_TAGS = new Set([
    "p", "br", "strong", "em", "u", "b", "i", "ul", "ol", "li",
    "blockquote", "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6", "span", "div"
  ]);

  // Safe subset of HTML tags allowed in comments
  private static readonly ALLOWED_COMMENT_TAGS = new Set([
    "p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "blockquote", "code"
  ]);

  /**
   * 1. Sanitize standard single-line plaintext fields (e.g., titles, names, assignees, serial numbers).
   * Strips all HTML tags, control chars, invalid Unicode, and shell/SQL meta chars.
   */
  static sanitizeText(value: string): string {
    if (!value || typeof value !== "string") return "";

    return value
      .replace(this.INVALID_UNICODE_REGEX, "")       // Remove zero-width & RTL overrides
      .replace(this.SINGLE_LINE_CONTROL_REGEX, " ")  // Remove control chars, CR, LF
      .replace(this.DANGEROUS_BLOCKS_REGEX, "")      // Remove script/style blocks completely
      .replace(/<[^>]*>/g, "")                       // Strip all remaining HTML tags
      .replace(this.SHELL_META_REGEX, "")            // Strip shell sequence operators & commands
      .replace(this.SQL_META_REGEX, "")              // Strip SQL comments & DROP/DELETE keywords
      .replace(/\s+/g, " ")                          // Collapse whitespace
      .trim();
  }

  /**
   * 2. Sanitize rich text / Patent descriptions / Claims.
   * Permits a safe HTML subset while eliminating XSS, script blocks, event handlers, and dangerous encodings.
   */
  static sanitizeRichText(value: string): string {
    if (!value || typeof value !== "string") return "";

    let cleaned = value
      .replace(this.INVALID_UNICODE_REGEX, "")       // Remove zero-width & RTL overrides
      .replace(this.CONTROL_CHARS_REGEX, "")         // Remove control chars (keeps \n, \r, \t)
      .replace(this.DANGEROUS_BLOCKS_REGEX, "")      // Remove <script>...</script>, <iframe>, etc.
      .replace(this.DANGEROUS_ATTRIBUTES_REGEX, "")  // Remove onerror=, style=, etc.
      .replace(this.DANGEROUS_SCHEMES_REGEX, "blocked:"); // Neutralize javascript: URIs

    // Custom HTML tag filter: strip any tag not in ALLOWED_RICH_TAGS
    cleaned = cleaned.replace(/<\/?([a-z0-9]+)(?:\s+[^>]*)*>/gi, (match, tagName) => {
      const lowerTag = String(tagName).toLowerCase();
      if (this.ALLOWED_RICH_TAGS.has(lowerTag)) {
        // Return clean tag without inline attributes to prevent attribute payload escaping
        return match.startsWith("</") ? `</${lowerTag}>` : `<${lowerTag}>`;
      }
      return ""; // Strip unauthorized HTML tag
    });

    return cleaned.trim();
  }

  /**
   * 3. Sanitize Comments & Notes (executive feedback, transition notes, annotations).
   * Strips executable scripts, event handlers, unauthorized tags, and command meta characters.
   */
  static sanitizeComment(value: string): string {
    if (!value || typeof value !== "string") return "";

    let cleaned = value
      .replace(this.INVALID_UNICODE_REGEX, "")
      .replace(this.CONTROL_CHARS_REGEX, "")
      .replace(this.DANGEROUS_BLOCKS_REGEX, "")
      .replace(this.DANGEROUS_ATTRIBUTES_REGEX, "")
      .replace(this.DANGEROUS_SCHEMES_REGEX, "blocked:")
      .replace(this.SHELL_META_REGEX, "")
      .replace(this.SQL_META_REGEX, "");

    // Only allow safe comment formatting tags (b, i, strong, em, br, code, p, ul, ol, li)
    cleaned = cleaned.replace(/<\/?([a-z0-9]+)(?:\s+[^>]*)*>/gi, (match, tagName) => {
      const lowerTag = String(tagName).toLowerCase();
      if (this.ALLOWED_COMMENT_TAGS.has(lowerTag)) {
        return match.startsWith("</") ? `</${lowerTag}>` : `<${lowerTag}>`;
      }
      return "";
    });

    return cleaned.trim();
  }

  /**
   * 4. Sanitize Search Queries.
   * Eliminates control characters, SQL/NoSQL operator wildcards ($where, $ne), shell operators, and collapses whitespace.
   */
  static sanitizeSearchQuery(value: string): string {
    if (!value || typeof value !== "string") return "";

    return value
      .replace(this.INVALID_UNICODE_REGEX, "")
      .replace(this.SINGLE_LINE_CONTROL_REGEX, " ")
      .replace(this.DANGEROUS_BLOCKS_REGEX, "")
      .replace(/<[^>]*>/g, "")                       // Strip HTML
      .replace(this.SHELL_META_REGEX, "")            // Strip shell commands
      .replace(this.SQL_META_REGEX, "")              // Strip SQL comments & keywords
      .replace(/(?:\b|[$%])(?:where|ne|eq|gt|gte|lt|lte|in|nin|regex|exists)\b/gi, "") // Strip NoSQL operator keywords
      .replace(/[|&$;`<>\\\x00]/g, " ")              // Strip operator symbols
      .replace(/\s+/g, " ")                          // Collapse whitespace
      .trim();
  }

  /**
   * 5. Sanitize Email Subjects.
   * MUST be strictly single-line! Removes CR/LF sequences to prevent Email Header Injection (CRLF injection).
   */
  static sanitizeEmailSubject(value: string): string {
    if (!value || typeof value !== "string") return "";

    return value
      .replace(this.INVALID_UNICODE_REGEX, "")
      .replace(/(?:\r|\n|%0d|%0a|%0D|%0A)/g, " ")     // Prevent CRLF Email Header Injection
      .replace(this.SINGLE_LINE_CONTROL_REGEX, "")
      .replace(this.DANGEROUS_BLOCKS_REGEX, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * 6. Sanitize Email Bodies.
   * Cleanses HTML email templates or bodies against XSS, script injection, and dangerous phishing schemes.
   */
  static sanitizeEmailBody(value: string): string {
    return this.sanitizeRichText(value);
  }

  /**
   * 7. Sanitize File Names.
   * Strips directory traversal (../), path separators, null bytes, and restricts characters to alphanumeric, hyphens, underscores, and dots.
   * Blocks Windows/DOS reserved filenames (CON, PRN, AUX, NUL, COM1-9, LPT1-9).
   */
  static sanitizeFileName(value: string): string {
    if (!value || typeof value !== "string") return "unnamed_file";

    // Strip path traversal (../ and ..\) completely before processing separators
    let cleaned = value
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/(?:\.\.\/|\.\.\\)+/g, "")            // Strip directory traversal
      .replace(/[\/\\]/g, "_")                       // Replace remaining slashes with underscore
      .replace(/\.\.+/g, ".")                        // Collapse multiple consecutive dots
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_")            // Replace non-safe chars with underscore
      .replace(/^[._]+/, "")                         // Strip leading dots or underscores
      .trim();

    if (!cleaned) {
      cleaned = "unnamed_file";
    }

    // Prevent reserved DOS/Windows device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    const reservedNames = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i;
    if (reservedNames.test(cleaned)) {
      cleaned = `safe_${cleaned}`;
    }

    // Truncate overly long filenames (max 255 chars) while preserving file extension
    if (cleaned.length > 255) {
      const extIndex = cleaned.lastIndexOf(".");
      if (extIndex > 0 && cleaned.length - extIndex < 10) {
        const ext = cleaned.substring(extIndex);
        cleaned = cleaned.substring(0, 255 - ext.length) + ext;
      } else {
        cleaned = cleaned.substring(0, 255);
      }
    }

    return cleaned;
  }

  /**
   * 8. Context-Aware Recursive Payload Sanitization.
   * Automatically inspects Object/Array keys and applies appropriate sanitization rules before data processing or storage.
   */
  static sanitizePayload(payload: any, maxDepth = 10, currentDepth = 0): any {
    if (currentDepth > maxDepth || payload === null || payload === undefined) {
      return payload;
    }

    if (typeof payload === "string") {
      return this.sanitizeText(payload);
    }

    if (typeof payload === "number" || typeof payload === "boolean") {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizePayload(item, maxDepth, currentDepth + 1));
    }

    if (typeof payload === "object") {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(payload)) {
        // Skip sanitization for non-string values directly, recurse into them
        if (typeof val !== "string") {
          sanitizedObj[key] = this.sanitizePayload(val, maxDepth, currentDepth + 1);
          continue;
        }

        const lowerKey = key.toLowerCase();

        // Apply context-aware rule based on attribute name
        if (lowerKey.includes("filename") || (lowerKey === "name" && currentDepth > 0)) {
          sanitizedObj[key] = this.sanitizeFileName(val);
        } else if (lowerKey.includes("subject")) {
          sanitizedObj[key] = this.sanitizeEmailSubject(val);
        } else if (lowerKey.includes("emailbody") || lowerKey.includes("template")) {
          sanitizedObj[key] = this.sanitizeEmailBody(val);
        } else if (lowerKey.includes("query") || lowerKey.includes("search")) {
          sanitizedObj[key] = this.sanitizeSearchQuery(val);
        } else if (lowerKey.includes("description") || lowerKey.includes("claims") || lowerKey.includes("abstract") || lowerKey.includes("richtext")) {
          sanitizedObj[key] = this.sanitizeRichText(val);
        } else if (lowerKey.includes("comment") || lowerKey.includes("note") || lowerKey.includes("feedback") || lowerKey.includes("annotation") || lowerKey.includes("content")) {
          sanitizedObj[key] = this.sanitizeComment(val);
        } else {
          // Default to text sanitization for titles, names, assignees, serials, identifiers, etc.
          sanitizedObj[key] = this.sanitizeText(val);
        }
      }
      return sanitizedObj;
    }

    return payload;
  }
}
