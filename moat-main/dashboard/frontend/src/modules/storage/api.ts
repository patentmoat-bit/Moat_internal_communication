import { UploadResponse } from "./types";
import axios from "axios";

export async function uploadFile(file: File, bucket: string = "documents"): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);

  const { data } = await axios.post("/api/storage/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data.data;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  await axios.delete("/api/storage", { params: { bucket, path } });
}
