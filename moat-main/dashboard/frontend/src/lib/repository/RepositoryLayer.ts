import { SupabaseClient } from "@supabase/supabase-js";
import { SqlInjectionProtectionService, SqlInjectionException } from "../security/validation/SqlInjectionProtectionService";

export interface RepositoryExecutionResult<T> {
  data: T | null;
  count?: number | null;
  error?: { code?: string; message?: string; details?: string; hint?: string } | null;
}

export class RepositoryException extends Error {
  public code: string;
  public originalError: any;

  constructor(message: string, code: string = "REPO_ERROR", originalError: any = null) {
    super(message);
    this.name = "RepositoryException";
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * RepositoryLayer
 * 
 * Centralized data access abstraction layer that encapsulates all Supabase database queries.
 * Intercepts PostgREST and database errors at the data boundary, preventing table names,
 * schema details, and SQL exceptions from bubbling up unhandled to business logic or client routes.
 * 
 * Phase 4: Enforces strict SQL Injection (SQLi) protection by validating identifiers and executing
 * parameterized query builders exclusively without raw SQL string concatenation.
 */
export class RepositoryLayer {
  constructor(protected supabase: SupabaseClient) {}

  /**
   * Safely execute a Supabase query promise, intercepting errors and throwing a structured RepositoryException.
   */
  async execute<T = any>(queryPromise: PromiseLike<any> | any): Promise<{ data: T; count: number | null }> {
    try {
      const res = await queryPromise;
      
      if (res.error) {
        const errCode = String(res.error.code || "REPO_ERROR").toUpperCase();
        const errMsg = String(res.error.message || "Database execution failed");
        throw new RepositoryException(errMsg, errCode, res.error);
      }

      return {
        data: (res.data ?? (Array.isArray(res.data) ? [] : null)) as T,
        count: ("count" in res && typeof res.count === "number") ? res.count : null,
      };
    } catch (err: any) {
      if (err instanceof RepositoryException || err instanceof SqlInjectionException) {
        throw err;
      }
      throw new RepositoryException(
        err.message || "Database execution exception occurred",
        err.code || "REPO_UNEXPECTED_EXCEPTION",
        err
      );
    }
  }

  /**
   * 1. Safe Table Query Builder: Validates table identifier before calling Supabase's parameterized builder.
   * Eliminates dynamic table name injection vulnerabilities.
   */
  safeFrom(table: string, allowedTables?: string[]) {
    const validTable = SqlInjectionProtectionService.validateIdentifier(table, allowedTables);
    return this.supabase.from(validTable);
  }

  /**
   * 2. Safe Select Builder: Validates table name and column projections before building parameterized select.
   */
  safeSelect(table: string, columns: string = "*", allowedTables?: string[], allowedColumns?: string[]) {
    const validTable = SqlInjectionProtectionService.validateIdentifier(table, allowedTables);
    const validColumns = SqlInjectionProtectionService.validateColumnList(columns, allowedColumns);
    return this.supabase.from(validTable).select(validColumns);
  }

  /**
   * 3. Safe Find By Field: Enforces identifier validation and keyword inspection on value before executing parameterized .eq().
   */
  async safeFindByField<T>(
    table: string,
    field: string,
    value: any,
    allowedTables?: string[],
    allowedFields?: string[]
  ): Promise<T[]> {
    const validTable = SqlInjectionProtectionService.validateIdentifier(table, allowedTables);
    const validField = SqlInjectionProtectionService.validateIdentifier(field, allowedFields);
    SqlInjectionProtectionService.assertSafeInput(value, `Field '${validField}' Filter`);

    const res = await this.execute<T[]>(
      this.supabase.from(validTable).select("*").eq(validField, value)
    );
    return res.data || [];
  }

  /**
   * 4. Safe Insert Record: Validates table identifier and payload against SQL keywords before parameterized insertion.
   */
  async safeInsert<T>(table: string, payload: Record<string, any>, allowedTables?: string[]): Promise<T> {
    const validTable = SqlInjectionProtectionService.validateIdentifier(table, allowedTables);
    SqlInjectionProtectionService.assertSafeInput(payload, `Insert Payload for '${validTable}'`);

    const res = await this.execute<T>(
      this.supabase.from(validTable).insert(payload).select().single()
    );
    return res.data;
  }

  /**
   * 5. Safe Update Record: Enforces identifier syntax and keyword checks on update payloads.
   */
  async safeUpdate<T>(
    table: string,
    matchField: string,
    matchValue: any,
    payload: Record<string, any>,
    allowedTables?: string[],
    allowedFields?: string[]
  ): Promise<T[]> {
    const validTable = SqlInjectionProtectionService.validateIdentifier(table, allowedTables);
    const validField = SqlInjectionProtectionService.validateIdentifier(matchField, allowedFields);
    SqlInjectionProtectionService.assertSafeInput(matchValue, `Update Match Value for '${validField}'`);
    SqlInjectionProtectionService.assertSafeInput(payload, `Update Payload for '${validTable}'`);

    const res = await this.execute<T[]>(
      this.supabase.from(validTable).update(payload).eq(validField, matchValue).select()
    );
    return res.data || [];
  }

  /**
   * 6. Safe Delete Record: Enforces identifier validation and keyword inspection before executing parameterized delete.
   */
  async safeDelete<T>(
    table: string,
    matchField: string,
    matchValue: any,
    allowedTables?: string[],
    allowedFields?: string[]
  ): Promise<T[]> {
    const validTable = SqlInjectionProtectionService.validateIdentifier(table, allowedTables);
    const validField = SqlInjectionProtectionService.validateIdentifier(matchField, allowedFields);
    SqlInjectionProtectionService.assertSafeInput(matchValue, `Delete Match Value for '${validField}'`);

    const res = await this.execute<T[]>(
      this.supabase.from(validTable).delete().eq(validField, matchValue).select()
    );
    return res.data || [];
  }

  /**
   * 7. Safe RPC Call: Validates database function identifier and inspects parameter payloads before parameterized execution.
   */
  async safeRpc<T>(functionName: string, params: Record<string, any> = {}, allowedFunctions?: string[]): Promise<T> {
    const validFunc = SqlInjectionProtectionService.validateIdentifier(functionName, allowedFunctions);
    SqlInjectionProtectionService.assertSafeInput(params, `RPC Parameters for '${validFunc}'`);

    const res = await this.execute<T>(
      this.supabase.rpc(validFunc, params)
    );
    return res.data;
  }

  /**
   * Legacy Example domain method: Find records by field with error boundary protection.
   */
  async findByField<T>(table: string, field: string, value: any): Promise<T[]> {
    return this.safeFindByField<T>(table, field, value);
  }

  /**
   * Legacy Example domain method: Insert a record with error boundary protection.
   */
  async insertRecord<T>(table: string, payload: Record<string, any>): Promise<T> {
    return this.safeInsert<T>(table, payload);
  }
}
