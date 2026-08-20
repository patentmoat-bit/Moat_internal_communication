import { FeedbackRepository } from "./repository";
import { Feedback, Approval } from "./types";

export class FeedbackService {
  private repo = new FeedbackRepository();

  async getFeedbackList(): Promise<Feedback[]> {
    const { data, error } = await this.repo.list();
    if (error) {
      console.warn("Could not retrieve feedback list, returning empty list.", error.message);
      return [];
    }
    return data || [];
  }

  async submitFeedback(payload: Partial<Feedback>): Promise<Feedback> {
    const { data, error } = await this.repo.create(payload);
    if (error) throw new Error(`Failed to submit feedback: ${error.message}`);
    
    // Log action to audit logs
    await this.repo.logAudit({
      action: "Submitted feedback",
      performed_by: payload.created_by || "System",
      details: { title: payload.title }
    });

    return data;
  }

  async createApproval(payload: Partial<Approval>): Promise<Approval> {
    const { data, error } = await this.repo.createApproval(payload);
    if (error) throw new Error(`Failed to create approval transaction: ${error.message}`);
    
    await this.repo.logAudit({
      action: `Status Approval - ${payload.status}`,
      performed_by: payload.approved_by || "CEO",
      details: { item_type: payload.item_type, item_id: payload.item_id }
    });

    return data;
  }

  async getApprovals(): Promise<Approval[]> {
    const { data, error } = await this.repo.listApprovals();
    if (error) {
      console.warn("Could not retrieve approvals list, returning empty list.", error.message);
      return [];
    }
    return data || [];
  }
}
