import { Alert } from "./types";
import axios from "axios";

export async function fetchAlerts(): Promise<Alert[]> {
  const { data } = await axios.get("/api/alerts");
  return data.data;
}

export async function createAlert(payload: Partial<Alert>): Promise<Alert> {
  const { data } = await axios.post("/api/alerts", payload);
  return data.data;
}

export async function updateAlert(id: string, payload: Partial<Alert>): Promise<Alert> {
  const { data } = await axios.put(`/api/alerts/${id}`, payload);
  return data.data;
}

export async function deleteAlert(id: string): Promise<void> {
  await axios.delete(`/api/alerts/${id}`);
}
