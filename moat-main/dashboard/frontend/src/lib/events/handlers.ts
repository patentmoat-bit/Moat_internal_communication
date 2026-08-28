// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Workflow Event Handlers
// Processes all events: audit, workflow, notification, and email dispatch.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmailTemplate, getEventEmailContent } from "./emailTemplates";
import { getRoutingRule, interpolateSubject } from "./emailRoutingRules";
import { NotificationRuleEngine } from "./NotificationRuleEngine";
import { resolveRecipients, getActorEmail, getUserRole } from "./recipientResolver";
import { getNextStatus, canTransition, type WorkflowStatus } from "./workflowStateMachine";
import type { EventPayload } from "./eventBus";
import fs from "fs";
import path from "path";

// ─── Email Config Loader ──────────────────────────────────────────────────────

const EMAIL_CONFIG_PATH = path.join(process.cwd(), "src/app/api/settings/email/email_config.json");

interface EmailConfig {
  provider: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fromName: string;
  fromEmail: string;
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    // Try reading from the workspace_documents table first (matches settings page)
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("workspace_documents")
      .select("content")
      .eq("name", "SYSTEM_EMAIL_CONFIG")
      .single();

    if (data?.content) {
      const parsed = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
      if (parsed.clientId && parsed.clientSecret && parsed.tenantId) {
        return parsed as EmailConfig;
      }
    }
  } catch {
    // Fall through to file-based config
  }

  // Fallback: read from local file
  try {
    if (fs.existsSync(EMAIL_CONFIG_PATH)) {
      const raw = fs.readFileSync(EMAIL_CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw);

      // Secure fallback: inject from environment if available. The committed
      // config file only holds non-secret placeholders; real tenant/client
      // identifiers and the client secret are supplied via env vars.
      if (process.env.AZURE_TENANT_ID) {
        parsed.tenantId = process.env.AZURE_TENANT_ID;
      }
      if (process.env.AZURE_CLIENT_ID) {
        parsed.clientId = process.env.AZURE_CLIENT_ID;
      }
      if (process.env.MS_GRAPH_CLIENT_SECRET) {
        parsed.clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
      }

      if (parsed.clientId && parsed.clientSecret && parsed.tenantId) {
        return parsed as EmailConfig;
      }
    }
  } catch (err) {
    console.error("[EmailConfig] Failed to read config file:", err);
  }

  return null;
}

