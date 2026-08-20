import { createAdminClient } from "@/lib/supabase/admin";

export class StorageRepository {
  private supabase = createAdminClient();

  async uploadFile(bucket: string, path: string, fileBuffer: Buffer, contentType?: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        upsert: true
      });
    return { data, error };
  }

  async getPublicUrl(bucket: string, path: string) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, path: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);
    return { data, error };
  }
}
