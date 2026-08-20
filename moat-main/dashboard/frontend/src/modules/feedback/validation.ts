import { z } from "zod";

export const FeedbackSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().optional(),
  status: z.string().default("open"),
});

export const ApprovalSchema = z.object({
  item_type: z.string().min(1, "Item type is required"),
  item_id: z.string().min(1, "Item ID is required"),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  comments: z.string().optional(),
});
