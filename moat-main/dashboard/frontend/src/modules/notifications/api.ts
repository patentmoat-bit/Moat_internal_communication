import { Notification } from "./types";
import axios from "axios";

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await axios.get("/api/notifications");
  return data.data;
}

export async function sendNotification(payload: Partial<Notification>): Promise<Notification> {
  const { data } = await axios.post("/api/notifications", payload);
  return data.data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await axios.put(`/api/notifications/${id}/read`);
}
