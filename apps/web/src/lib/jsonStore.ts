import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

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
