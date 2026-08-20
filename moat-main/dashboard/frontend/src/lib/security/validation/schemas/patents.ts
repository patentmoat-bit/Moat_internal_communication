import { z } from "zod";
import { patentNumberSchema, safeStringSchema, isoDateSchema } from "./common";

// 5a. Patent Creation Schema
export const PatentCreateSchema = z.object({
  patent_number: patentNumberSchema,
  title: safeStringSchema(3, 500),
  abstract: safeStringSchema(10, 10000).optional().nullable(),
  description: z.string().max(100000, "Description exceeds maximum allowed length.").optional().nullable(),
  claims: z.string().max(100000, "Claims exceed maximum allowed length.").optional().nullable(),
  assignee: safeStringSchema(2, 250).optional().nullable(),
  inventors: z.array(safeStringSchema(2, 120)).max(50, "Too many inventors listed.").optional().default([]),
  filing_date: isoDateSchema.optional().nullable(),
  publication_date: isoDateSchema.optional().nullable(),
  status: z.enum(["Granted", "Pending", "Expired", "Abandoned", "Unknown"]).optional().default("Unknown"),
  jurisdiction: z.string().max(10).optional().default("US"),
  ipc_codes: z.array(z.string().max(20)).max(100).optional().default([]),
  cpc_codes: z.array(z.string().max(20)).max(100).optional().default([]),
  citations: z.coerce.number().int().min(0).max(1000000).optional().default(0),
});

// 5b. Saved Patent Wrapper Schema (for /api/patents/save)
export const SavedPatentSchema = z.object({
  patent: PatentCreateSchema.passthrough(),
});

// 6. Patent Update Schema
export const PatentUpdateSchema = PatentCreateSchema.partial().extend({
  id: z.string().min(1, "Record identifier is required.").max(128, "Invalid record identifier."),
});

// 7. Trademark Creation Schema
export const TrademarkCreateSchema = z.object({
  serial_number: z.string().trim().min(5, "Serial number is too short.").max(30, "Serial number is too long."),
  mark_name: safeStringSchema(2, 300),
  owner: safeStringSchema(2, 250),
  filing_date: isoDateSchema.optional().nullable(),
  status: z.enum(["Live", "Dead", "Pending", "Registered", "Unknown"]).optional().default("Live"),
  goods_and_services: z.string().max(5000, "Goods and services description exceeds length limit.").optional().nullable(),
  class_codes: z.array(z.string().max(10)).max(50).optional().default([]),
});
