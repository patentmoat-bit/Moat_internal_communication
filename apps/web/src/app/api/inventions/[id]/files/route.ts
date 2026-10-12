import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activityLog";
import { MAX_FILES_PER_REQUEST, ensureInvention, persist, saveFiles, validateFile, type FileCategory } from "@/lib/inventionStore";

export const dynamic = "force-dynamic";

const CATEGORIES: FileCategory[] = ["Disclosure", "Prior art", "Drawing", "Export", "Supporting"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.permissions.some((p) => p === "invention.edit" || p === "invention.create" || p === "document.create")) {
    return NextResponse.json({ error: "You cannot add files to this disclosure." }, { status: 403 });
  }
  const { id } = await params;
  const inv = ensureInvention(id);
  if (!inv) return NextResponse.json({ error: "Disclosure not found." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Choose at least one file." }, { status: 400 });
  if (files.length > MAX_FILES_PER_REQUEST) return NextResponse.json({ error: `At most ${MAX_FILES_PER_REQUEST} files at once.` }, { status: 400 });
  for (const f of files) {
    const bad = validateFile(f);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  }
  const cat = String(form?.get("category") ?? "Supporting") as FileCategory;
  const saved = await saveFiles(id, files, CATEGORIES.includes(cat) ? cat : "Supporting", session.user.name);
  inv.files.push(...saved);
  persist(inv);
  logActivity(session.user.name, "FILE_UPLOADED", id, saved.map((s) => s.name).join(", "));
  return NextResponse.json({ success: true, files: saved });
}
