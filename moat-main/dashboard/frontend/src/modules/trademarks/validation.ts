import { z } from "zod";

export const TrademarkSchema = z.object({
  type: z.enum(["word", "logo"]),
  name: z.string().min(1, "Name is required"),
  application_number: z.string().optional(),
  status: z.string().default("Pending"),
  class: z.string().optional(),
  goods_services: z.string().optional(),
  country: z.string().optional(),
  image_url: z.string().optional(),
  metadata: z.object({}).passthrough().default({}),
});

export const TrademarkFileSchema = z.object({
  name: z.string().min(1, "File name is required"),
  url: z.string().min(1, "URL or Data URI is required"),
  size: z.number().max(50 * 1024 * 1024, "File size must not exceed 50MB").optional(),
  type: z.enum([
    "application/pdf", 
    "image/png", 
    "image/jpeg", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/zip"
  ], { message: "Invalid file type. Only PDF, PNG, JPEG, Word, and ZIP files are allowed." }).optional()
});
