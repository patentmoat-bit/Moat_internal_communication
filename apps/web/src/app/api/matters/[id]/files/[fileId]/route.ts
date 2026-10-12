import fs from "fs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activityLog";
import { filePath, inlineOk, load, save, toClient } from "@/lib/matterStore";
import { canWrite } from "@/lib/matterStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const s = await getSession();
  if (!s?.permissions.includes("invention.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, fileId } = await params;
  const f = load().find((m) => m.id === id)?.vault_files.find((x) => x.id === fileId);
  if (!f || !fs.existsSync(filePath(id, fileId))) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const inline = new URL(req.url).searchParams.get("inline") === "1" && inlineOk(f.name);
  // Only PDFs and raster images are ever served inline; everything else downloads.
  return new NextResponse(new Uint8Array(fs.readFileSync(filePath(id, fileId))), {
    headers: {
      "Content-Type": inline ? f.mimeType : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const s = await getSession();
  if (!s || !canWrite(s.roles)) return NextResponse.json({ error: "Only analysts can delete files." }, { status: 403 });
  const { id, fileId } = await params;
  const all = load();
  const m = all.find((x) => x.id === id);
  const f = m?.vault_files.find((x) => x.id === fileId);
  if (!m || !f) return NextResponse.json({ error: "File not found." }, { status: 404 });
  m.vault_files = m.vault_files.filter((x) => x.id !== fileId);
  save(all);
  fs.rmSync(filePath(id, fileId), { force: true });
  logActivity(s.user.name, "MATTER_FILE_DELETED", m.matter_ref, f.name);
  return NextResponse.json({ success: true, matter: toClient(m) });
}
