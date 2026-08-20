/**
 * AllowListValidationService
 * 
 * Enterprise-grade Allow-list (White-list) Validation defense for MOAT Patent Intelligence Platform.
 * Enforces strict zero-trust validation by rejecting any user input not found in predefined authorized lists:
 * 1. Roles (admin, super_admin, analyst, viewer, etc.)
 * 2. Status values (active, inactive, pending, etc.)
 * 3. Workflow stages (intake, prior_art_search, drafting, etc.)
 * 4. Country codes (US, EP, JP, CN, KR, WO, etc.)
 * 5. Patent categories (utility, design, plant, pct_international, etc.)
 * 6. File extensions (.pdf, .docx, .csv, .json, etc.)
 * 7. MIME types (application/pdf, text/csv, etc.)
 * 8. Sort fields (created_at, title, status, etc.)
 * 9. Filter values (date_range, jurisdiction, status, etc.)
 */

export class AllowListException extends Error {
  public code: string;
  public statusCode: number;
  public rejectedValue: any;
  public category: string;

  constructor(message: string, rejectedValue: any, category: string, code: string = "ALLOW_LIST_VIOLATION", statusCode: number = 400) {
    super(message);
    this.name = "AllowListException";
    this.code = code;
    this.statusCode = statusCode;
    this.rejectedValue = rejectedValue;
    this.category = category;
  }
}

export type AllowListCategory =
  | "roles"
  | "status"
  | "workflow_stages"
  | "country_codes"
  | "patent_categories"
  | "file_extensions"
  | "mime_types"
  | "sort_fields"
  | "filter_values";

export class AllowListValidationService {
  // 1. Roles
  private static readonly ROLES = new Set([
    "admin",
    "super_admin",
    "analyst",
    "viewer",
    "manager",
    "ceo",
    "design_team",
    "user",
  ]);

  // 2. Status values
  private static readonly STATUS_VALUES = new Set([
    "active",
    "inactive",
    "pending",
    "archived",
    "suspended",
    "under_review",
    "approved",
    "rejected",
    "draft",
  ]);

  // 3. Workflow stages
  private static readonly WORKFLOW_STAGES = new Set([
    "intake",
    "prior_art_search",
    "drafting",
    "filing_ready",
    "prosecution",
    "granted",
    "abandoned",
    "maintenance",
  ]);

  // 4. Country codes (WIPO / ISO 2-letter patent jurisdiction codes)
  private static readonly COUNTRY_CODES = new Set([
    "US", "EP", "JP", "CN", "KR", "WO", "GB", "DE", "FR", "IN", "CA", "AU", "BR", "MX", "CH", "ES", "IT", "NL", "SE", "IL"
  ]);

  // 5. Patent categories
  private static readonly PATENT_CATEGORIES = new Set([
    "utility",
    "design",
    "plant",
    "provisional",
    "pct_international",
    "continuation",
    "divisional",
    "reissue",
    "trademark",
    "copyright",
  ]);

  // 6. File extensions
  private static readonly FILE_EXTENSIONS = new Set([
    ".pdf",
    ".docx",
    ".doc",
    ".txt",
    ".csv",
    ".json",
    ".xml",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
  ]);

