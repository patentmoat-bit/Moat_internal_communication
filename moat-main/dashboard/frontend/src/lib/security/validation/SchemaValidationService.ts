import { z } from "zod";
import * as schemas from "./schemas";

export class SchemaValidationException extends Error {
  public code: string;
  public statusCode: number;
  public validationErrors: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    validationErrors: Array<{ field: string; message: string }>,
    code: string = "SCHEMA_VALIDATION_VIOLATION",
    statusCode: number = 400
  ) {
    super(message);
    this.name = "SchemaValidationException";
    this.code = code;
    this.statusCode = statusCode;
    this.validationErrors = validationErrors;
  }
}

/**
 * SchemaValidationService
 * 
 * Enterprise modular schema validation engine for MOAT Patent Intelligence Platform.
 * Wraps Zod schema execution to provide unified synchronous and asynchronous validation,
 * structured field-level error mapping without stack trace leakage, and centralized schema access.
 */
export class SchemaValidationService {
  /**
   * Access pre-defined platform schemas (login, registration, patents, trademarks, etc.).
   */
  static readonly schemas = schemas;

  /**
   * Synchronously validate data against a schema.
   */
  static validate<T = any>(
    schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } },
    data: unknown
  ): { success: boolean; data?: T; errors?: Array<{ field: string; message: string }> } {
    const parseRes = schema.safeParse(data);
    if (!parseRes.success) {
      const errors = (parseRes.error?.errors || []).map((err: any) => ({
        field: (err.path || []).join(".") || "payload",
        message: err.message || "Validation failed",
      }));
      return { success: false, errors };
    }
    return { success: true, data: parseRes.data };
  }

  /**
   * Asynchronously validate data against a schema (supports async refinements).
   */
  static async validateAsync<T = any>(
    schema: { safeParseAsync?: (data: unknown) => Promise<{ success: boolean; data?: T; error?: any }>; safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } },
    data: unknown
  ): Promise<{ success: boolean; data?: T; errors?: Array<{ field: string; message: string }> }> {
    const parseRes = schema.safeParseAsync ? await schema.safeParseAsync(data) : schema.safeParse(data);
    if (!parseRes.success) {
      const errors = (parseRes.error?.errors || []).map((err: any) => ({
        field: (err.path || []).join(".") || "payload",
        message: err.message || "Validation failed",
      }));
      return { success: false, errors };
    }
    return { success: true, data: parseRes.data };
  }

  /**
   * Assert valid synchronous data, throwing SchemaValidationException (HTTP 400) on failure.
   */
  static assertValid<T = any>(
    schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } },
    data: unknown,
    customMessage = "Payload does not conform to required schema."
  ): T {
    const res = this.validate<T>(schema, data);
    if (!res.success || !res.data) {
      throw new SchemaValidationException(customMessage, res.errors || []);
    }
    return res.data;
  }

  /**
   * Assert valid asynchronous data, throwing SchemaValidationException (HTTP 400) on failure.
   */
  static async assertValidAsync<T = any>(
    schema: { safeParseAsync?: (data: unknown) => Promise<{ success: boolean; data?: T; error?: any }>; safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } },
    data: unknown,
    customMessage = "Payload does not conform to required schema."
  ): Promise<T> {
    const res = await this.validateAsync<T>(schema, data);
    if (!res.success || !res.data) {
      throw new SchemaValidationException(customMessage, res.errors || []);
    }
    return res.data;
  }
}
