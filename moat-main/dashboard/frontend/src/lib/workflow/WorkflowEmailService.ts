import crypto from "crypto";
import { WorkflowEmailRecord } from "./types";

/**
 * WorkflowEmailService
 * 
 * Enterprise email dispatch service simulating Microsoft Graph API integrations.
 * 1. Dispatches automated email alerts to role distribution groups (CEO, Patent Analysts, Design Team, Admin).
 * 2. Manages email delivery status tracking and retry queues.
 */
export class WorkflowEmailService {
  private static emailQueue: WorkflowEmailRecord[] = [];

  private static readonly ROLE_EMAILS: Record<string, string> = {
    "CEO": "jothikahaldurai11@gmail.com",
    "Patent Analyst": "rxavier@pinochle.ai",
    "Patent Drafter": "gayyasamy@pinochle.ai",
    "Design Team": "mkrishnan@pinochle.ai",
    "Finance Manager": "nmahalingam@pinochle.ai",
    "Admin": "jhaldurai@pinochle.ai"
  };

  /**
   * Send an automated email notification via Microsoft Graph API.
   */
  static sendEmail(
    recipientRoleOrEmail: string,
    subject: string,
    body: string
  ): WorkflowEmailRecord {
    const recipientEmail = this.ROLE_EMAILS[recipientRoleOrEmail] || recipientRoleOrEmail || "notifications@moat.ai";
    const adminEmail = this.ROLE_EMAILS["Admin"];

    const record: WorkflowEmailRecord = {
      id: `msg_wf_${crypto.randomUUID()}`,
      recipientEmail,
      cc: [adminEmail],
      subject,
      body,
      timestamp: new Date().toISOString(),
      status: "SENT"
    };

    this.emailQueue.unshift(record);
    if (this.emailQueue.length > 1000) this.emailQueue.pop();
    return record;
  }

  /**
   * Retrieve sent or queued emails.
   */
  static getEmails(recipientEmail?: string): WorkflowEmailRecord[] {
    if (!recipientEmail) return [...this.emailQueue];
    return this.emailQueue.filter((e) => e.recipientEmail === recipientEmail || e.recipientEmail === this.ROLE_EMAILS[recipientEmail]);
  }

  static clearRepository(): void {
    this.emailQueue = [];
  }
}
