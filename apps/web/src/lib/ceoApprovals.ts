import { readJson, writeJson } from "./jsonStore";
import type { ApprovalItem, ApprovalStatus, ApprovalAuditRecord, ApprovalsSummaryStats } from "@/types/approvals";

/** CEO approval queue, derived from claim sets the analyst has signed off.
 *  The CEO's own decisions are the only state stored here. */

interface Decision {
  status: ApprovalStatus;
  reason?: string;
  by: string;
  at: string;
  audit: ApprovalAuditRecord[];
}

const FILE = "ceo-approvals.json";

interface ClaimSet {
  id: string;
  invention_id: string;
  version: number;
  status: string;
  owner?: string;
  created_at: string;
  last_modified: string;
  claims: { number: number; type: string; text: string }[];
}

export const loadDecisions = () => readJson<Record<string, Decision>>(FILE, {});
export const saveDecisions = (d: Record<string, Decision>) => writeJson(FILE, d);
export const loadClaimSets = () => readJson<ClaimSet[]>("claims.json", []);
import { load as loadMatters } from "./matterStore";

export function buildItems(): ApprovalItem[] {
  const decisions = loadDecisions();
  const assignments = readJson<{ invention_id?: string; title?: string; assignee?: string }[]>("assignments.json", []);

  const claimItems = loadClaimSets()
    // Analyst-approved sets enter the queue; so does anything the CEO already ruled on.
    .filter((c) => c.status === "APPROVED" || decisions[c.id])
    .map((c): ApprovalItem => {
      const d = decisions[c.id];
      const asg = assignments.find((a) => a.invention_id === c.invention_id);
      const preview = c.claims.map((cl) => `${cl.number}. ${cl.text}`).join("\n\n");
      const when = d?.at ?? c.last_modified;
      return {
        id: c.id,
        matter_id: c.invention_id,
        name: asg?.title ?? `Patent claims ${c.invention_id}`,
        type: "Patent Filing",
        owner: c.owner ?? asg?.assignee ?? "Unassigned",
        assigned_team: "Patent Drafting",
        current_stage: d ? d.status : "Executive approval",
        submitted_by: c.owner ?? "Patent Drafter",
        submitted_date: c.last_modified,
        priority: "High",
        deadline: "",
        status: d?.status ?? "Pending Approval",
        summary: `Claim set v${c.version} for ${c.invention_id} passed analyst review.`,
        recommendation: "Analyst-approved. Executive sign-off releases it for filing.",
        risk_level: "Medium",
        documents: [
          {
            id: `${c.id}-claims`,
            name: `Claims v${c.version}`,
            document_type: "claims",
            display_type: "Claim set",
            current_version: `v${c.version}`,
            file_type: "txt",
            uploaded_by: c.owner ?? "Patent Drafter",
            uploaded_at: c.last_modified,
            status: d?.status === "Approved" ? "Approved" : d?.status === "Rework Required" ? "Rework Required" : "CEO Review",
            content_preview: preview,
            versions: [],
          },
        ],
        audit_history: d?.audit ?? [],
        rework_comments: d?.status === "Rework Required" ? d.reason : undefined,
        rejection_reason: d?.status === "Rejected" ? d.reason : undefined,
        created_at: c.created_at,
        updated_at: when,
      };
    });

  const matters = loadMatters();
  const matterItems: ApprovalItem[] = matters
    .filter((m) => m.stage === "FINAL_APPROVAL" || decisions[m.id])
    .map((m): ApprovalItem => {
      const d = decisions[m.id];
      const when = d?.at ?? m.created_at;
      return {
        id: m.id,
        matter_id: m.matter_ref,
        name: `${m.matter_ref} · ${m.title}`,
        type: "Patent Filing",
        owner: m.lead_analyst || "Executive Patent Analyst",
        assigned_team: "Research Projects",
        current_stage: d ? d.status : "Final Approval & Filing",
        submitted_by: m.lead_analyst,
        submitted_date: m.created_at,
        priority: "High",
        deadline: m.docket_deadline,
        status: d?.status ?? "Pending Approval",
        summary: m.review_note?.analyst_summary ? String(m.review_note.analyst_summary) : `Matter ${m.matter_ref} (${m.title}) completed prosecution milestones and awaits executive filing release.`,
        recommendation: "Research analysis & claim mapping completed. Released for executive 1-click filing authorization.",
        risk_level: m.review_note && typeof m.review_note === "object" && "novelty_risk" in m.review_note ? (m.review_note.novelty_risk === "HIGH" ? "High" : m.review_note.novelty_risk === "MEDIUM" ? "Medium" : "Low") : "Medium",
        documents: (m.vault_files || []).map((f) => ({
          id: f.id,
          name: f.name,
          document_type: f.category === "INVENTION_DISCLOSURE" ? "invention_disclosure" : f.category === "DRAWING" ? "drawings" : "supporting_doc",
          display_type: f.category,
          current_version: "v1",
          file_type: (["txt", "pdf", "docx", "json", "png"].includes(f.name.split(".").pop()?.toLowerCase() || "")
            ? (f.name.split(".").pop()?.toLowerCase() as "txt" | "pdf" | "docx" | "json" | "png")
            : "pdf"),
          uploaded_by: f.uploadedBy || m.lead_analyst,
          uploaded_at: f.uploadedAt,
          status: d?.status === "Approved" ? "Approved" : "CEO Review",
          content_preview: `${f.name} (${f.size}) - Vault evidence file`,
          versions: [],
        })),
        audit_history: d?.audit ?? [],
        rework_comments: d?.status === "Rework Required" ? d.reason : undefined,
        rejection_reason: d?.status === "Rejected" ? d.reason : undefined,
        created_at: m.created_at,
        updated_at: when,
      };
    });

  return [...claimItems, ...matterItems];
}

export function summarize(items: ApprovalItem[]): ApprovalsSummaryStats {
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  return {
    pending_approvals: items.filter((i) => i.status === "Pending Approval").length,
    project_approvals: items.filter((i) => i.status === "Pending Approval" && i.type === "Project").length,
    filing_approvals: items.filter((i) => i.status === "Pending Approval" && i.type === "Patent Filing").length,
    rework_required: items.filter((i) => i.status === "Rework Required").length,
    recently_approved: items.filter((i) => i.status === "Approved" && Date.parse(i.updated_at) > weekAgo).length,
  };
}
