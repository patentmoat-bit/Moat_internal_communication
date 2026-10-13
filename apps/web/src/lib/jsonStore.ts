import fs from "fs";
import os from "os";
import path from "path";

/** Where records and uploads live. Set DATA_DIR to point at a mounted volume. On Vercel the project
 *  folder is read-only, so it falls back to the temp directory, which is writable but is NOT durable:
 *  fine for a demo, never for real data. */
export const DATA_DIR =
  process.env.DATA_DIR || (process.env.VERCEL ? path.join(os.tmpdir(), "moat-data") : path.join(process.cwd(), "data"));

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Write-then-rename so a crash or concurrent reader never sees a half-written file. */
export function writeJson(file: string, value: unknown) {
  const target = path.join(DATA_DIR, file);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, target);
}
