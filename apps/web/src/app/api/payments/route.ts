import { NextResponse } from "next/server";
import { resolveActor } from "@/lib/actingRole";
import { readJson, writeJson } from "@/lib/jsonStore";
import { notify } from "@/lib/notifications";
import { logActivity } from "@/lib/activityLog";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "PROCESSING", "PAID", "EXCEPTION"];

interface Payment {
  id: string;
  matter_ref: string;
  title: string;
  status: string;
}

export async function GET() {
  const actor = await resolveActor();
  if (!actor || !actor.roles.some((r) => r === "FINANCE" || r === "CEO" || r === "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ payments: readJson<Payment[]>("payments.json", []) });
}

/** Finance moves a line through its lifecycle; the CEO is told when it matters. */
export async function PATCH(req: Request) {
  const actor = await resolveActor("FINANCE");
  if (!actor?.role) return NextResponse.json({ error: "Only Finance can update payments." }, { status: 403 });
  const { id, status } = await req.json().catch(() => ({}));
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const ledger = readJson<Payment[]>("payments.json", []);
  const row = ledger.find((p) => p.id === id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  row.status = status;
  writeJson("payments.json", ledger);

  if (status === "PAID" || status === "EXCEPTION") {
    notify({
      to: "CEO",
      title: status === "PAID" ? "Payment cleared" : "Payment exception",
      message: `${row.title} (${row.matter_ref}) is now ${status}.`,
      sender: actor.name,
      actionUrl: "/payments",
      kind: "payment",
      priority: status === "EXCEPTION" ? "urgent" : "medium",
    });
  }
  logActivity(actor.name, "PAYMENT_STATUS", row.matter_ref, `${row.id} -> ${status}`);
  return NextResponse.json({ success: true, payments: ledger });
}
