import { NextResponse } from "next/server";
import { resolveActor } from "@/lib/actingRole";
import { readJson } from "@/lib/jsonStore";
import { markRead, notify, type StoredNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** The Design team marks a drawing request done; the drafter who asked is told. */
export async function POST(req: Request) {
  const { id, role } = await req.json().catch(() => ({}));
  const actor = await resolveActor(role ?? "DESIGN_TEAM");
  if (!actor?.role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const original = readJson<StoredNotification[]>("notifications.json", []).find((n) => n.id === id);
  if (!original || original.kind !== "design_request" || original.target_role !== actor.role) {
    return NextResponse.json({ error: "Not a request for your team" }, { status: 404 });
  }
  notify({
    to: "PATENT_DRAFTER",
    toUserId: original.sender_id,
    title: "Drawing ready",
    message: `${actor.name} completed: ${original.message}`,
    sender: actor.name,
    actionUrl: "/dashboard/patent-drafter/documents/drawings",
    kind: "design_done",
    priority: "high",
  });
  markRead(actor.id, [id], actor.role);
  return NextResponse.json({ success: true });
}
