import { NextResponse } from "next/server";
import { buildItems } from "@/lib/ceoApprovals";
import { resolveActor } from "@/lib/actingRole";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor("CEO");
  if (!actor?.role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const approval = buildItems().find((a) => a.id === id);
  if (!approval) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, approval });
}
