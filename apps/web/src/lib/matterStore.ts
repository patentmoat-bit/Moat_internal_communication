import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DATA_DIR, readJson, writeJson } from "./jsonStore";

/** Analyst research matters (the "Research Projects" workspace), stored on the
 *  server so every role sees the same matter and stage changes reach people. */

export const STAGES = ["DISCLOSURE_RECEIVED", "PRIOR_ART_SEARCH", "REVIEW_NOTE", "DRAFTER_HANDOFF", "FINAL_APPROVAL"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_PCT: Record<Stage, number> = {
  DISCLOSURE_RECEIVED: 20, PRIOR_ART_SEARCH: 40, REVIEW_NOTE: 60, DRAFTER_HANDOFF: 80, FINAL_APPROVAL: 100,
};
export const STAGE_LABEL: Record<Stage, string> = {
  DISCLOSURE_RECEIVED: "Disclosure Received", PRIOR_ART_SEARCH: "Prior Art Search", REVIEW_NOTE: "Review Note Drafted",
  DRAFTER_HANDOFF: "Drafter Handoff", FINAL_APPROVAL: "Final Approval & Filing",
};

export interface MatterFile {
  id: string; name: string; size: string; bytes: number; category: string;
  hash: string; uploadedAt: string; uploadedBy: string; mimeType: string;
}
export interface StageEvent { from: Stage | null; to: Stage; by: string; at: string }
export interface Matter {
  id: string; matter_ref: string; title: string; client: string;
  ip_type: "PATENT" | "TRADEMARK" | "COPYRIGHT"; stage: Stage; lead_analyst: string;
  docket_deadline: string; documents_count: number; progress_pct: number;
  vault_files: MatterFile[]; review_note?: Record<string, unknown> & { analyst_summary?: string };
  claim_comparisons: unknown[]; history: StageEvent[]; created_by: string; created_at: string;
}

const FILE = "matters.json";
const DIR = path.join(DATA_DIR, "uploads", "matters");
export const load = () => readJson<Matter[]>(FILE, []);
export const save = (m: Matter[]) => writeJson(FILE, m);
export const find = (id: string) => load().find((m) => m.id === id) ?? null;
export const filePath = (matterId: string, fileId: string) => path.join(DIR, matterId, fileId);

export function nextRef(ip: Matter["ip_type"], all = load()): string {
  const prefix = ip === "TRADEMARK" ? "TM" : ip === "COPYRIGHT" ? "CR" : "PAT";
  const year = new Date().getFullYear();
  const used = all.map((m) => m.matter_ref.match(new RegExp(`^${prefix}-${year}-(\\d+)$`))?.[1]).filter(Boolean).map(Number);
  return `${prefix}-${year}-${String(Math.max(0, ...used) + 1).padStart(4, "0")}`;
}

const fmt = (n: number) => (n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
export const EXT = ["pdf", "doc", "docx", "txt", "md", "rtf", "odt", "ppt", "pptx", "xls", "xlsx", "csv", "png", "jpg", "jpeg", "gif", "svg", "webp", "zip"];
export const MAX_BYTES = 25 * 1024 * 1024;
export const safeName = (n: string) => path.basename(n).replace(/[^\w.\- ()]/g, "_").slice(0, 150) || "file";

export function checkFile(f: { name: string; size: number }): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXT.includes(ext)) return `${f.name}: .${ext} files are not accepted.`;
  if (f.size > MAX_BYTES) return `${f.name}: larger than 25 MB.`;
  if (f.size === 0) return `${f.name}: file is empty.`;
  return null;
}

export function storeFile(matterId: string, name: string, bytes: Buffer, mime: string, category: string, by: string): MatterFile {
  const id = crypto.randomUUID();
  fs.mkdirSync(path.join(DIR, matterId), { recursive: true });
  fs.writeFileSync(filePath(matterId, id), bytes);
  return {
    id, name: safeName(name), size: fmt(bytes.length), bytes: bytes.length, category,
    hash: `sha256-${crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16)}`,
    uploadedAt: new Date().toISOString().split("T")[0], uploadedBy: by, mimeType: mime || "application/octet-stream",
  };
}

export function removeMatterFiles(id: string) {
  fs.rmSync(path.join(DIR, id), { recursive: true, force: true });
}

const INLINE = /\.(pdf|png|jpe?g|gif|webp)$/i;
export const inlineOk = (name: string) => INLINE.test(name);

/** The client treats `dataUrl` as "where to load this file from". */
export function toClient(m: Matter) {
  return {
    ...m,
    documents_count: m.vault_files.length,
    vault_files: m.vault_files.map((f) => ({ ...f, dataUrl: `/api/matters/${m.id}/files/${f.id}${inlineOk(f.name) ? "?inline=1" : ""}` })),
  };
}

export type StageCheck = { ok: true } | { ok: false; error: string };
/** Forward moves go one stage at a time and need the review note before handoff. */
export function checkStageMove(m: Matter, to: Stage): StageCheck {
  const from = STAGES.indexOf(m.stage), target = STAGES.indexOf(to);
  if (target === from) return { ok: false, error: `Already at "${STAGE_LABEL[to]}".` };
  if (target > from + 1) return { ok: false, error: `Move one stage at a time. Next is "${STAGE_LABEL[STAGES[from + 1]]}".` };
  if (target >= STAGES.indexOf("DRAFTER_HANDOFF") && target > from) {
    if (!String(m.review_note?.analyst_summary ?? "").trim()) {
      return { ok: false, error: "Write and save the review note summary (Review Note tab) before handing off to a drafter." };
    }
  }
  return { ok: true };
}

export const canWrite = (roles: string[]) => roles.some((r) => r === "PATENT_ANALYST" || r === "CEO" || r === "ADMIN");
