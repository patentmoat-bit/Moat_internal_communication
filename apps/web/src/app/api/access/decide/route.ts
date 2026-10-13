import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actingRole";
import { decide, type DecideAction } from "@/lib/userRegistry";
import { logActivity } from "@/lib/activityLog";
import { logSsoEvent } from "@/lib/msAuth";

export const dynamic = "force-dynamic";

const ACTIONS: DecideAction[] = ["approve", "reject", "suspend", "reactivate", "update"];

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!ACTIONS.includes(b.action) || typeof b.oid !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  // Admins cannot lock themselves out by suspending or rejecting their own account.
  if (b.oid === admin.id && (b.action === "suspend" || b.action === "reject" || b.isAdmin === false)) {
    return NextResponse.json({ error: "You can't remove your own administrator access." }, { status: 409 });
  }
  const result = await decide(admin.name, { oid: b.oid, action: b.action, role: b.role, isAdmin: b.isAdmin, reason: b.reason });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const u = result.user;
  logActivity(admin.name, `ACCESS_${String(b.action).toUpperCase()}`, u.email, `${u.status}${u.role ? ` · ${u.role}` : ""}${u.isAdmin ? " · admin" : ""}`);
  await logSsoEvent({ type: u.status === "approved" ? "login_success" : "access_denied", email: u.email, name: u.name, oid: u.oid, detail: `${admin.name}: ${b.action}${u.role ? ` as ${u.role}` : ""}` });
  return NextResponse.json({ success: true, user: u });
}
