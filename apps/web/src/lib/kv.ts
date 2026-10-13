import { readJson, writeJson } from "./jsonStore";

/** Durable shared storage for the records that decide who may sign in.
 *
 *  Serverless and restarting hosts keep files per instance, so two requests can see two different
 *  copies and an approval vanishes. When a Redis REST endpoint is configured (Upstash, or Vercel's
 *  Upstash/KV integration) records live there and every instance sees the same data. Without it,
 *  records fall back to local files, which is right for development and wrong for a deployed site. */

const url = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvEnabled = () => Boolean(url() && token());

async function command(args: string[]): Promise<unknown> {
  const res = await fetch(url()!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!res.ok || json.error) throw new Error(`KV ${args[0]} failed: ${json.error ?? res.status}`);
  return json.result;
}

export async function loadJson<T>(file: string, fallback: T): Promise<T> {
  if (!kvEnabled()) return readJson<T>(file, fallback);
  const raw = (await command(["GET", `moat:${file}`])) as string | null;
  return raw ? (JSON.parse(raw) as T) : fallback;
}

export async function saveJson(file: string, value: unknown): Promise<void> {
  if (!kvEnabled()) return writeJson(file, value);
  await command(["SET", `moat:${file}`, JSON.stringify(value)]);
}

/** True when records survive restarts and are shared by every instance. */
export function storageIsDurable(): boolean {
  return kvEnabled() || !(process.env.VERCEL || process.env.NODE_ENV === "production" && !process.env.DATA_DIR);
}
