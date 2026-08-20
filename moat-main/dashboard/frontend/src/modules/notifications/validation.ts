import { z } from "zod";

export const CreateNotificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().default("system"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  receiver: z.string().min(1, "Receiver ID is required"),
  metadata: z.record(z.any()).optional(),
});
