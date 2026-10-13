import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DATA_DIR, readJson, writeJson } from "./jsonStore";

/** Disclosures raised in the workspace, plus a unified view of every file
 *  attached to an invention, wherever it was originally stored. */

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 10;
export const ALLOWED_EXT = [
  "pdf", "doc", "docx", "txt", "md", "rtf", "odt", "ppt", "pptx", "xls", "xlsx", "csv",
  "png", "jpg", "jpeg", "gif", "svg", "webp", "zip",
];
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  category: FileCategory;
  uploadedBy: string;
  uploadedAt: string;
}

export type FileCategory = "Disclosure" | "Prior art" | "Drawing" | "Export" | "Supporting";

export interface Inventor { name: string; email?: string }

export interface Invention {
  id: string;
  title: string;
  summary: string;
  field: string;
  problem: string;
  solution: string;
  inventors: Inventor[];
  status: "SUBMITTED" | "IN_REVIEW" | "DRAFTING" | "APPROVED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  files: StoredFile[];
}

const FILE = "inventions.json";
const load = () => readJson<Invention[]>(FILE, []);

interface Assignment { invention_id?: string; title?: string; assignee?: string; status?: string; instructions?: string; assigned_by?: string; assigned_at?: string }
interface DocBag { invention_id: string; disclosures?: any[]; prior_art?: any[]; drawings?: any[]; exports?: any[] }

export function nextId(): string {
  const used = new Set<number>();
  const add = (id?: string) => { const m = id?.match(/^INN-(\d+)$/); if (m) used.add(+m[1]); };
  load().forEach((i) => add(i.id));
  readJson<Assignment[]>("assignments.json", []).forEach((a) => add(a.invention_id));
  readJson<DocBag[]>("documents.json", []).forEach((d) => add(d.invention_id));
  return `INN-${String(Math.max(0, ...used) + 1).padStart(4, "0")}`;
}

export interface InventionRow {
  id: string; title: string; summary: string; status: string;
  updatedAt: string; fileCount: number; owner: string; legacy: boolean;
}

/** Local disclosures first, then inventions that only exist through the
 *  drafting workflow (assignments / documents) so nothing is hidden. */
export function listInventions(): InventionRow[] {
  const local = load();
  const rows: InventionRow[] = local.map((i) => ({
    id: i.id, title: i.title, summary: i.summary, status: i.status,
    updatedAt: i.updatedAt, fileCount: i.files.length + legacyFiles(i.id).length,
    owner: i.createdBy, legacy: false,
  }));
  const seen = new Set(rows.map((r) => r.id));
  for (const a of readJson<Assignment[]>("assignments.json", [])) {
    if (!a.invention_id || seen.has(a.invention_id)) continue;
    seen.add(a.invention_id);
    rows.push({
      id: a.invention_id, title: a.title ?? a.invention_id, summary: a.instructions ?? "",
      status: a.status ?? "DRAFTING", updatedAt: a.assigned_at ?? new Date(0).toISOString(),
      fileCount: legacyFiles(a.invention_id).length, owner: a.assignee ?? "Unassigned", legacy: true,
    });
  }
  for (const d of readJson<DocBag[]>("documents.json", [])) {
    if (seen.has(d.invention_id)) continue;
    seen.add(d.invention_id);
    rows.push({ id: d.invention_id, title: d.invention_id, summary: "", status: "DRAFTING",
      updatedAt: new Date(0).toISOString(), fileCount: legacyFiles(d.invention_id).length, owner: "—", legacy: true });
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface HubFile {
  id: string; name: string; category: FileCategory; size: string;
  uploadedBy: string; uploadedAt: string; downloadable: boolean; previewable: boolean; note?: string;
}

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const previewable = (name: string) => /\.(pdf|png|jpe?g|gif|webp)$/i.test(name);

/** Files recorded by the drafting workflow. These are metadata-only records. */
function legacyFiles(id: string): HubFile[] {
  const bag = readJson<DocBag[]>("documents.json", []).find((d) => d.invention_id === id);
  if (!bag) return [];
  const map = (items: any[] | undefined, category: FileCategory, name: (x: any) => string, by: (x: any) => string): HubFile[] =>
    (items ?? []).map((x) => ({
      id: String(x.id), name: name(x), category, size: x.size ?? "—",
      uploadedBy: by(x), uploadedAt: x.created_at ?? "", downloadable: false, previewable: false,
      note: x.notes ?? x.technical_features,
    }));
  return [
    ...map(bag.disclosures, "Disclosure", (x) => x.filename ?? x.title ?? "Disclosure", (x) => x.uploader ?? "—"),
    ...map(bag.prior_art, "Prior art", (x) => `${x.publication_number ?? ""} ${x.title ?? ""}`.trim(), (x) => String(x.source ?? "—").replace(/^Uploaded by /, "")),
    ...map(bag.drawings, "Drawing", (x) => x.filename ?? "Drawing", (x) => x.uploader ?? "—"),
    ...map(bag.exports, "Export", (x) => x.filename ?? x.title ?? "Export", (x) => x.uploader ?? "—"),
  ];
}

export function getHub(id: string) {
  const inv = load().find((i) => i.id === id) ?? null;
  const row = listInventions().find((r) => r.id === id);
  if (!inv && !row) return null;
  const uploaded: HubFile[] = (inv?.files ?? []).map((f) => ({
    id: f.id, name: f.name, category: f.category, size: fmtSize(f.size),
    uploadedBy: f.uploadedBy, uploadedAt: f.uploadedAt, downloadable: true, previewable: previewable(f.name),
  }));
  const files = [...uploaded, ...legacyFiles(id)].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const claim = readJson<{ invention_id: string; status: string; version: number }[]>("claims.json", []).find((c) => c.invention_id === id);
  const asg = readJson<Assignment[]>("assignments.json", []).find((a) => a.invention_id === id);
  return { invention: inv, row: row!, files, claimStatus: claim ? `v${claim.version} · ${claim.status.replace(/_/g, " ").toLowerCase()}` : null, assignment: asg ?? null };
}

export function safeName(name: string) {
  return path.basename(name).replace(/[^\w.\- ()]/g, "_").slice(0, 150) || "file";
}

export function validateFile(f: File): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) return `${f.name}: .${ext} files are not accepted.`;
  if (f.size > MAX_FILE_BYTES) return `${f.name}: larger than ${MAX_FILE_BYTES / 1048576} MB.`;
  if (f.size === 0) return `${f.name}: file is empty.`;
  return null;
}

