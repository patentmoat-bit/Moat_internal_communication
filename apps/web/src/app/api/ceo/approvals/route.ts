import { NextResponse } from "next/server";
import { buildItems, summarize } from "@/lib/ceoApprovals";
import { resolveActor } from "@/lib/actingRole";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await resolveActor("CEO");
  if (!actor?.role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const approvals = buildItems();
  return NextResponse.json({ success: true, approvals, summary: summarize(approvals) });
}
