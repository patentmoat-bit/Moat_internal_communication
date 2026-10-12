import crypto from "crypto";
import { readJson, writeJson } from "./jsonStore";

export function logActivity(actor: string, action: string, invention_id: string, details: string) {
  try {
    const all = readJson<unknown[]>("activity.json", []);
    all.unshift({
      id: `ACT-${crypto.randomUUID()}`,
      actor,
      action,
      invention_id,
      details,
      timestamp: new Date().toISOString(),
    });
    writeJson("activity.json", all.slice(0, 5000));
  } catch (err) {
    console.error("logActivity failed", err);
  }
}
