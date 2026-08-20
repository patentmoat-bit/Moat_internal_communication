import { createClient } from "@/lib/supabase/client";

export class UploadService {
  /**
   * Uploads a file to a specified Supabase storage bucket and returns its public URL.
   */
  static async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }
}
