import crypto from "crypto";
import { readJson, writeJson } from "./jsonStore";

const FILE = "notifications.json";

export type TargetRole = "ADMIN" | "PATENT_ANALYST" | "CEO" | "PATENT_DRAFTER" | "DESIGN_TEAM" | "FINANCE" | "ALL";

export interface StoredNotification {
  id: string;
  kind: string;
  title: string;
  message: string;
  /** Broadcast to everyone holding this role. */
  target_role: TargetRole;
  /** When set, only this user sees it (a direct message). */
  target_user_id?: string;
  sender: string;
  /** User id of the sender, so replies can go back to that person. */
  sender_id?: string;
  actionUrl: string;
  priority: "low" | "medium" | "high" | "urgent";
  /** userId -> ISO time. Read state is per person, not per notification. */
  readBy: Record<string, string>;
  createdAt: string;
  /** Legacy field from the old file format. */
  readAt?: string | null;
}

export interface NotifyInput {
  to: TargetRole;
  toUserId?: string;
  title: string;
  message: string;
  sender: string;
  senderId?: string;
  actionUrl?: string;
  kind?: string;
  priority?: StoredNotification["priority"];
}

/** Send a notification to a role (or one user in it). Never throws: a failed
 *  notification must not fail the action that triggered it. */
export function notify(input: NotifyInput | NotifyInput[]) {
  try {
    const all = readJson<StoredNotification[]>(FILE, []);
    for (const n of Array.isArray(input) ? input : [input]) {
      all.push({
        id: `NOTIF-${crypto.randomUUID()}`,
        kind: n.kind ?? "workflow",
        title: n.title,
        message: n.message,
        target_role: n.to,
        target_user_id: n.toUserId,
        sender: n.sender,
        sender_id: n.senderId,
        actionUrl: n.actionUrl ?? "/inbox",
        priority: n.priority ?? "medium",
        readBy: {},
        createdAt: new Date().toISOString(),
      });
    }
    writeJson(FILE, all);
  } catch (err) {
    console.error("notify failed", err);
  }
}

/** Notifications visible to this user acting in this role, newest first,
 *  shaped for the client with this user's own read state. */
export function listFor(userId: string, roleOrRoles: string | string[]) {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return readJson<StoredNotification[]>(FILE, [])
    .filter(
      (n) =>
        (n.target_user_id ? n.target_user_id === userId : roles.includes(n.target_role) || n.target_role === "ALL"),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200)
    .map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      message: n.message,
      body: n.message,
      sender: n.sender,
      actionUrl: n.actionUrl,
      priority: n.priority,
      target_role: n.target_role,
      createdAt: n.createdAt,
      readAt: n.readBy?.[userId] ?? null,
    }));
}

export function markRead(userId: string, ids: string[] | "all", roleOrRoles: string | string[]) {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  const all = readJson<StoredNotification[]>(FILE, []);
  const now = new Date().toISOString();
  for (const n of all) {
    const visible = n.target_user_id ? n.target_user_id === userId : roles.includes(n.target_role) || n.target_role === "ALL";
    if (visible && (ids === "all" || ids.includes(n.id))) {
      n.readBy = { ...(n.readBy ?? {}), [userId]: n.readBy?.[userId] ?? now };
    }
  }
  writeJson(FILE, all);
}
