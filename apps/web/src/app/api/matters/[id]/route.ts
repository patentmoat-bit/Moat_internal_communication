import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activityLog";
import { notify } from "@/lib/notifications";
import { STAGES, STAGE_LABEL, STAGE_PCT, checkStageMove, load, removeMatterFiles, save, toClient, type Stage } from "@/lib/matterStore";
import { canWrite } from "@/lib/matterStore";

import { readJson, writeJson } from "@/lib/jsonStore";

export const dynamic = "force-dynamic";

/** Update stage, review note or claim comparisons. Stage moves are validated,
 *  recorded in the matter's history, and notify the people who act next. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || !canWrite(s.roles)) return NextResponse.json({ error: "Only analysts can update matters." }, { status: 403 });
  const { id } = await params;
  const all = load();
  const m = all.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: "Matter not found." }, { status: 404 });
  const b = await req.json().catch(() => ({}));

  if (b.review_note && typeof b.review_note === "object") m.review_note = b.review_note;
  if (Array.isArray(b.claim_comparisons)) m.claim_comparisons = b.claim_comparisons.slice(0, 200);

  if (b.stage !== undefined) {
    if (!STAGES.includes(b.stage)) return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
    const to = b.stage as Stage;
    const check = checkStageMove(m, to);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    m.history.push({ from: m.stage, to, by: s.user.name, at: new Date().toISOString() });
    m.stage = to;
    m.progress_pct = STAGE_PCT[to];
    const forward = STAGES.indexOf(to) > STAGES.indexOf(m.history.at(-1)!.from!);
    if (forward && to === "DRAFTER_HANDOFF") {
      notify({ to: "PATENT_DRAFTER", title: "Matter handed off to drafting", message: `${m.matter_ref} · ${m.title} is ready for claim drafting (review note by ${s.user.name}).`,
        sender: s.user.name, actionUrl: "/dashboard/patent-drafter", kind: "assignment", priority: "high" });

      try {
        const assignments = readJson<any[]>("assignments.json", []);
        const existingIdx = assignments.findIndex((a) => (a.invention_id ?? a.matter_ref) === m.matter_ref);
        const asgData = {
          id: existingIdx >= 0 ? assignments[existingIdx].id : `ASG-${Date.now().toString().slice(-4)}`,
          invention_id: m.matter_ref,
          title: m.title,
          assignee: "Patent Drafter",
          status: "ASSIGNED",
          due_date: m.docket_deadline || new Date(Date.now() + 30 * 864e5).toISOString(),
          instructions: m.review_note?.analyst_summary
            ? String(m.review_note.analyst_summary)
            : `Draft formal claims and specification based on research disclosure for ${m.matter_ref}.`,
          assigned_by: s.user.name,
          assigned_at: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          assignments[existingIdx] = { ...assignments[existingIdx], ...asgData };
        } else {
          assignments.unshift(asgData);
        }
        writeJson("assignments.json", assignments);
      } catch (err) {
        console.error("Failed to sync drafter assignment:", err);
      }
    }
    if (forward && to === "FINAL_APPROVAL") {
      notify({ to: "CEO", title: "Matter ready for final approval", message: `${m.matter_ref} · ${m.title} awaits executive sign-off and filing.`,
        sender: s.user.name, actionUrl: "/dashboard/ceo/approvals", kind: "approval", priority: "high" });
    }
    logActivity(s.user.name, "MATTER_STAGE", m.matter_ref, `${m.history.at(-1)!.from} -> ${to}`);
    void STAGE_LABEL;
  }
  save(all);
  return NextResponse.json({ success: true, matter: toClient(m) });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || !canWrite(s.roles)) return NextResponse.json({ error: "Only analysts can delete matters." }, { status: 403 });
  const { id } = await params;
  const all = load();
  const m = all.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: "Matter not found." }, { status: 404 });
  if (m.created_by !== s.user.name && !s.roles.some((r) => r === "CEO" || r === "ADMIN")) {
    return NextResponse.json({ error: "Only the creator, the CEO or an admin can delete this matter." }, { status: 403 });
  }
  save(all.filter((x) => x.id !== id));
  removeMatterFiles(id);
  logActivity(s.user.name, "MATTER_DELETED", m.matter_ref, m.title);
  return NextResponse.json({ success: true });
}
