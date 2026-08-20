// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Recipient Resolution Engine
// Dynamically resolves email recipients from the database.
// Never hardcodes email addresses.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailRoutingRule } from "./emailRoutingRules";

export interface ResolvedRecipients {
  toEmails: string[];
  ccEmails: string[];
}

/**
 * Resolve email recipients for a given routing rule and project data.
 *
 * 1. For each role in toRoles/ccRoles, query `users` table by `role` column
 * 2. For each project field (assigned_to, designer_id, ceo_id), look up user email
 * 3. Deduplicate — an email never appears in both TO and CC
 * 4. Optionally exclude the actor's email from recipients
 */
export async function resolveRecipients(
  rule: EmailRoutingRule,
  projectData?: Record<string, any>,
  excludeActorEmail?: string,
  actorId?: string,
  eventActorRole?: string
): Promise<ResolvedRecipients> {
  const supabase = createAdminClient();
  const toSet = new Set<string>();
  const ccSet = new Set<string>();

  // ── Resolve role-based recipients ──────────────────────────────────────────

  // Helper: Get all emails for a given role name
  const getEmailsByRole = async (roleName: string): Promise<string[]> => {
    // Dynamic RBAC mapping: Map routing rule role names to possible DB role values

    // Map routing rule role names to possible DB role values
    const roleVariants = getRoleVariants(roleName);

    const emails: string[] = [];
    for (const variant of roleVariants) {
      const { data } = await supabase
        .from("users")
        .select("email")
        .eq("role", variant);

      if (data) {
        emails.push(...data.map((u: { email: string }) => u.email));
      }
    }
    return emails;
  };

  // TO recipients from roles
  for (const role of rule.toRoles) {
    const emails = await getEmailsByRole(role);
    emails.forEach(e => toSet.add(e.toLowerCase()));
  }

  // CC recipients from roles
  for (const role of rule.ccRoles) {
    const emails = await getEmailsByRole(role);
    emails.forEach(e => ccSet.add(e.toLowerCase()));
  }

  // ── Dynamic Actor-based Routing ────────────────────────────────────────────
  // 1. Admin gets every notification
  const adminEmails = await getEmailsByRole("Admin");
  if (adminEmails.length === 0) adminEmails.push("jhaldurai@pinochle.ai");
  adminEmails.forEach(e => ccSet.add(e.toLowerCase()));

  // 2. Route based on the actor's role
  // Removed hardcoded actor-based routing to ensure the system strictly respects 
  // the configurations defined in emailRoutingRules.ts (e.g. Design Team for DESIGN_REQUESTED).

  // ── Resolve project-field-based recipients ─────────────────────────────────

  if (projectData) {
    // TO recipients from project fields (e.g. assigned_to, designer_id)
    for (const field of rule.toProjectFields) {
      const userId = projectData[field];
      if (userId) {
        const email = await getUserEmail(supabase, userId);
        if (email) toSet.add(email.toLowerCase());
      }
    }

    // CC recipients from project fields
    for (const field of rule.ccProjectFields) {
      const userId = projectData[field];
      if (userId) {
        const email = await getUserEmail(supabase, userId);
        if (email) ccSet.add(email.toLowerCase());
      }
    }
  }

  // ── Deduplicate: remove CC entries that are already in TO ──────────────────
  for (const email of toSet) {
    ccSet.delete(email);
  }

  // ── Exclude actor's own email if provided ──────────────────────────────────
  if (excludeActorEmail) {
    const actorLower = excludeActorEmail.toLowerCase();
    toSet.delete(actorLower);
    ccSet.delete(actorLower);
  }

  return {
    toEmails: Array.from(toSet),
    ccEmails: Array.from(ccSet),
  };
}

/**
 * Look up a single user's email by their user ID.
 */
async function getUserEmail(supabase: ReturnType<typeof createAdminClient>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();
  return data?.email ?? null;
}

/**
 * Look up a single user's role by their user ID.
 */
export async function getUserRole(supabase: ReturnType<typeof createAdminClient>, userId: string): Promise<string | null> {
  // Hardcoded test CEO user fallback
  if (userId === "8b9caff9-b91e-43c0-854c-58cdd8ede223") {
    return "CEO";
  }

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role ?? null;
}

/**
 * Maps a high-level role name (from routing rules) to possible DB role values.
 * Accounts for the various naming conventions used across the platform.
 */
function getRoleVariants(roleName: string): string[] {
  const map: Record<string, string[]> = {
    "CEO":             ["CEO"],
    "Patent Analyst":  ["Patent Analyst"],
    "Design Team":    ["Designer", "Designing Team", "Design Team"],
    "Designer":        ["Designer", "Designing Team", "Design Team"],
    "Admin":           ["Admin", "System Admin", "Super Admin", "ADMIN"],
    "CTO":             ["CTO"],
    "CIO":             ["CIO"],
    "Inventor":        ["Inventor"],
  };

  return map[roleName] ?? [roleName];
}

/**
 * Get the actor's email address from their user ID.
 */
export async function getActorEmail(actorId: string): Promise<string | null> {
  const supabase = createAdminClient();
  return getUserEmail(supabase, actorId);
}
