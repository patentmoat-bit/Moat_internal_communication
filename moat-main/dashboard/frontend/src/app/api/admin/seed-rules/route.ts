import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";

// Hardcoded rules from the previous setup
const ROUTING_RULES = [
  {
    eventType: "PROJECT_CREATED",
    toRoles: [], ccRoles: ["Admin"], toProjectFields: ["assigned_to"], ccProjectFields: [],
    subject: "New Patent Project Assigned — {{project_title}}", templateId: "project_created",
  },
  {
    eventType: "PROJECT_UPDATED",
    toRoles: ["CEO"], ccRoles: ["Admin"], toProjectFields: [], ccProjectFields: [],
    subject: "Project Updated — {{project_title}}", templateId: "project_updated",
  },
  {
    eventType: "STATUS_UPDATED",
    toRoles: ["CEO"], ccRoles: ["Admin"], toProjectFields: ["assigned_to"], ccProjectFields: [],
    subject: "Project Status Updated — {{project_title}}", templateId: "status_updated",
  },
  {
    eventType: "COMMENT_ADDED",
    toRoles: ["CEO", "Patent Analyst", "Designer"], ccRoles: ["Admin"], toProjectFields: [], ccProjectFields: [],
    subject: "New Comment Added — {{project_title}}", templateId: "comment_added",
  },
  {
    eventType: "PROJECT_ASSIGNED",
    toRoles: ["Patent Analyst"], ccRoles: ["Admin"], toProjectFields: ["assigned_to"], ccProjectFields: [],
    subject: "Project Assignment — {{project_title}}", templateId: "project_assigned",
  },
  {
    eventType: "RESEARCH_STARTED",
    toRoles: ["CEO"], ccRoles: ["Admin"], toProjectFields: [], ccProjectFields: [],
    subject: "Research Started — {{project_title}}", templateId: "research_started",
  },
  {
    eventType: "DOCUMENT_UPLOADED",
    toRoles: ["CEO"], ccRoles: ["Admin"], toProjectFields: [], ccProjectFields: [],
    subject: "Document Uploaded — {{project_title}}", templateId: "document_uploaded",
  },
  {
    eventType: "DESIGN_REQUESTED",
    toRoles: [], ccRoles: ["CEO"], toProjectFields: ["designer_id"], ccProjectFields: ["assigned_to"],
    subject: "Design Work Required — {{project_title}}", templateId: "design_requested",
  },
  {
    eventType: "DESIGN_STARTED",
    toRoles: [], ccRoles: ["CEO"], toProjectFields: ["assigned_to"], ccProjectFields: [],
    subject: "Design Work Started — {{project_title}}", templateId: "design_started",
  },
  {
    eventType: "DESIGN_COMPLETED",
    toRoles: [], ccRoles: ["CEO"], toProjectFields: ["assigned_to"], ccProjectFields: [],
    subject: "Design Completed — {{project_title}}", templateId: "design_completed",
  },
  {
    eventType: "REPORT_SUBMITTED",
    toRoles: ["CEO"], ccRoles: ["Admin"], toProjectFields: [], ccProjectFields: [],
    subject: "Report Submitted for Review — {{project_title}}", templateId: "report_submitted",
  },
  {
    eventType: "CEO_APPROVED",
    toRoles: ["Patent Analyst"], ccRoles: ["Admin"], toProjectFields: ["assigned_to", "designer_id"], ccProjectFields: [],
    subject: "Project Approved ✓ — {{project_title}}", templateId: "ceo_approved",
  },
  {
    eventType: "CEO_REJECTED",
    toRoles: [], ccRoles: ["Admin"], toProjectFields: ["assigned_to"], ccProjectFields: ["designer_id"],
    subject: "Revision Required — {{project_title}}", templateId: "ceo_rejected",
  },
  {
    eventType: "REVISION_REQUIRED",
    toRoles: [], ccRoles: ["Admin"], toProjectFields: ["assigned_to", "designer_id"], ccProjectFields: [],
    subject: "Revision Required — {{project_title}}", templateId: "revision_required",
  },
  {
    eventType: "REVISION_COMPLETED",
    toRoles: ["CEO"], ccRoles: ["Admin"], toProjectFields: [], ccProjectFields: [],
    subject: "Revision Completed — Ready for Review — {{project_title}}", templateId: "revision_completed",
  },
  {
    eventType: "FILING_STARTED",
    toRoles: ["CEO"], ccRoles: ["Admin"], toProjectFields: [], ccProjectFields: [],
    subject: "Patent Filing Started — {{project_title}}", templateId: "filing_started",
  },
  {
    eventType: "FILED",
    toRoles: ["CEO", "Admin"], ccRoles: [], toProjectFields: ["assigned_to"], ccProjectFields: [],
    subject: "Patent Filed Successfully — {{project_title}}", templateId: "filed",
  },
  {
    eventType: "RENEWAL_REMINDER",
    toRoles: ["CEO", "Patent Analyst", "Admin"], ccRoles: [], toProjectFields: [], ccProjectFields: [],
    subject: "Patent Renewal Reminder — {{project_title}} ({{patent_number}})", templateId: "renewal_reminder",
  },
  {
    eventType: "PROJECT_COMPLETED",
    toRoles: ["CEO", "Patent Analyst", "Admin"], ccRoles: [], toProjectFields: ["assigned_to", "designer_id"], ccProjectFields: [],
    subject: "Project Completed ✓ — {{project_title}}", templateId: "project_completed",
  }
];

export async function POST() {
  const supabase = createAdminClient();
  let count = 0;

  try {
    for (const rule of ROUTING_RULES) {
      // Create template
      const { data: template, error: tErr } = await supabase.from("notification_templates").insert({
        name: `System Template: ${rule.eventType}`,
        subject: rule.subject,
        body_html: `<p>Default template body for ${rule.eventType}</p>`
      }).select("id").single();

      if (tErr || !template) {
        return NextResponse.json({ error: "Template insertion failed", details: tErr }, { status: 500 });
      }

      // Create rule
      const { data: dbRule, error: rErr } = await supabase.from("notification_rules").insert({
        name: `System Rule: ${rule.eventType}`,
        description: `Auto-migrated rule for ${rule.eventType}`,
        event_type: rule.eventType,
        template_id: template.id,
        priority: "Normal",
        status: "Active"
      }).select("id").single();

      if (rErr || !dbRule) {
        return NextResponse.json({ error: "Rule insertion failed", details: rErr }, { status: 500 });
      }

      // Insert recipients
      const recipients = [];
      for (const role of rule.toRoles) {
        recipients.push({ rule_id: dbRule.id, recipient_type: "ROLE", recipient_value: role, routing_type: "TO" });
      }
      for (const field of rule.toProjectFields) {
        recipients.push({ rule_id: dbRule.id, recipient_type: "PROJECT_FIELD", recipient_value: field, routing_type: "TO" });
      }
      for (const role of rule.ccRoles) {
        recipients.push({ rule_id: dbRule.id, recipient_type: "ROLE", recipient_value: role, routing_type: "CC" });
      }
      for (const field of rule.ccProjectFields) {
        recipients.push({ rule_id: dbRule.id, recipient_type: "PROJECT_FIELD", recipient_value: field, routing_type: "CC" });
      }

      if (recipients.length > 0) {
        await supabase.from("notification_recipients").insert(recipients);
      }
      
      count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    return await GlobalExceptionHandler.handle(error);
  }
}
