import { z } from "zod";

export const WorkspaceDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  description: z.string().optional(),
  content: z.string().optional(),
  status: z.string().default("draft"),
});

export const InventionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  problem_statement: z.string().optional(),
  solution_summary: z.string().optional(),
  technical_field: z.string().optional(),
  status: z.string().default("draft"),
  tags: z.any().optional(),
  metadata: z.record(z.any()).optional(),
});
