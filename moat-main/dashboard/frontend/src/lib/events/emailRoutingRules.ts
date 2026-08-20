// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Email Routing Rules
// Maps every workflow event type to TO/CC recipients, subject, and template.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An email routing rule specifies:
 * - Which roles receive the email in TO
 * - Which roles receive the email in CC
 * - Which project fields (e.g. assigned_to) resolve to specific user emails
 * - The email subject template
 */
export interface EmailRoutingRule {
  eventType: string;
  /** Roles whose members all receive the email in TO */
  toRoles: string[];
  /** Roles whose members all receive the email in CC */
  ccRoles: string[];
  /** Project field names (e.g. 'assigned_to') to resolve to specific user emails for TO */
  toProjectFields: string[];
  /** Project field names to resolve for CC */
  ccProjectFields: string[];
  /** Email subject line (can contain {{project_title}} and {{patent_number}} placeholders) */
  subject: string;
  /** Template identifier for per-event email body */
  templateId: string;
}

/**
 * Complete routing table — one rule per event type.
 * Implements the spec's 16 email routing rules.
 */
const ROUTING_RULES: EmailRoutingRule[] = [
  // 1. PROJECT_CREATED — CEO creates project → notify assigned Patent Analyst
  {
    eventType: "PROJECT_CREATED",
    toRoles: ["CEO", "Patent Analyst"],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to"],     // Assigned Patent Analyst
    ccProjectFields: [],
    subject: "New {{project_type}} Project Assigned — {{project_title}}",
    templateId: "project_created",
  },
  
  // 1b. PROJECT_UPDATED — Patent Analyst updates project
  {
    eventType: "PROJECT_UPDATED",
    toRoles: ["CEO"],
    ccRoles: ["Admin"],
    toProjectFields: [],
    ccProjectFields: [],
    subject: "Project Updated — {{project_title}}",
    templateId: "project_updated",
  },

  // 1c. STATUS_UPDATED — Status transition
  {
    eventType: "STATUS_UPDATED",
    toRoles: ["CEO", "Patent Analyst"],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to"],
    ccProjectFields: [],
    subject: "Project Status Updated — {{project_title}}",
    templateId: "status_updated",
  },

  // 1d. COMMENT_ADDED — Comment added to a document
  {
    eventType: "COMMENT_ADDED",
    toRoles: ["CEO", "Patent Analyst", "Designer"],
    ccRoles: ["Admin"],
    toProjectFields: [],
    ccProjectFields: [],
    subject: "New Comment Added — {{project_title}}",
    templateId: "comment_added",
  },

  // 2. PROJECT_ASSIGNED — CEO assigns project
  {
    eventType: "PROJECT_ASSIGNED",
    toRoles: ["Patent Analyst"],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to"],
    ccProjectFields: [],
    subject: "Project Assignment — {{project_title}}",
    templateId: "project_assigned",
  },

  // 3. RESEARCH_STARTED — Patent Analyst starts research
  {
    eventType: "RESEARCH_STARTED",
    toRoles: ["CEO"],
    ccRoles: ["Admin"],
    toProjectFields: [],
    ccProjectFields: [],
    subject: "Research Started — {{project_title}}",
    templateId: "research_started",
  },

  // 4. DOCUMENT_UPLOADED — Patent Analyst uploads document
  {
    eventType: "DOCUMENT_UPLOADED",
    toRoles: ["CEO", "Patent Analyst"],
    ccRoles: ["Admin"],
    toProjectFields: [],
    ccProjectFields: [],
    subject: "Document Uploaded — {{project_title}}",
    templateId: "document_uploaded",
  },

  // 5. DESIGN_REQUESTED — Patent Analyst requests design work
  {
    eventType: "DESIGN_REQUESTED",
    toRoles: ["Design Team"],
    ccRoles: ["CEO", "Admin"],
    toProjectFields: ["designer_id"],      // Assigned Design Team member
    ccProjectFields: ["assigned_to"],      // Patent Analyst in CC
    subject: "Design Work Required — {{project_title}}",
    templateId: "design_requested",
  },

  // 6. DESIGN_STARTED — Design Team begins work
  {
    eventType: "DESIGN_STARTED",
    toRoles: ["Patent Analyst", "CEO"],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to"],      // Patent Analyst
    ccProjectFields: [],
    subject: "Design Work Started — {{project_title}}",
    templateId: "design_started",
  },

  // 7. DESIGN_COMPLETED — Design Team finishes work
  {
    eventType: "DESIGN_COMPLETED",
    toRoles: ["Patent Analyst", "CEO"],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to"],      // Patent Analyst
    ccProjectFields: [],
    subject: "Design Completed — {{project_title}}",
    templateId: "design_completed",
  },

  // 8. REPORT_SUBMITTED — Patent Analyst submits report for CEO Review
  {
    eventType: "REPORT_SUBMITTED",
    toRoles: ["CEO"],
    ccRoles: ["Admin"],
    toProjectFields: [],
    ccProjectFields: [],
    subject: "Report Submitted for Review — {{project_title}}",
    templateId: "report_submitted",
  },

  // 9. CEO_APPROVED — CEO approves project
  {
    eventType: "CEO_APPROVED",
    toRoles: ["Patent Analyst", "Finance Manager", "Patent Drafter"],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to", "designer_id"],
    ccProjectFields: [],
    subject: "Project Approved ✓ — {{project_title}}",
    templateId: "ceo_approved",
  },

  // 10. CEO_REJECTED — CEO rejects / requests revision
  {
    eventType: "CEO_REJECTED",
    toRoles: [],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to"],
    ccProjectFields: ["designer_id"],
    subject: "Revision Required — {{project_title}}",
    templateId: "ceo_rejected",
  },

  // 11. REVISION_REQUIRED — CEO sends back for revision
  {
    eventType: "REVISION_REQUIRED",
    toRoles: [],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to", "designer_id"],
    ccProjectFields: [],
    subject: "Revision Required — {{project_title}}",
    templateId: "revision_required",
  },

  // 12. REVISION_COMPLETED — Patent Analyst completes revision
  {
    eventType: "REVISION_COMPLETED",
    toRoles: ["CEO"],
    ccRoles: ["Admin"],
    toProjectFields: [],
    ccProjectFields: [],
    subject: "Revision Completed — Ready for Review — {{project_title}}",
    templateId: "revision_completed",
  },

  // 13. FILING_STARTED — Patent Analyst starts filing
  {
    eventType: "FILING_STARTED",
    toRoles: ["CEO"],
    ccRoles: ["Admin"],
    toProjectFields: [],
    ccProjectFields: [],
    subject: "{{project_type}} Filing Started — {{project_title}}",
    templateId: "filing_started",
  },

  // 14. FILED — Patent Analyst marks as filed
  {
    eventType: "FILED",
    toRoles: ["CEO", "Admin"],
    ccRoles: [],
    toProjectFields: ["assigned_to"],
    ccProjectFields: [],
    subject: "{{project_type}} Filed Successfully — {{project_title}}",
    templateId: "filed",
  },

  // 15. RENEWAL_REMINDER — Automatic scheduler
  {
    eventType: "RENEWAL_REMINDER",
    toRoles: ["CEO", "Patent Analyst", "Admin"],
    ccRoles: [],
    toProjectFields: [],
    ccProjectFields: [],
    subject: "{{project_type}} Renewal Reminder — {{project_title}} ({{patent_number}})",
    templateId: "renewal_reminder",
  },

  // 16. PROJECT_COMPLETED — Automatic completion
  {
    eventType: "PROJECT_COMPLETED",
    toRoles: ["CEO", "Patent Analyst", "Admin"],
    ccRoles: [],
    toProjectFields: ["assigned_to", "designer_id"],
    ccProjectFields: [],
    subject: "Project Completed ✓ — {{project_title}}",
    templateId: "project_completed",
  },

  // 17. FINANCE_PAYMENT_COMPLETED — Finance completes payment
  {
    eventType: "FINANCE_PAYMENT_COMPLETED",
    toRoles: ["CEO", "Patent Analyst"],
    ccRoles: ["Admin"],
    toProjectFields: ["assigned_to"],
    ccProjectFields: [],
    subject: "Payment Completed — {{project_title}}",
    templateId: "payment_completed",
  },
];

