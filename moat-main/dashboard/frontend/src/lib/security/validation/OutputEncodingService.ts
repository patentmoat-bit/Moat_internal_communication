/**
 * OutputEncodingService
 * 
 * Enterprise-grade Output Encoding and XSS Prevention defense for MOAT Patent Intelligence Platform.
 * Enforces zero-trust data rendering by:
 * 1. HTML encoding plain text to prevent Reflected and Stored Cross-Site Scripting (XSS).
 * 2. Attribute encoding for safe insertion inside HTML attribute contexts.
 * 3. JSON / JavaScript response encoding to escape line separators and script tag boundaries.
 * 4. Safe Rich Text sanitization using a strict allow-list of formatting tags while neutralizing scripts and event handlers.
 * 5. Recursive payload encoding for API responses before returning to the client.
 */

export class OutputEncodingService {
  // HTML special character replacement map
  private static readonly HTML_CHARS_MAP: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };

  private static readonly HTML_REGEX = /[&<>"'`=\/]/g;

  // Strict allow-list of safe HTML tags for rich text fields (patent notes, formatted descriptions)
  private static readonly ALLOWED_RICH_TEXT_TAGS = new Set([
    "b", "i", "u", "strong", "em", "p", "br", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre"
  ]);

  // Allowed attributes for specific rich text tags (e.g., href on <a>)
  private static readonly ALLOWED_RICH_TEXT_ATTRS: Record<string, Set<string>> = {
    a: new Set(["href", "title", "target", "rel"]),
  };

  /**
   * 1. HTML Encode Text.
   * Converts HTML special characters (&, <, >, ", ', /, `, =) to secure HTML entities.
   * Prevents Stored and Reflected XSS when rendering user data in plain text DOM nodes.
   */
  static encodeHtml(text: any): string {
    if (text === null || text === undefined) return "";
    const str = String(text);
    return str.replace(this.HTML_REGEX, (match) => this.HTML_CHARS_MAP[match] || match);
  }

  /**
   * 2. HTML Attribute Encode.
   * Encodes characters for safe insertion inside HTML attribute quotes.
   * Alphanumeric characters are unchanged; all other ASCII characters are hex encoded (&#xHH;).
   */
  static encodeAttribute(val: any): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    let result = "";
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = char.charCodeAt(0);
      // Allow alphanumeric ASCII and standard whitespace
      if (
        (code >= 48 && code <= 57) ||  // 0-9
        (code >= 65 && code <= 90) ||  // A-Z
        (code >= 97 && code <= 122) || // a-z
        code === 32 || code === 45 || code === 95 || code === 46 // space, '-', '_', '.'
      ) {
        result += char;
      } else {
        const hex = code.toString(16).toUpperCase();
        result += `&#x${hex.length === 1 ? "0" + hex : hex};`;
      }
    }
    return result;
  }

  /**
   * 3. Safe JSON Response Encoding.
   * Safely serializes data to JSON string while neutralizing DOM-based XSS vectors:
   * - Escapes line separators (\u2028, \u2029) that break JavaScript string literals in script tags.
   * - Escapes <script> tag boundaries and HTML comment delimiters (</script> -> <\/script>, <!-- -> <\!--).
   */
  static encodeJson(data: any): string {
    const rawJson = JSON.stringify(data === undefined ? null : data);
    if (!rawJson) return "null";

    return rawJson
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
      .replace(/--/g, "\\u002d\\u002d");
  }

  /**
   * 4. Safe Rich Text Encoding / Sanitization.
   * Allows basic formatting tags (<b>, <i>, <p>, <ul>, etc.) while neutralizing XSS vectors:
   * - Removes unauthorized tags (<script>, <iframe>, <object>, <style>).
   * - Removes event handlers (onerror=..., onload=...).
   * - Rejects dangerous URL schemes (javascript:, vbscript:, data:) in href attributes.
   */
  static encodeRichText(input: string): string {
    if (!input || typeof input !== "string") return "";

    // Step A: Remove script tags and their contents completely
    let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
    cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");

    // Step B: Strip event handlers (e.g., onerror=..., onclick=..., onmouseover=...)
    cleaned = cleaned.replace(/\b(?:on[a-z]+)\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

    // Step C: Neutralize dangerous URL schemes in href/src attributes (javascript:, vbscript:, data:)
    cleaned = cleaned.replace(/(?:href|src)\s*=\s*['"]?(?:javascript|vbscript|data):[^"'>\s]*['"]?/gi, 'href="#"');

    // Step D: Process remaining tags against allowed set
    // Replace any tag that is NOT in our ALLOWED_RICH_TEXT_TAGS with its HTML encoded representation
    cleaned = cleaned.replace(/<\/?([a-z0-9]+)(?:\s+[^>]*)?>/gi, (fullTag, tagName) => {
      const lowerTag = tagName.toLowerCase();
      if (!this.ALLOWED_RICH_TEXT_TAGS.has(lowerTag)) {
        // Tag is not allowed -> HTML encode it!
        return this.encodeHtml(fullTag);
      }
      return fullTag;
    });

    return cleaned.replace(/\s+>/g, ">").trim();
  }

  /**
   * 5. Recursive API Response Payload Encoder.
   * Recursively traverses response objects and applies HTML encoding to text strings (unless marked as rich text).
   * Guarantees zero unencoded strings are returned to client UI layers.
   */
  static encodeResponsePayload(data: any, richTextFields: Set<string> = new Set()): any {
    if (data === null || data === undefined) return data;

    if (typeof data === "string") {
      return this.encodeHtml(data);
    }

    if (typeof data === "number" || typeof data === "boolean") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.encodeResponsePayload(item, richTextFields));
    }

    if (typeof data === "object") {
      const encodedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        if (richTextFields.has(key) && typeof val === "string") {
          encodedObj[key] = this.encodeRichText(val);
        } else {
          encodedObj[key] = this.encodeResponsePayload(val, richTextFields);
        }
      }
      return encodedObj;
    }

    return data;
  }
}
