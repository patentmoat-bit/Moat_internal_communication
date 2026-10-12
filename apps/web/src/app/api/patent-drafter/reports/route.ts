import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/session";
import { readJson, writeJson } from "@/lib/jsonStore";
import { logActivity } from "@/lib/activityLog";

export const dynamic = "force-dynamic";

const FILE = "reports.json";
interface TimeLog { id: string; invention_id: string; task_name: string; hours_spent: number; billable: boolean; notes: string; author: string; created_at: string }

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const inventionId = new URL(req.url).searchParams.get("inventionId");
  let logs = readJson<TimeLog[]>(FILE, []);
  if (inventionId) logs = logs.filter((l) => l.invention_id === inventionId);
  return NextResponse.json({ success: true, time_logs: logs });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const task = String(body.task_name ?? "").trim().slice(0, 200);
  const hours = Number(body.hours_spent);
  if (!task) return NextResponse.json({ error: "Describe the task." }, { status: 400 });
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return NextResponse.json({ error: "Hours must be a number above 0 and at most 24 per entry." }, { status: 400 });
  }
  const log: TimeLog = {
    id: `TIME-${crypto.randomUUID()}`,
    invention_id: String(body.invention_id || "GENERAL_OVERHEAD"),
    task_name: task,
    hours_spent: Math.round(hours * 100) / 100,
    billable: body.billable !== false,
    notes: String(body.notes ?? "").slice(0, 1000),
    author: s.user.name, // always the signed-in user, never client-supplied
    created_at: new Date().toISOString(),
  };
  writeJson(FILE, [...readJson<TimeLog[]>(FILE, []), log]);
  logActivity(s.user.name, "TIME_LOGGED", log.invention_id, `${log.hours_spent}h · ${log.task_name}`);
  return NextResponse.json({ success: true, log });
}

export async function DELETE(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const logs = readJson<TimeLog[]>(FILE, []);
  const log = logs.find((l) => l.id === id);
  if (!log) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (log.author !== s.user.name && !s.roles.some((r) => r === "CEO" || r === "ADMIN")) {
    return NextResponse.json({ error: "You can only delete your own time entries." }, { status: 403 });
  }
  writeJson(FILE, logs.filter((l) => l.id !== id));
  return NextResponse.json({ success: true });
}
