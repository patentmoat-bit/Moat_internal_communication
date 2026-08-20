import { SupabaseClient } from "@supabase/supabase-js";

export class AuditLogService {
  constructor(private supabase: SupabaseClient) {}

  async logEvent(userId: string, action: string, ipAddress: string, userAgent: string, details?: any) {
    // Write to audit_logs table
    await this.supabase.from("audit_logs").insert({
      user_id: userId,
      event_type: action,
      metadata: details || {},
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }
}
