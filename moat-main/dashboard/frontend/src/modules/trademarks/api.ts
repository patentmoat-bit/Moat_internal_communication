import { Trademark, TrademarkFile } from "./types";
import axios from "axios";

export async function fetchTrademarks(filters: { type?: string; status?: string; search?: string } = {}): Promise<Trademark[]> {
  const { data } = await axios.get("/api/trademarks", { params: filters });
  return data.data;
}

export async function fetchTrademark(id: string): Promise<Trademark> {
  const { data } = await axios.get(`/api/trademarks/${id}`);
  return data.data;
}

export async function createTrademark(payload: Partial<Trademark>): Promise<Trademark> {
  const { data } = await axios.post("/api/trademarks", payload);
  return data.data;
}

export async function updateTrademark(id: string, payload: Partial<Trademark>): Promise<void> {
  await axios.put(`/api/trademarks/${id}`, payload);
}

export async function deleteTrademark(id: string): Promise<void> {
  await axios.delete(`/api/trademarks/${id}`);
}

export async function uploadInlineAttachment(trademarkId: string, fileData: { name: string; url: string; size?: number; type?: string }): Promise<TrademarkFile> {
  const { data } = await axios.post(`/api/trademarks/${trademarkId}/attachments`, fileData);
  return data.data;
}

export async function deleteInlineAttachment(trademarkId: string, fileId: string, fileName: string): Promise<void> {
  await axios.delete(`/api/trademarks/${trademarkId}/attachments`, { params: { fileId, fileName } });
}
