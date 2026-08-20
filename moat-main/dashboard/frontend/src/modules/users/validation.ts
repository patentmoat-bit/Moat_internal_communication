import { z } from "zod";

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
});