  // 7. MIME types
  private static readonly MIME_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/csv",
    "application/json",
    "application/xml",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);

  // 8. Sort fields
  private static readonly SORT_FIELDS = new Set([
    "created_at",
    "updated_at",
    "title",
    "status",
    "filing_date",
    "grant_date",
    "priority_date",
    "assignee",
    "inventor_name",
    "relevance_score",
    "id",
  ]);

  // 9. Filter values
  private static readonly FILTER_VALUES = new Set([
    "date_range",
    "jurisdiction",
    "status",
    "category",
    "assignee",
    "inventor",
    "keyword",
    "classification",
    "examiner",
    "law_firm",
  ]);

  /**
   * Retrieve the Set of allowed values for a given category.
   */
  static getAllowListSet(categoryOrList: AllowListCategory | string[], allowCaseInsensitive = false): Set<string> {
    if (Array.isArray(categoryOrList)) {
      return new Set(allowCaseInsensitive ? categoryOrList.map((i) => i.toLowerCase()) : categoryOrList);
    }

    let targetSet: Set<string>;
    switch (categoryOrList.toLowerCase()) {
      case "roles":
        targetSet = this.ROLES;
        break;
      case "status":
        targetSet = this.STATUS_VALUES;
        break;
      case "workflow_stages":
        targetSet = this.WORKFLOW_STAGES;
        break;
      case "country_codes":
        targetSet = this.COUNTRY_CODES;
        break;
      case "patent_categories":
        targetSet = this.PATENT_CATEGORIES;
        break;
      case "file_extensions":
        targetSet = this.FILE_EXTENSIONS;
        break;
      case "mime_types":
        targetSet = this.MIME_TYPES;
        break;
      case "sort_fields":
        targetSet = this.SORT_FIELDS;
        break;
      case "filter_values":
        targetSet = this.FILTER_VALUES;
        break;
      default:
        throw new AllowListException(`Unknown allow-list category: ${categoryOrList}`, categoryOrList, "UNKNOWN_CATEGORY", "INVALID_ALLOW_LIST_CATEGORY", 500);
    }

    if (allowCaseInsensitive) {
      return new Set(Array.from(targetSet).map((i) => i.toLowerCase()));
    }
    return targetSet;
  }

  /**
   * 1. Assert Allowed Value.
   * Checks if single string value is within the predefined allow-list. Throws AllowListException (HTTP 400) if rejected.
   */
  static assertAllowedValue(
    value: any,
    category: AllowListCategory | string[],
    customFieldName = "Value",
    allowCaseInsensitive = false
  ): string {
    if (value === null || value === undefined || String(value).trim() === "") {
      throw new AllowListException(
        `${customFieldName} is required and cannot be empty.`,
        value,
        typeof category === "string" ? category : "custom",
        "EMPTY_VALUE_VIOLATION",
        400
      );
    }

    const strVal = String(value).trim();
    const checkVal = allowCaseInsensitive ? strVal.toLowerCase() : strVal;
    const allowedSet = this.getAllowListSet(category, allowCaseInsensitive);

    if (!allowedSet.has(checkVal)) {
      const allowedSample = Array.from(allowedSet).slice(0, 10).join(", ");
      throw new AllowListException(
        `${customFieldName} '${strVal}' is not permitted. Authorized values include: [${allowedSample}].`,
        strVal,
        typeof category === "string" ? category : "custom",
        "ALLOW_LIST_VIOLATION",
        400
      );
    }

    return strVal;
  }

  /**
   * 2. Assert Allowed Array of Values.
   * Validates that every element in an array conforms to the authorized allow-list.
   */
  static assertAllowedArray(
    values: any[],
    category: AllowListCategory | string[],
    customFieldName = "Values",
    allowCaseInsensitive = false
  ): string[] {
    if (!Array.isArray(values) || values.length === 0) {
      throw new AllowListException(
        `${customFieldName} must be a non-empty array of permitted values.`,
        values,
        typeof category === "string" ? category : "custom",
        "EMPTY_ARRAY_VIOLATION",
        400
      );
    }

    return values.map((val, idx) =>
      this.assertAllowedValue(val, category, `${customFieldName}[${idx}]`, allowCaseInsensitive)
    );
  }

  /**
   * 3. Assert Allowed File Extension.
   */
  static assertAllowedFileExtension(filename: string, customExtensions?: string[]): string {
    if (!filename || typeof filename !== "string" || !filename.includes(".")) {
      throw new AllowListException(
        `Invalid filename format: '${filename}'. A valid file extension is required.`,
        filename,
        "file_extensions",
        "INVALID_FILE_EXTENSION",
        400
      );
    }

    const extIndex = filename.lastIndexOf(".");
    const ext = filename.substring(extIndex).toLowerCase();
    const allowedSet = customExtensions ? new Set(customExtensions.map((e) => e.toLowerCase())) : this.FILE_EXTENSIONS;

    if (!allowedSet.has(ext)) {
      throw new AllowListException(
        `File extension '${ext}' is not authorized. Permitted extensions: [${Array.from(allowedSet).join(", ")}].`,
        ext,
        "file_extensions",
        "ALLOW_LIST_VIOLATION",
        400
      );
    }

    return ext;
  }

  /**
   * 4. Assert Allowed MIME Type.
   */
  static assertAllowedMimeType(mimeType: string, customMimeTypes?: string[]): string {
    const cleanMime = (mimeType || "").trim().toLowerCase();
    const allowedSet = customMimeTypes ? new Set(customMimeTypes.map((m) => m.toLowerCase())) : this.MIME_TYPES;

    if (!allowedSet.has(cleanMime)) {
      throw new AllowListException(
        `MIME type '${cleanMime}' is not permitted for upload.`,
        cleanMime,
        "mime_types",
        "ALLOW_LIST_VIOLATION",
        400
      );
    }

    return cleanMime;
  }

  /**
   * 5. Assert Allowed Sort & Filter Parameters.
   */
  static assertAllowedSortAndFilter(query: { sortBy?: string; sortOrder?: string; filterBy?: string; filters?: Record<string, any> }): void {
    if (query.sortBy) {
      this.assertAllowedValue(query.sortBy, "sort_fields", "Sort field (sortBy)", true);
    }
    if (query.sortOrder) {
      this.assertAllowedValue(query.sortOrder, ["asc", "desc", "ascending", "descending"], "Sort order (sortOrder)", true);
    }
    if (query.filterBy) {
      this.assertAllowedValue(query.filterBy, "filter_values", "Filter key (filterBy)", true);
    }
    if (query.filters && typeof query.filters === "object") {
      for (const filterKey of Object.keys(query.filters)) {
        this.assertAllowedValue(filterKey, "filter_values", `Filter key '${filterKey}'`, true);
      }
    }
  }

  /**
   * 6. Helper to build Zod enum arrays from predefined allow-lists.
   */
  static toZodEnum(category: AllowListCategory): [string, ...string[]] {
    const arr = Array.from(this.getAllowListSet(category));
    if (arr.length === 0) {
      return ["default"];
    }
    return [arr[0], ...arr.slice(1)] as [string, ...string[]];
  }
}
