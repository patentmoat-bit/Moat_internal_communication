import fs from "fs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canDelete, deleteFile, filePath, findInvention } from "@/lib/inventionStore";
import { logActivity } from "@/lib/activityLog";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const session = await getSession();
  if (!session?.permissions.includes("invention.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, fileId } = await params;
  const file = findInvention(id)?.files.find((f) => f.id === fileId);
  // Ids come from our own records, never from the filesystem, so a crafted id cannot escape the folder.
  if (!file || !fs.existsSync(filePath(id, fileId))) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const inline = new URL(req.url).searchParams.get("inline") === "1" && /\.(pdf|png|jpe?g|gif|webp)$/i.test(file.name);
  return new NextResponse(new Uint8Array(fs.readFileSync(filePath(id, fileId))), {
    headers: {
      "Content-Type": inline ? file.mime : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      ...(inline ? {} : { "Content-Security-Policy": "sandbox" }),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, fileId } = await params;
  const inv = findInvention(id);
  const f = inv?.files.find((x) => x.id === fileId);
  // Uploader, the disclosure's owner, the CEO and admins may remove a file.
  const owner = f ? [f.uploadedBy, inv!.createdBy] : [];
  const who = { name: session.user.name, roles: session.roles };
  if (!(canDelete(who) || owner.includes(who.name))) {
    return NextResponse.json({ error: "You cannot delete this file." }, { status: 403 });
  }
  const name = deleteFile(id, fileId);
  if (!name) return NextResponse.json({ error: "File not found." }, { status: 404 });
  logActivity(session.user.name, "FILE_DELETED", id, name);
  return NextResponse.json({ success: true });
}
