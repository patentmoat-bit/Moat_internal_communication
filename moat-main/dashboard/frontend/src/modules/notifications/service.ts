import { NotificationsRepository } from "./repository";
import { Notification } from "./types";

export class NotificationsService {
  private repo = new NotificationsRepository();

  async getUserNotifications(receiverId: string): Promise<Notification[]> {
    const { data, error } = await this.repo.findByReceiver(receiverId);
    if (error) {
      console.warn("Could not retrieve notifications, returning empty local fallback.", error.message);
      return [];
    }
    return data || [];
  }

  async sendNotification(payload: Partial<Notification>): Promise<Notification> {
    const { data, error } = await this.repo.create(payload);
    if (error) throw new Error(`Failed to send notification: ${error.message}`);
    return data;
  }

  async markRead(id: string): Promise<void> {
    const { error } = await this.repo.markAsRead(id);
    if (error) throw new Error(`Failed to update notification: ${error.message}`);
  }
}
