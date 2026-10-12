import { readJson, writeJson } from "./jsonStore";
import { isBusinessRole, type BusinessRole } from "./permissions";

/** Everyone who has ever signed in with Microsoft, and whether an admin let them in.
 *  Keyed by the Microsoft object id (`oid`), which never changes, not by email. */

export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export interface AppUser {
  oid: string;
  email: string;
  name: string;
  role: BusinessRole | null;
  isAdmin: boolean;
  status: UserStatus;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
  lastSignInAt?: string;
}

const FILE = "users.json";
const REREQUEST_AFTER_MS = 7 * 24 * 3600 * 1000;
const load = () => readJson<AppUser[]>(FILE, []);
const save = (u: AppUser[]) => writeJson(FILE, u);

/** Break-glass administrators, set in the environment. Always approved. */
const seedAdmins = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export interface Identity { oid: string; email: string; name: string }

/** Finds this person. With `create`, an unknown person becomes a pending request. */
export function resolveUser(id: Identity, opts: { create: boolean }): { user: AppUser | null; isNewRequest: boolean } {
  const all = load();
  const email = id.email.toLowerCase();
  const seeded = seedAdmins().includes(email);
  let user = all.find((u) => u.oid === id.oid) ?? all.find((u) => u.email.toLowerCase() === email && !u.oid);
  let isNewRequest = false;
  const now = new Date().toISOString();

  if (!user) {
    if (!seeded && !opts.create) return { user: null, isNewRequest };
    user = {
      oid: id.oid, email, name: id.name, role: seeded ? "CEO" : null, isAdmin: seeded,
      status: seeded ? "approved" : "pending", requestedAt: now,
      decidedBy: seeded ? "environment (ADMIN_EMAILS)" : undefined, decidedAt: seeded ? now : undefined,
    };
    all.push(user);
    isNewRequest = !seeded;
  } else {
    user.oid = id.oid;
    user.name = id.name || user.name;
    user.email = email;
    if (seeded && (user.status !== "approved" || !user.isAdmin)) {
      Object.assign(user, { status: "approved", isAdmin: true, role: user.role ?? "CEO", decidedBy: "environment (ADMIN_EMAILS)", decidedAt: now });
    } else if (opts.create && user.status === "rejected" && user.decidedAt && Date.now() - Date.parse(user.decidedAt) > REREQUEST_AFTER_MS) {
      Object.assign(user, { status: "pending", requestedAt: now, reason: undefined });
      isNewRequest = true;
    }
  }
  if (opts.create && user.status === "approved") user.lastSignInAt = now;
  save(all);
  return { user, isNewRequest };
}

export const listUsers = () => load();
export const findByOid = (oid: string) => load().find((u) => u.oid === oid) ?? null;

export type DecideAction = "approve" | "reject" | "suspend" | "reactivate" | "update";
export interface DecideInput { oid: string; action: DecideAction; role?: string; isAdmin?: boolean; reason?: string }

export function decide(by: string, input: DecideInput): { ok: true; user: AppUser } | { ok: false; error: string; status: number } {
  const all = load();
  const u = all.find((x) => x.oid === input.oid);
  if (!u) return { ok: false, error: "User not found.", status: 404 };
  const now = new Date().toISOString();
  const activeAdmins = (list: AppUser[]) => list.filter((x) => x.isAdmin && x.status === "approved");
  const hadAdmin = activeAdmins(all).length > 0;

  if (input.action === "approve" || input.action === "reactivate" || input.action === "update") {
    const role = input.role ?? u.role;
    if (!isBusinessRole(role)) return { ok: false, error: "Choose a role.", status: 400 };
    u.role = role;
    if (typeof input.isAdmin === "boolean") u.isAdmin = input.isAdmin;
    u.status = "approved";
    u.reason = undefined;
  } else {
    u.status = input.action === "reject" ? "rejected" : "suspended";
    u.reason = (input.reason ?? "").slice(0, 500) || undefined;
  }
  // Never leave the platform with nobody who can approve people.
  if (hadAdmin && activeAdmins(all).length === 0) return { ok: false, error: "That would leave no administrator. Make someone else an admin first.", status: 409 };
  u.decidedBy = by;
  u.decidedAt = now;
  save(all);
  return { ok: true, user: u };
}
