import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { notify } from "@/lib/notifications";
import { logActivity } from "@/lib/activityLog";
import {
  MAX_FILES_PER_REQUEST, createInvention, listInventions, nextId, persist, saveFiles, validateFile,
} from "@/lib/inventionStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.permissions.includes("invention.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ inventions: listInventions() });
}

/** multipart/form-data: title, summary, field, problem, solution, inventors (JSON), files[] */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.permissions.includes("invention.create")) {
    return NextResponse.json({ error: "You do not have permission to raise a disclosure." }, { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const text = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const title = text("title", 200);
  const summary = text("summary", 4000);
  if (title.length < 3) return NextResponse.json({ error: "Give the disclosure a title (3+ characters)." }, { status: 400 });
  if (summary.length < 10) return NextResponse.json({ error: "Describe the invention in a few sentences." }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES_PER_REQUEST) return NextResponse.json({ error: `Attach at most ${MAX_FILES_PER_REQUEST} files at once.` }, { status: 400 });
  for (const f of files) {
    const bad = validateFile(f);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  }

  let inventors: { name: string; email?: string }[] = [];
  try {
    inventors = JSON.parse(String(form.get("inventors") ?? "[]"))
      .filter((i: any) => i?.name?.trim()).slice(0, 20)
      .map((i: any) => ({ name: String(i.name).trim().slice(0, 120), email: i.email ? String(i.email).trim().slice(0, 200) : undefined }));
  } catch { /* ignore malformed inventors */ }

  const inv = createInvention(
    { title, summary, field: text("field", 200), problem: text("problem", 4000), solution: text("solution", 4000), inventors, createdBy: session.user.name },
    [],
  );
  inv.id = nextId();
  try {
    inv.files = await saveFiles(inv.id, files, "Disclosure", session.user.name);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not store the files." }, { status: 500 });
  }
  persist(inv);

  notify({
    to: "CEO", title: "New disclosure raised",
    message: `${session.user.name} raised ${inv.id}: ${inv.title}${inv.files.length ? ` (${inv.files.length} file${inv.files.length > 1 ? "s" : ""})` : ""}`,
    sender: session.user.name, actionUrl: `/inventions/${inv.id}`, kind: "assignment",
  });
  logActivity(session.user.name, "DISCLOSURE_CREATED", inv.id, inv.title);
  return NextResponse.json({ success: true, id: inv.id });
}
