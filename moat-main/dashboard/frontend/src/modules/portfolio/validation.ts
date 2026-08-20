import { z } from "zod";

export const PortfolioPatentSchema = z.object({
  patent_number: z.string().min(1, "Patent number is required"),
  title: z.string().min(1, "Title is required"),
  abstract: z.string().optional(),
  assignee: z.string().optional(),
  filing_date: z.string().optional(),
  status: z.string().optional(),
  estimated_value: z.number().optional(),
  region: z.string().optional(),
});
