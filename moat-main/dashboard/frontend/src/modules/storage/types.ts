export interface FileObject {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
  size?: number;
}

export interface UploadResponse {
  path: string;
  publicUrl: string;
}
