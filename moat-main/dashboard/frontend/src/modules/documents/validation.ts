import { z } from "zod";

export const PatentDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  project_id: z.string().optional(),
  domain_id: z.string().optional(),
  assigned_to: z.string().default("Patent Analyst"),
});

export const DocumentVersionSchema = z.object({
  file_name: z.string().min(1, "File name is required"),
  file_url: z.string().min(1, "File URL is required"),
  mime_type: z.string().optional(),
  file_size: z.number().max(50 * 1024 * 1024, "File size must not exceed 50MB").optional(),
  notes: z.string().optional(),
  version_number: z.string().optional(),
});

export const WorkflowTransitionSchema = z.object({
  new_status: z.enum([
    "Draft",
    "Draft Created",
    "Uploaded by Patent Analyst",
    "Pending Design Review",
    "Design In Progress",
    "Revised Document Uploaded",
    "Waiting for Patent Analyst Review",
    "Patent Analyst Approved",
    "CEO Approval Pending",
    "CEO Approved",
    "CEO Rejected",
    "Completed",
    "Archived",
    "Under Design Review",
    "Verification Pending",
    "Sent for CEO Approval",
    "Approved",
    "Rejected",
    "Changes Requested",
    "Returned to Designing Team",
    "Revision Requested by CEO"
  ]),
  current_status: z.string().optional(),
  notes: z.string().optional(),
});

export const ReviewCommentSchema = z.object({
  version_id: z.string().uuid("Invalid version ID").optional(),
  comment_text: z.string().min(1, "Comment is required"),
});