// ─── MS Graph Token Cache ─────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getMSGraphToken(config: EmailConfig): Promise<string | null> {
  // Return cached token if still valid (with 2-min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 120000) {
    return cachedToken.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!res.ok) {
    console.error("[MSGraph] Auth failed:", await res.text());
    return null;
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AUDIT LOG HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export const handleAuditLog = async (event: EventPayload) => {
  const supabase = createAdminClient();
  try {
    const newStatus = getNextStatus(event.type);

    // Get the old status from the project if available
    let oldStatus: string | null = null;
    if (event.resourceId && event.resourceType) {
      let table = "inventions";
      if (event.resourceType === "trademark") table = "trademarks";
      else if (event.resourceType === "copyright") table = "copyrights";

      const { data: resource } = await supabase
        .from(table)
        .select("status")
        .eq("id", event.resourceId)
        .single();
      oldStatus = resource?.status ?? null;
    }

    // Previously inserted action/performed_by/details, none of which exist
    // on the real audit_logs table (event_type/actor_id/metadata/entity_*
    // do) — every single event published through this handler silently
    // failed to write an audit row.
    const { error: auditInsertError } = await supabase.from("audit_logs").insert({
      event_type: event.type,
      actor_id: event.actorId || null,
      entity_type: event.resourceType,
      entity_id: event.resourceId,
      metadata: {
        actorRole: event.actorRole,
        metadata: event.metadata,
        notificationTitle: event.notificationTitle,
      },
      ...(newStatus ? { old_status: oldStatus, new_status: newStatus } : {}),
      ...(event.resourceId ? { project_id: event.resourceId } : {}),
    });
    if (auditInsertError) throw auditInsertError;

    console.log(`[Audit] Logged: ${event.type} by ${event.actorId || "System"}`);
  } catch (error) {
    console.error("[Audit] Log failed:", error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. WORKFLOW STATUS UPDATE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export const handleWorkflowUpdate = async (event: EventPayload) => {
  if (!event.resourceId) return;

  const supabase = createAdminClient();
  let table = "inventions";
  if (event.resourceType === "trademark") table = "trademarks";
  else if (event.resourceType === "copyright") table = "copyrights";

  try {
    const newStatus = getNextStatus(event.type);
    if (!newStatus) return; // This event doesn't trigger a status change

    // Get current status
    const { data: resource } = await supabase
      .from(table)
      .select("status")
      .eq("id", event.resourceId)
      .single();

    const oldStatus = resource?.status as WorkflowStatus | undefined;

    // Validate transition (if we have a current status)
    if (oldStatus && !canTransition(oldStatus, newStatus)) {
      console.warn(
        `[Workflow] Invalid transition: ${oldStatus} → ${newStatus} for ${event.resourceId}. Allowing for flexibility.`
      );
      // We still proceed — the state machine warns but doesn't block.
      // In production, you might want to throw here.
    }

    // Update project status
    await supabase
      .from(table)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", event.resourceId);

    // Log to workflow history
    await supabase.from("workflow_history").insert({
      resource_type: event.resourceType || "invention",
      resource_id: event.resourceId,
      old_status: oldStatus || null,
      new_status: newStatus,
      changed_by: event.actorId || "System",
      metadata: {
        event_type: event.type,
        ...event.metadata,
      },
    });

    console.log(`[Workflow] ${event.resourceId}: ${oldStatus || "?"} → ${newStatus}`);
  } catch (error) {
    console.error("[Workflow] Update failed:", error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. NOTIFICATION HANDLER (Multi-Recipient)
// ═══════════════════════════════════════════════════════════════════════════════

export const handleNotification = async (event: EventPayload) => {
  const supabase = createAdminClient();
  // Declared here (not inside the try block) so the catch block's local-file
  // fallback can still see whatever recipients were resolved before the
  // Supabase insert failed, instead of throwing ReferenceError and losing the
  // notification entirely.
  const userIds = new Set<string>();

  try {
    // Determine which roles should receive notifications
    const rule = await getRoutingRule(event.type);

    // Collect all role names that should be notified
    const notifyRoles = new Set<string>();

    if (rule) {
      // Use routing rules to determine recipients
      rule.toRoles.forEach(r => notifyRoles.add(r));
      rule.ccRoles.forEach(r => notifyRoles.add(r));
    } else if (event.targetRole) {
      // Fallback to legacy targetRole
      notifyRoles.add(event.targetRole);
    } 

    // Always notify Admin
    notifyRoles.add("Admin");

    // Dynamic Actor-based routing removed to strictly respect routing rules

    if (notifyRoles.size === 0 && !rule) {
      return; // No routing rule and no target role — skip
    }

    // Resolve all user IDs for the roles
    // Role-based resolution
    for (const roleName of notifyRoles) {
      // 1. Add the role name as a broadcast receiver (picked up by currentRole in UI)
      userIds.add(roleName);

      // 2. Add individual UUIDs for each user in that role
      const roleVariants = getRoleVariants(roleName);
      
      // Phase 20 Schema: Join with roles table
      for (const variant of roleVariants) {
        const { data: users } = await supabase
          .from("users")
          .select("uuid, id, roles!inner(role_name)")
          .eq("roles.role_name", variant);
          
        if (users) {
          users.forEach((u: any) => {
            if (u.uuid) userIds.add(u.uuid);
            else userIds.add(u.id); // Legacy fallback
          });
        }
      }
    }

    // Project-field resolution (assigned_to, designer_id, etc.)
    if (rule && event.projectData) {
      for (const field of [...rule.toProjectFields, ...rule.ccProjectFields]) {
        const userId = event.projectData[field];
        if (userId) userIds.add(userId);
      }
    }

    if (userIds.size === 0) return;

    const notificationsToInsert = Array.from(userIds).map(userId => ({
      id: require('crypto').randomUUID ? require('crypto').randomUUID() : Math.random().toString(36).substring(7),
      title: event.notificationTitle || `Workflow Update: ${event.type.replace(/_/g, " ")}`,
      description: event.notificationMessage || "",
      type: "workflow",
      priority: event.priority || "normal",
      receiver: userId,
      metadata: {
        event_type: event.type,
        resource_id: event.resourceId,
        resource_type: event.resourceType,
        action_url: event.actionUrl,
        ...event.metadata,
      },
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase.from("notifications").insert(notificationsToInsert);
    if (error) throw error;
    console.log(`[Notification] Created ${notificationsToInsert.length} notifications for event ${event.type}`);
  } catch (error: any) {
    console.error("[Notification] Supabase Failed, using local DB:", error.message);
    try {
      const fs = require('fs');
      const path = require('path');
      const dirPath = path.join(process.cwd(), 'src', 'app', 'api', 'alerts');
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      const dbPath = path.join(dirPath, 'local_db.json');
      
      let db = { notifications: [] as any[] };
      if (fs.existsSync(dbPath)) {
        db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      }
      
      const fallbackNotifications = Array.from(userIds).map(userId => ({
        id: require('crypto').randomUUID ? require('crypto').randomUUID() : Math.random().toString(36).substring(7),
        title: event.notificationTitle || `Workflow Update: ${event.type.replace(/_/g, " ")}`,
        description: event.notificationMessage || "",
        type: "workflow",
        priority: event.priority || "normal",
        receiver: userId,
        metadata: {
          event_type: event.type,
          resource_id: event.resourceId,
          resource_type: event.resourceType,
          action_url: event.actionUrl,
          ...event.metadata,
        },
        is_read: false,
        created_at: new Date().toISOString()
      }));

      db.notifications.unshift(...fallbackNotifications);
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      console.log(`[Notification] Saved ${fallbackNotifications.length} notifications to local fallback db.`);
    } catch (fsErr) {
      console.error("Local notification fallback failed:", fsErr);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EMAIL DISPATCH HANDLER (TO + CC via Microsoft Graph)
// ═══════════════════════════════════════════════════════════════════════════════

export const handleEmailDispatch = async (event: EventPayload) => {
  const supabase = createAdminClient();

  try {
    const rule = await getRoutingRule(event.type);
    if (!rule) {
      console.log(`[Email] No routing rule for event: ${event.type}, skipping email.`);
      return;
    }

    // 1.b Evaluate Rule Conditions (if from DB)
    if ((rule as any).id) {
      const passed = await NotificationRuleEngine.evaluateConditions((rule as any).id, event.metadata || {});
      if (!passed) {
        console.log(`[Email] Conditions not met for rule: ${event.type}, skipping email.`);
        return;
      }
    }

    // 2. Get email configuration
    const config = await getEmailConfig();
    let hasGraphConfig = true;
    if (!config || !config.clientId || !config.clientSecret || !config.tenantId) {
      console.log("[Email] MS Graph not configured. Will simulate email dispatch for testing.");
      hasGraphConfig = false;
    }

    // 3. Resolve recipients
    const actorEmail = event.actorId ? await getActorEmail(event.actorId) : undefined;
    const { toEmails, ccEmails } = await resolveRecipients(
      rule,
      event.projectData,
      undefined, // Don't exclude actor — they might need the confirmation email
      event.actorId,
      event.actorRole
    );

    if (toEmails.length === 0 && ccEmails.length === 0) {
      console.log(`[Email] No recipients resolved for event: ${event.type}`);
      return;
    }

    // 4. Get MS Graph access token (only if configured)
    let accessToken: string | null = null;
    if (hasGraphConfig) {
      accessToken = await getMSGraphToken(config!);
      if (!accessToken) {
        console.error("[Email] Failed to obtain MS Graph token.");
        await logEmail(supabase, rule, event, toEmails, ccEmails, "Failed", "Auth failed");
        return;
      }
    }

    let pType = "Patent";
    if (event.resourceType === "trademark") pType = "Trademark";
    if (event.resourceType === "copyright") pType = "Copyright";

    // 5. Build email content
    const subjectData: Record<string, string> = {
      project_title: event.projectData?.title || event.metadata?.title || "Untitled Project",
      patent_number: event.projectData?.patent_number || event.metadata?.patent_number || "",
      project_type: pType,
    };
    const subject = interpolateSubject(rule.subject, subjectData);

    const { heading, body } = getEventEmailContent(event.type, event.metadata || {}, event.resourceType, subjectData.project_title);
    // For status updates, try to fetch the previous status from workflow_history or audit_logs if not provided in metadata
    let previousStatus = event.metadata?.old_status;
    let currentStatus = event.metadata?.new_status || getNextStatus(event.type) || event.projectData?.status || event.type;

    
    if (event.type === "STATUS_UPDATED" && !previousStatus && event.resourceId) {
      try {
        const { data: history } = await supabase
          .from("workflow_history")
          .select("old_status")
          .eq("resource_id", event.resourceId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (history?.old_status) {
          previousStatus = history.old_status;
        }
      } catch (e) {
        // Ignore
      }
    }

    const emailTableMetadata: Record<string, string> = {
      project: subjectData.project_title,
    };

    if (event.type === "STATUS_UPDATED" && previousStatus) {
      emailTableMetadata.previous_status = previousStatus;
      emailTableMetadata.new_status = currentStatus;
    } else {
      emailTableMetadata.status = currentStatus;
    }

    if (subjectData.patent_number) emailTableMetadata.patent_number = subjectData.patent_number;
    if (event.metadata?.assigned_to_name) emailTableMetadata.assigned_to = event.metadata.assigned_to_name;
    if (event.metadata?.due_date) emailTableMetadata.due_date = event.metadata.due_date;
    if (event.actorRole) emailTableMetadata.action_by = event.actorRole;

    const htmlBody = generateEmailTemplate(
      heading,
      body,
      undefined,
      undefined,
      emailTableMetadata
    );

    // 6. Build Graph API payload
    const toRecipients = toEmails.map(email => ({
      emailAddress: { address: email },
    }));
    const ccRecipients = ccEmails.map(email => ({
      emailAddress: { address: email },
    }));

    const emailPayload: any = {
      message: {
        subject,
        body: { contentType: "HTML", content: htmlBody },
        toRecipients,
      },
      saveToSentItems: "true",
    };

    if (ccRecipients.length > 0) {
      emailPayload.message.ccRecipients = ccRecipients;
    }

    // 7. Send via Microsoft Graph with retry (or simulate if no config)
    let success = false;
    let errorMsg = "";

    if (hasGraphConfig) {
      try {
        await dispatchEmails(toEmails, ccEmails, subject, htmlBody);
        success = true;
      } catch (err: any) {
        errorMsg = err.message;
      }
    } else {
      // Simulate successful send for testing purposes
      console.log("[Email] SIMULATED SEND to:", toRecipients, "CC:", ccRecipients);
      success = true;
      errorMsg = "Simulated (No MS Graph Config)";
    }

    // 8. Log email to database
    await logEmail(supabase, rule, event, toEmails, ccEmails, success ? (hasGraphConfig ? "Sent" : "Sent (Simulated)") : "Failed", errorMsg);

    // 9. Update audit log with email_sent flag
    if (event.resourceId) {
      try {
        const { data: latestAudit } = await supabase
          .from("audit_logs")
          .select("id")
          .eq("event_type", event.type)
          .eq("actor_id", event.actorId || null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestAudit) {
          await supabase
            .from("audit_logs")
            .update({ email_sent: success, notification_sent: true })
            .eq("id", latestAudit.id);
        }
      } catch {
        // Non-critical — audit update failure shouldn't break the flow
      }
    }

    if (success) {
      console.log(`[Email] Sent: ${event.type} → TO: ${toEmails.join(", ")}${ccEmails.length > 0 ? ` | CC: ${ccEmails.join(", ")}` : ""}`);
    } else {
      console.error(`[Email] Failed after retries: ${event.type} — ${errorMsg}`);
    }
  } catch (error) {
    console.error("[Email] Dispatch failed:", error);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function logEmail(
  supabase: ReturnType<typeof createAdminClient>,
  rule: any,
  event: EventPayload,
  toEmails: string[],
  ccEmails: string[],
  status: string,
  errorMsg?: string
) {
  try {
    const recipientsObj = { to: toEmails, cc: ccEmails };
    
    // Check if we have a valid UUID for the rule ID from the database rule
    // Fallback to null if it's a static rule with no DB ID
    const ruleId = rule.id && rule.id.length === 36 ? rule.id : null;

    await supabase.from("email_logs").insert({
      rule_id: ruleId,
      event_type: event.type,
      subject: rule.subject,
      recipients: recipientsObj,
      status,
      error_message: errorMsg,
      sent_at: status.includes("Sent") ? new Date().toISOString() : null
    });
  } catch (err) {
    console.error("[Email] Failed to log email to email_logs:", err);
  }
}

function getRoleVariants(roleName: string): string[] {
  const map: Record<string, string[]> = {
    CEO: ["CEO"],
    "Patent Analyst": ["Patent Analyst"],
    "Design Team": ["Designer", "Designing Team", "Design Team"],
    Designer: ["Designer", "Designing Team", "Design Team"],
    Admin: ["Admin", "System Admin", "Super Admin", "ADMIN"],
    CTO: ["CTO"],
    CIO: ["CIO"],
    Inventor: ["Inventor"],
  };
  return map[roleName] ?? [roleName];
}

export const dispatchEmails = async (toEmails: string[], ccEmails: string[], subject: string, htmlBody: string) => {
  const config = await getEmailConfig();
  if (!config || !config.clientId || !config.clientSecret || !config.tenantId) {
    console.log("[Email] SIMULATED SEND to:", toEmails, "CC:", ccEmails);
    return;
  }

  const accessToken = await getMSGraphToken(config);
  if (!accessToken) {
    throw new Error("Failed to obtain MS Graph token");
  }

  const toRecipients = toEmails.map(email => ({ emailAddress: { address: email } }));
  const ccRecipients = ccEmails.map(email => ({ emailAddress: { address: email } }));

  const emailPayload: any = {
    message: {
      subject,
      body: { contentType: "HTML", content: htmlBody },
      toRecipients,
    },
    saveToSentItems: "true",
  };

  if (ccRecipients.length > 0) {
    emailPayload.message.ccRecipients = ccRecipients;
  }

  const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`;
  let retries = 3;
  let success = false;
  let lastError = "";

  while (retries > 0 && !success) {
    const mailRes = await fetch(sendMailUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (mailRes.ok) {
      success = true;
    } else {
      retries--;
      lastError = await mailRes.text();
      if (retries > 0) await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!success) {
    throw new Error(`MS Graph API Error: ${lastError}`);
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// 5. FINANCE WORKFLOW HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export const handleFinanceWorkflow = async (event: EventPayload) => {
  if (event.type !== "CEO_APPROVED" || !event.resourceId) return;

  const supabase = createAdminClient();

  try {
    // Determine the resource type and get project info
    let table = "inventions";
    let ipType = "PATENT";
    if (event.resourceType === "trademark") {
      table = "trademarks";
      ipType = "TRADEMARK";
    } else if (event.resourceType === "copyright") {
      table = "copyrights";
      ipType = "COPYRIGHT";
    }

    const { data: project } = await supabase
      .from(table)
      .select("id, title")
      .eq("id", event.resourceId)
      .single();

    if (!project) return;

    // Check if a transaction already exists
    const { data: existingTx } = await supabase
      .from("finance_transactions")
      .select("id")
      .eq("project_id", event.resourceId)
      .single();

    if (existingTx) return; // Transaction already created

    // Create Finance Transaction
    const { data: tx, error } = await supabase
      .from("finance_transactions")
      .insert({
        project_id: event.resourceId,
        project_title: project.title,
        ip_type: ipType,
        payment_status: "PENDING",
        ceo_approval_status: "APPROVED",
        ceo_approved_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (error) {
      console.error("[FinanceWorkflow] Error creating transaction:", error);
      return;
    }

    console.log(`[FinanceWorkflow] Created transaction ${tx.id} for project ${event.resourceId}`);

    // Create a notification for Finance Managers
    const { data: financeUsers } = await supabase
      .from("users")
      .select("id")
      .eq("role", "Finance Manager");

    if (financeUsers && financeUsers.length > 0) {
      const notifications = financeUsers.map((u: any) => ({
        id: require('crypto').randomUUID ? require('crypto').randomUUID() : Math.random().toString(36).substring(7),
        title: "New Payment Pending",
        description: `Project "${project.title}" was approved by the CEO and requires payment processing.`,
        type: "workflow",
        priority: "high",
        receiver: u.id,
        metadata: {
          event_type: "FINANCE_TASK_CREATED",
          resource_id: event.resourceId,
          resource_type: event.resourceType,
          action_url: `/dashboard/finance`
        },
        is_read: false,
        created_at: new Date().toISOString()
      }));

      await supabase.from("notifications").insert(notifications);
    }
  } catch (error) {
    console.error("[FinanceWorkflow] Error:", error);
  }
};