import { createAdminClient } from "@/lib/supabase/admin";
import { HeaderInjectionProtectionService } from "@/lib/security/validation/HeaderInjectionProtectionService";

/**
 * Look up the routing rule for a given event type from the database.
 * Falls back to hardcoded rules if the database tables do not exist yet.
 */
export async function getRoutingRule(eventType: string): Promise<EmailRoutingRule | null> {
  try {
    const supabase = createAdminClient();
    
    // Fetch active rule for the event type
    const { data: ruleData, error } = await supabase
      .from("notification_rules")
      .select(`
        id, 
        event_type, 
        template_id,
        notification_recipients (
          recipient_type, recipient_value, routing_type
        )
      `)
      .eq("event_type", eventType)
      .eq("status", "Active")
      .limit(1)
      .single();

    if (!error && ruleData) {
      // Parse recipients
      const toRoles: string[] = [];
      const ccRoles: string[] = [];
      const toProjectFields: string[] = [];
      const ccProjectFields: string[] = [];

      ruleData.notification_recipients?.forEach((r: any) => {
        if (r.routing_type === "TO") {
          if (r.recipient_type === "ROLE") toRoles.push(r.recipient_value);
          else if (r.recipient_type === "PROJECT_FIELD") toProjectFields.push(r.recipient_value);
        } else if (r.routing_type === "CC") {
          if (r.recipient_type === "ROLE") ccRoles.push(r.recipient_value);
          else if (r.recipient_type === "PROJECT_FIELD") ccProjectFields.push(r.recipient_value);
        }
      });

      return {
        eventType: ruleData.event_type,
        toRoles,
        ccRoles,
        toProjectFields,
        ccProjectFields,
        subject: "", // Will be rendered by TemplateEngine from DB now
        templateId: ruleData.template_id,
        id: ruleData.id
      } as any; 
    }
  } catch (err) {
    console.warn("DB Rule fetch failed, falling back to static rules.", err);
  }

  // Fallback to static rules
  return ROUTING_RULES.find(r => r.eventType === eventType) ?? null;
}

/**
 * Interpolate subject template placeholders and sanitize against CRLF Header Injection.
 */
export function interpolateSubject(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return HeaderInjectionProtectionService.sanitizeEmailHeaderValue(result);
}
