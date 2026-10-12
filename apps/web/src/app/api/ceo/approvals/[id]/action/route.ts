import crypto from "crypto";
import { NextResponse } from "next/server";
import { buildItems, loadClaimSets, loadDecisions, saveDecisions } from "@/lib/ceoApprovals";
import { resolveActor } from "@/lib/actingRole";
import { notify } from "@/lib/notifications";
import { logActivity } from "@/lib/activityLog";
import { readJson, writeJson } from "@/lib/jsonStore";
import type { ApprovalAuditRecord, ApprovalStatus } from "@/types/approvals";

export const dynamic = "force-dynamic";

const OUTCOME = {
  APPROVE: { status: "Approved", audit: "APPROVED", label: "Approved for filing" },
  REWORK: { status: "Rework Required", audit: "REWORK_REQUESTED", label: "Returned for rework" },
  REJECT: { status: "Rejected", audit: "REJECTED", label: "Rejected" },
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor("CEO");
  if (!actor?.role) return NextResponse.json({ success: false, error: "Only the CEO can decide." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const outcome = OUTCOME[body.action as keyof typeof OUTCOME];
  if (!outcome) return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  const reason = String(body.reason ?? "").trim();
  if (outcome.status !== "Approved" && !reason) {
    return NextResponse.json({ success: false, error: "A reason is required." }, { status: 400 });
  }

  const current = buildItems().find((a) => a.id === id);
  if (!current) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (current.status !== "Pending Approval") {
    return NextResponse.json({ success: false, error: `Already decided: ${current.status}.` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const record: ApprovalAuditRecord = {
    id: crypto.randomUUID(),
    approval_id: id,
    matter_id: current.matter_id,
    matter_name: current.name,
    action: outcome.audit,
    action_label: outcome.label,
    reason: reason || undefined,
    previous_status: current.status,
    new_status: outcome.status,
    ceo_user: actor.name,
    document_version: body.document_version,
    timestamp: now,
  };
  const decisions = loadDecisions();
  decisions[id] = {
    status: outcome.status as ApprovalStatus,
    reason: reason || undefined,
    by: actor.name,
    at: now,
    audit: [record, ...(decisions[id]?.audit ?? [])],
  };
  saveDecisions(decisions);

  // Rework sends the claim set back into the drafter's queue.
  if (outcome.status === "Rework Required") {
    const sets = loadClaimSets();
    const set = sets.find((c) => c.id === id);
    if (set) {
      set.status = "REVISION_REQUIRED";
      writeJson("claims.json", sets);
    }
  }

  const text = `${current.matter_id}: ${outcome.label} by ${actor.name}${reason ? ` — ${reason}` : ""}`;
  const high = outcome.status !== "Approved";
  notify([
    {
      to: "PATENT_DRAFTER",
      title: `Executive decision: ${outcome.label}`,
      message: text,
      sender: actor.name,
      actionUrl: "/dashboard/patent-drafter/review/approvals",
      kind: "approval",
      priority: high ? "high" : "medium",
    },
    {
      to: "PATENT_ANALYST",
      title: `Executive decision: ${outcome.label}`,
      message: text,
      sender: actor.name,
      actionUrl: "/inbox",
      kind: "approval",
      priority: "medium",
    },
  ]);

  // Approval releases the filing, so Finance gets a fee line to clear.
  if (outcome.status === "Approved") {
    const ledger = readJson<unknown[]>("payments.json", []);
    ledger.push({
      id: `PAY-${crypto.randomUUID().slice(0, 8)}`,
      matter_ref: current.matter_id,
      title: `Filing fees: ${current.name}`,
      payee: "USPTO",
      fee_type: "USPTO_FILING_FEE",
      amount: current.cost_estimate ?? 0,
      status: "PENDING",
      due_date: "",
      invoice_ref: "",
    });
    writeJson("payments.json", ledger);
    notify({
      to: "FINANCE",
      title: "Filing approved: fees to clear",
      message: `${current.matter_id} was approved for filing. A filing-fee line was added to the payment docket.`,
      sender: actor.name,
      actionUrl: "/payments",
      kind: "payment",
      priority: "high",
    });
  }

  logActivity(actor.name, `CEO_${body.action}`, current.matter_id, text);
  const approval = buildItems().find((a) => a.id === id);
  return NextResponse.json({ success: true, approval });
}
