import { z } from "zod";

export const AlertSchema = z.object({
  name: z.string().min(1, "Name is required"),
  alert_type: z.string().default("keyword"),
  criteria: z.record(z.any()).optional().default({}),
  frequency: z.enum(["instantly", "daily", "weekly", "monthly"]).default("weekly"),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
  delivery_channels: z.array(z.string()).default(["in_app"]),
});