export async function saveFiles(inventionId: string, files: File[], category: FileCategory, uploadedBy: string): Promise<StoredFile[]> {
  const dir = path.join(UPLOAD_DIR, inventionId);
  fs.mkdirSync(dir, { recursive: true });
  const out: StoredFile[] = [];
  for (const f of files) {
    const id = crypto.randomUUID();
    fs.writeFileSync(path.join(dir, id), Buffer.from(await f.arrayBuffer()));
    out.push({ id, name: safeName(f.name), size: f.size, mime: f.type || "application/octet-stream", category, uploadedBy, uploadedAt: new Date().toISOString() });
  }
  return out;
}

export function createInvention(data: Omit<Invention, "id" | "createdAt" | "updatedAt" | "status" | "files">, files: StoredFile[]): Invention {
  const now = new Date().toISOString();
  const inv: Invention = { ...data, id: "", status: "SUBMITTED", files, createdAt: now, updatedAt: now };
  return inv;
}

export function persist(inv: Invention) {
  const all = load();
  const i = all.findIndex((x) => x.id === inv.id);
  inv.updatedAt = new Date().toISOString();
  if (i >= 0) all[i] = inv; else all.push(inv);
  writeJson(FILE, all);
}

export const findInvention = (id: string) => load().find((i) => i.id === id) ?? null;
export const filePath = (invId: string, fileId: string) => path.join(UPLOAD_DIR, invId, fileId);

/** The disclosure record for this id, created on first use for inventions that so far
 *  exist only in the drafting workflow, so they can take files too. */
export function ensureInvention(id: string): Invention | null {
  const existing = findInvention(id);
  if (existing) return existing;
  const row = listInventions().find((r) => r.id === id);
  if (!row) return null;
  const now = new Date().toISOString();
  const inv: Invention = {
    id, title: row.title, summary: row.summary, field: "", problem: "", solution: "", inventors: [],
    status: "DRAFTING", createdBy: readJson<Assignment[]>("assignments.json", []).find((a) => a.invention_id === id)?.assigned_by ?? row.owner, createdAt: now, updatedAt: now, files: [],
  };
  persist(inv);
  return inv;
}

export interface Deleter { name: string; roles: string[] }

/** Admins and the CEO can delete anything; otherwise only the person who raised it. */
export function canDelete(who: Deleter, createdBy?: string) {
  return who.roles.includes("CEO") || who.roles.includes("ADMIN") || (!!createdBy && createdBy === who.name);
}

/** True when the invention is also driven by the drafting workflow (assigned or has claims). */
export function inWorkflow(id: string) {
  return (
    readJson<Assignment[]>("assignments.json", []).some((a) => a.invention_id === id) ||
    readJson<{ invention_id: string }[]>("claims.json", []).some((c) => c.invention_id === id)
  );
}

/** Removes the disclosure record and every file stored for it. */
export function deleteInvention(id: string) {
  writeJson(FILE, load().filter((i) => i.id !== id));
  fs.rmSync(path.join(UPLOAD_DIR, id), { recursive: true, force: true });
}

/** Deletes one file: an uploaded one (record + bytes) or a workflow record. Returns its name, or null. */
export function deleteFile(id: string, fileId: string): string | null {
  const inv = findInvention(id);
  const f = inv?.files.find((x) => x.id === fileId);
  if (inv && f) {
    inv.files = inv.files.filter((x) => x.id !== fileId);
    persist(inv);
    fs.rmSync(filePath(id, fileId), { force: true });
    return f.name;
  }
  const bags = readJson<DocBag[]>("documents.json", []);
  const bag = bags.find((d) => d.invention_id === id);
  if (!bag) return null;
  for (const key of ["disclosures", "prior_art", "drawings", "exports"] as const) {
    const hit = bag[key]?.find((x) => String(x.id) === fileId);
    if (hit) {
      bag[key] = bag[key]!.filter((x) => String(x.id) !== fileId);
      writeJson("documents.json", bags);
      return hit.filename ?? hit.title ?? hit.publication_number ?? fileId;
    }
  }
  return null;
}
