import { createAdminClient } from "@/lib/supabase/admin";
import { Feedback, Approval, AuditLog } from "./types";

export class FeedbackRepository {
  private supabase = createAdminClient();

  async create(data: Partial<Feedback>) {
    return await this.supabase
      .from("feedback")
      .insert(data)
      .select()
      .single();
  }

  async list() {
    return await this.supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async createApproval(data: Partial<Approval>) {
    return await this.supabase
      .from("approvals")
      .insert(data)
      .select()
      .single();
  }

  async listApprovals() {
    return await this.supabase
      .from("approvals")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async logAudit(data: Partial<AuditLog>) {
    return await this.supabase
      .from("audit_logs")
      .insert(data);
  }
}
