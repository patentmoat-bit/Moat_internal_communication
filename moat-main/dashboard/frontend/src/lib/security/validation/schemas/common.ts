import { z } from "zod";

/**
 * Common enterprise validation primitives using Zod.
 * Enforces strict data types, lengths, regular expressions, and formatting rules.
 */

// UUID check
export const uuidSchema = z.string().uuid("Invalid UUID identifier format.");

// Email check (sanitized and bounded)
export const emailSchema = z
  .string()
  .trim()
  .min(5, "Email address is too short.")
  .max(254, "Email address exceeds maximum allowed length.")
  .email("Invalid email address format.")
  .transform((val) => val.toLowerCase());

// Enterprise password complexity rules (min 8 chars, max 128 chars, requires upper, lower, number)
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password exceeds maximum length.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

// Safe bounded string without null bytes
export const safeStringSchema = (minLen = 1, maxLen = 1000) =>
  z
    .string()
    .trim()
    .min(minLen, `Field must be at least ${minLen} character(s).`)
    .max(maxLen, `Field must not exceed ${maxLen} characters.`)
    .refine((val) => !/\x00/.test(val), "Null byte character detected in string.");

// Patent number format (e.g., US10123456B2, EP1234567A1, WO2020123456A1)
export const patentNumberSchema = z
  .string()
  .trim()
  .min(3, "Patent number is too short.")
  .max(35, "Patent number is too long.")
  .regex(/^[A-Z0-9\-\.\/]+$/i, "Patent number contains invalid alphanumeric or punctuation characters.");

// ISO Date string check
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/, "Invalid ISO date or timestamp format.");

// Pagination options schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "Page number must be at least 1.").default(1),
  resultsCount: z.coerce.number().int().min(1, "Page size must be at least 1.").max(100, "Page size cannot exceed 100.").default(10),
  sortBy: z.string().max(50).default("filing_date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
