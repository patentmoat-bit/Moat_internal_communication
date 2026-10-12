import { NextResponse } from "next/server";
import { listFor, markRead, notify, type TargetRole } from "@/lib/notifications";
import { resolveActor } from "@/lib/actingRole";

export const dynamic = "force-dynamic";

const ROLES = ["ADMIN", "PATENT_ANALYST", "CEO", "PATENT_DRAFTER", "DESIGN_TEAM", "FINANCE", "ALL"];

export async function GET(req: Request) {
  const actor = await resolveActor(new URL(req.url).searchParams.get("role"));
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Falls back to the user's first role when the requested one isn't theirs.
  const role = actor.role ?? actor.roles[0];
  // A signed-in person sees notices for every role they hold; the dev session is one role at a time.
  return NextResponse.json(listFor(actor.id, actor.sso ? actor.roles : role));
}

export async function POST(req: Request) {
  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const to = (body.target_role ?? "ALL") as TargetRole;
    if (!ROLES.includes(to)) return NextResponse.json({ error: "Invalid target_role" }, { status: 400 });
    // The sender is always the signed-in user, never a caller-supplied name.
    notify({
      to,
      toUserId: body.target_user_id,
      title: String(body.title ?? "New Notification").slice(0, 200),
      message: String(body.message ?? "").slice(0, 2000),
      sender: actor.name,
      senderId: actor.id,
      actionUrl: typeof body.actionUrl === "string" && body.actionUrl.startsWith("/") ? body.actionUrl : "/inbox",
      kind: body.kind,
      priority: body.priority,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

/** Mark notifications read for the signed-in user only. Body: { ids: string[] } or { all: true }. */
export async function PATCH(req: Request) {
  const actor = await resolveActor(new URL(req.url).searchParams.get("role"));
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = body.all ? "all" : Array.isArray(body.ids) ? (body.ids as string[]) : [];
  markRead(actor.id, ids, actor.sso ? actor.roles : (actor.role ?? actor.roles[0]));
  return NextResponse.json({ success: true });
}
