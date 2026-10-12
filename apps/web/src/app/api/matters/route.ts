import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activityLog";
import { STAGE_PCT, canWrite, load, nextRef, save, storeFile, toClient, type Matter } from "@/lib/matterStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s?.permissions.includes("invention.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ matters: load().map(toClient) });
}

/** Create a matter. `import` carries matters from the old browser-only store. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s || !canWrite(s.roles)) return NextResponse.json({ error: "Only analysts can create matters." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const title = String(b.title ?? "").trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: "Give the matter a title." }, { status: 400 });

  const all = load();
  const ip = ["PATENT", "TRADEMARK", "COPYRIGHT"].includes(b.ip_type) ? b.ip_type : "PATENT";
  const ref = String(b.matter_ref ?? "").trim().slice(0, 40);
  if (ref && all.some((m) => m.matter_ref.toLowerCase() === ref.toLowerCase())) {
    return NextResponse.json({ error: `A matter with reference ${ref} already exists.` }, { status: 409 });
  }
  const now = new Date().toISOString();
  const stage = b.import && b.stage in STAGE_PCT ? b.stage : "DISCLOSURE_RECEIVED";
  const m: Matter = {
    id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    matter_ref: ref || nextRef(ip, all), title, ip_type: ip,
    client: String(b.client ?? "").trim().slice(0, 200) || "Moat Enterprise Client",
    lead_analyst: String(b.lead_analyst ?? "").trim().slice(0, 120) || s.user.name,
    docket_deadline: String(b.docket_deadline ?? "") || new Date(Date.now() + 60 * 864e5).toISOString().split("T")[0],
    stage, progress_pct: STAGE_PCT[stage as keyof typeof STAGE_PCT], documents_count: 0, vault_files: [],
    review_note: b.import && b.review_note ? b.review_note : undefined,
    claim_comparisons: b.import && Array.isArray(b.claim_comparisons) ? b.claim_comparisons : [],
    history: [{ from: null, to: stage, by: s.user.name, at: now }], created_by: s.user.name, created_at: now,
  };
  // Files from the old browser store arrive as data URLs; store them as real files.
  if (b.import && Array.isArray(b.vault_files)) {
    for (const f of b.vault_files.slice(0, 50)) {
      const m64 = String(f?.dataUrl ?? "").match(/^data:([^;,]*)(?:;base64)?,([\s\S]*)$/);
      if (!m64 || !f.name) continue;
      try {
        const bytes = Buffer.from(m64[2], "base64");
        if (bytes.length && bytes.length <= 25 * 1024 * 1024) m.vault_files.push(storeFile(m.id, f.name, bytes, f.mimeType ?? m64[1], f.category ?? "OTHER", s.user.name));
      } catch { /* skip unreadable file */ }
    }
  }
  save([m, ...all]);
  logActivity(s.user.name, "MATTER_CREATED", m.matter_ref, m.title);
  return NextResponse.json({ success: true, matter: toClient(m) });
}
