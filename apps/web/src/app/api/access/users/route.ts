import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actingRole";
import { listUsers } from "@/lib/userRegistry";

export const dynamic = "force-dynamic";

const ORDER = { pending: 0, approved: 1, suspended: 2, rejected: 3 } as const;

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  const users = listUsers().sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.requestedAt.localeCompare(a.requestedAt));
  return NextResponse.json({ users });
}
