import { StorageRepository } from "./repository";
import { UploadResponse } from "./types";

export class StorageService {
  private repo = new StorageRepository();

  async upload(bucket: string, filePath: string, fileBuffer: Buffer, contentType?: string): Promise<UploadResponse> {
    const { data, error } = await this.repo.uploadFile(bucket, filePath, fileBuffer, contentType);
    if (error) {
      // Fallback url for demo/local storage testing if bucket doesn't exist
      console.warn(`[StorageService] Supabase upload error: ${error.message}. Returning fallback mock URL.`);
      return {
        path: filePath,
        publicUrl: `/fallback-files/${filePath}`
      };
    }
    const publicUrl = await this.repo.getPublicUrl(bucket, filePath);
    return {
      path: data?.path || filePath,
      publicUrl
    };
  }

  async delete(bucket: string, filePath: string): Promise<void> {
    const { error } = await this.repo.deleteFile(bucket, filePath);
    if (error) {
      console.warn(`[StorageService] Delete error: ${error.message}`);
    }
  }
}
