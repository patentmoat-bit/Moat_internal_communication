import { createAdminClient } from "@/lib/supabase/admin";
import { EmailRoutingRule } from "./emailRoutingRules";
import { dispatchEmails } from "./handlers";

export class NotificationRuleEngine {
  
  /**
   * Evaluate if a rule's conditions are met by the event data.
   */
  static async evaluateConditions(ruleId: string, eventData: Record<string, any>): Promise<boolean> {
    const supabase = createAdminClient();
    const { data: conditions, error } = await supabase
      .from("notification_conditions")
      .select("*")
      .eq("rule_id", ruleId);

    if (error || !conditions || conditions.length === 0) {
      return true; // No conditions, always evaluate to true
    }

    for (const condition of conditions) {
      const fieldValue = eventData[condition.field];
      const targetValue = condition.value;

      switch (condition.operator) {
        case "EQUALS":
          if (fieldValue !== targetValue) return false;
          break;
        case "NOT_EQUALS":
          if (fieldValue === targetValue) return false;
          break;
        case "CONTAINS":
          if (typeof fieldValue === 'string' && !fieldValue.includes(targetValue)) return false;
          if (Array.isArray(fieldValue) && !fieldValue.includes(targetValue)) return false;
          break;
        case "GREATER_THAN":
          if (Number(fieldValue) <= Number(targetValue)) return false;
          break;
        case "LESS_THAN":
          if (Number(fieldValue) >= Number(targetValue)) return false;
          break;
        case "IN":
          const targetArray = targetValue.split(",").map((s: string) => s.trim());
          if (!targetArray.includes(String(fieldValue))) return false;
          break;
      }
    }

    return true; // All conditions passed
  }

  /**
   * Pushes an email to the queue (email_logs table) and attempts to send it.
   */
  static async processEmailQueue(
    ruleId: string | undefined, 
    eventType: string, 
    toEmails: string[], 
    ccEmails: string[], 
    subject: string, 
    htmlBody: string
  ) {
    const supabase = createAdminClient();
    
    // 1. Log to DB as Pending
    let logId: string | undefined;
    try {
      const { data } = await supabase.from("email_logs").insert({
        rule_id: ruleId,
        event_type: eventType,
        subject,
        recipients: { to: toEmails, cc: ccEmails },
        status: "Pending"
      }).select("id").single();
      if (data) logId = data.id;
    } catch (e) {
      console.error("Failed to insert email log", e);
    }

    // 2. Dispatch
    try {
      await dispatchEmails(toEmails, ccEmails, subject, htmlBody);
      
      // 3. Mark Sent
      if (logId) {
        await supabase.from("email_logs").update({ 
          status: "Sent", 
          sent_at: new Date().toISOString() 
        }).eq("id", logId);
      }
    } catch (error: any) {
      // 4. Mark Failed
      if (logId) {
        await supabase.from("email_logs").update({ 
          status: "Failed",
          error_message: error.message 
        }).eq("id", logId);
      }
      throw error;
    }
  }
}
