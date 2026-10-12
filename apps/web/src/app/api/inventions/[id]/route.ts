import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activityLog";
import { notify } from "@/lib/notifications";
import { canDelete, deleteInvention, findInvention, inWorkflow } from "@/lib/inventionStore";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const inv = findInvention(id);
  if (!inv) return NextResponse.json({ error: "Disclosure not found." }, { status: 404 });
  if (!canDelete({ name: session.user.name, roles: session.roles }, inv.createdBy)) {
    return NextResponse.json({ error: "Only the person who raised it, the CEO or an admin can delete this." }, { status: 403 });
  }
  // Once drafting has begun, other roles depend on it. Remove files individually instead.
  if (inWorkflow(id)) {
    return NextResponse.json(
      { error: "This invention is already in the drafting workflow (assigned or has claims), so it can't be deleted. You can still remove individual files." },
      { status: 409 },
    );
  }
  deleteInvention(id);
  logActivity(session.user.name, "DISCLOSURE_DELETED", id, inv.title);
  notify({
    to: "CEO", title: "Disclosure deleted", message: `${session.user.name} deleted ${id}: ${inv.title}`,
    sender: session.user.name, actionUrl: "/inventions", kind: "workflow", priority: "low",
  });
  return NextResponse.json({ success: true });
}
