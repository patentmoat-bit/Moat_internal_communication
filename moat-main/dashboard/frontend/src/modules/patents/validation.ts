import { z } from "zod";

export const CreatePatentProjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().default("filed"),
  filing_region: z.string().default("US"),
});

export const UpdatePatentProjectSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  filing_region: z.string().optional(),
});

export const UpdatePatentStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
});

export const CreatePatentPortfolioSchema = z.object({
  patent_number: z.string().min(1, "Patent number is required"),
  title: z.string().min(1, "Title is required"),
  abstract: z.string().optional(),
  assignee: z.string().optional(),
  filing_date: z.string().optional(),
  status: z.string().optional(),
  estimated_value: z.number().optional(),
});

export const PatentDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  url: z.string().min(1, "URL or Data URI is required"),
  size: z.number().max(50 * 1024 * 1024, "File size must not exceed 50MB").optional(),
  file_type: z.enum([
    "application/pdf", 
    "image/png", 
    "image/jpeg", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/zip",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ], { message: "Invalid file type. Only PDF, PNG, JPEG, Word, Excel, PPT, and ZIP files are allowed." }).optional()
});
