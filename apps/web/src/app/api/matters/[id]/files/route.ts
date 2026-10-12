import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activityLog";
import { checkFile, load, save, storeFile, toClient } from "@/lib/matterStore";
import { canWrite } from "@/lib/matterStore";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || !canWrite(s.roles)) return NextResponse.json({ error: "Only analysts can add files." }, { status: 403 });
  const { id } = await params;
  const all = load();
  const m = all.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: "Matter not found." }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  if (!files.length) return NextResponse.json({ error: "Choose at least one file." }, { status: 400 });
  for (const f of files) { const bad = checkFile(f); if (bad) return NextResponse.json({ error: bad }, { status: 400 }); }
  const category = String(form?.get("category") ?? "OTHER");
  for (const f of files) m.vault_files.push(storeFile(id, f.name, Buffer.from(await f.arrayBuffer()), f.type, category, s.user.name));
  save(all);
  logActivity(s.user.name, "MATTER_FILE_ADDED", m.matter_ref, files.map((f) => f.name).join(", "));
  return NextResponse.json({ success: true, matter: toClient(m) });
}
