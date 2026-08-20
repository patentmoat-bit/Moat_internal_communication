import { z } from "zod";
import { paginationSchema } from "./common";

// Search Filter Option Schema
export const SearchFilterSchema = z.object({
  status: z.array(z.string().max(30)).max(20).optional(),
  jurisdiction: z.array(z.string().max(10)).max(50).optional(),
  assignees: z.array(z.string().max(250)).max(50).optional(),
  inventors: z.array(z.string().max(120)).max(50).optional(),
  ipc_codes: z.array(z.string().max(20)).max(50).optional(),
  cpc_codes: z.array(z.string().max(20)).max(50).optional(),
  dateRange: z
    .object({
      from: z.string().max(30).optional().nullable(),
      to: z.string().max(30).optional().nullable(),
    })
    .optional(),
  minCitations: z.coerce.number().int().min(0).max(1000000).optional(),
  maxCitations: z.coerce.number().int().min(0).max(1000000).optional(),
});

// 10. Search Request Schema
export const SearchRequestSchema = z.object({
  query: z.string().max(2000, "Search query exceeds maximum allowed length.").optional().default(""),
  searchType: z
    .enum(["keyword", "semantic", "hybrid", "numbers", "assignee", "inventor"])
    .optional()
    .default("keyword"),
  options: paginationSchema
    .extend({
      searchModes: z.array(z.string().max(30)).max(10).optional(),
      filters: SearchFilterSchema.optional(),
      useAI: z.boolean().optional().default(false),
      highlightMatches: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
});
