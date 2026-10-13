import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actingRole";
import { listUsers } from "@/lib/userRegistry";
import { storageIsDurable } from "@/lib/kv";
import { readSsoEvents } from "@/lib/msAuth";

export const dynamic = "force-dynamic";

const ORDER = { pending: 0, approved: 1, suspended: 2, rejected: 3 } as const;

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  const users = (await listUsers()).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.requestedAt.localeCompare(a.requestedAt));
  // Attempts that did not end in a normal sign-in: why someone is NOT in the list above.
  const attempts = (await readSsoEvents().catch(() => []))
    .filter((e) => e.type !== "login_success" && e.type !== "logout")
    .slice(0, 15)
    .map(({ id, type, timestamp, email, name, detail }) => ({ id, type, timestamp, email, name, detail }));
  return NextResponse.json({ users, durable: storageIsDurable(), attempts });
}
