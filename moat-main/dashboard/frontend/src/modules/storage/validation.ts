import { z } from "zod";

export const FileDeleteSchema = z.object({
  bucket: z.string().min(1, "Bucket name is required"),
  path: z.string().min(1, "File path is required"),
});
