import crypto from "crypto";
import { WorkflowNotificationRecord } from "./types";

/**
 * WorkflowNotificationService
 * 
 * Enterprise in-app notification engine for the MOAT Patent Intelligence Platform.
 * 1. Creates targeted internal notifications and UI alert banners when workflow stages change or SLA breaches occur.
 * 2. Provides role-filtered and user-filtered alert queries for dashboard widgets.
 */
export class WorkflowNotificationService {
  private static notifications: WorkflowNotificationRecord[] = [];

  /**
   * Create an internal workflow alert notification.
   */
  static createNotification(
    workflowId: string,
    recipientRole: string,
    title: string,
    message: string,
    recipientUserId?: string
  ): WorkflowNotificationRecord {
    const record: WorkflowNotificationRecord = {
      id: `ntf_wf_${crypto.randomUUID()}`,
      workflowId,
      recipientRole,
      recipientUserId,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.notifications.unshift(record);
    if (this.notifications.length > 2000) this.notifications.pop();
    return record;
  }

  /**
   * Retrieve notifications filtered by role or user.
   */
  static getNotifications(filter?: { recipientRole?: string; recipientUserId?: string; unreadOnly?: boolean }): WorkflowNotificationRecord[] {
    if (!filter) return [...this.notifications];

    return this.notifications.filter((n) => {
      if (filter.recipientRole && n.recipientRole !== filter.recipientRole) return false;
      if (filter.recipientUserId && n.recipientUserId !== filter.recipientUserId) return false;
      if (filter.unreadOnly && n.read) return false;
      return true;
    });
  }

  /**
   * Mark a notification as read.
   */
  static markAsRead(notificationId: string): boolean {
    const notif = this.notifications.find((n) => n.id === notificationId);
    if (!notif) return false;
    notif.read = true;
    return true;
  }

  static clearRepository(): void {
    this.notifications = [];
  }
}
