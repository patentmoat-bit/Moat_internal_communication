import { z } from "zod";
import { uuidSchema, safeStringSchema } from "./common";

// 9a. Comment Creation Schema
export const CommentCreateSchema = z.object({
  entityId: z.string().max(128, "Invalid target entity identifier."),
  entityType: z.enum(["patent", "trademark", "workflow_task", "report"]).default("patent"),
  content: safeStringSchema(1, 4000),
  parentCommentId: z.string().max(128).optional().nullable(),
  mentions: z.array(z.string().max(128)).max(20).optional().default([]),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
});

// 9b. Highlight Creation Schema
export const HighlightCreateSchema = z.object({
  patentId: z.string().max(128),
  claimNumber: z.coerce.number().int().min(1).max(500).optional(),
  selectedText: safeStringSchema(1, 5000),
  annotation: z.string().max(2000).optional().nullable(),
  color: z.enum(["yellow", "green", "red", "blue", "purple"]).optional().default("yellow"),
});

// 9c. CEO Feedback Schema
export const CeoFeedbackSchema = z.object({
  targetId: z.string().max(128),
  decision: z.enum(["Approved", "Rejected", "Needs Review", "Escalated"]),
  executiveNotes: z.string().max(5000, "Executive notes exceed length limit.").optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium"),
});

// 13. Workflow Update Schema
export const WorkflowUpdateSchema = z.object({
  taskId: z.string().max(128),
  newStatus: z.enum([
    "Draft",
    "In_Review",
    "Analyst_Assigned",
    "CEO_Approval_Pending",
    "Completed",
    "Archived",
  ]),
  assignedTo: z.string().max(128).optional().nullable(),
  transitionNotes: z.string().max(2000).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format.").optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
});
