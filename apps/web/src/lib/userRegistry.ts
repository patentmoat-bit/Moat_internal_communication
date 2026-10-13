import { loadJson, saveJson } from "./kv";
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
// The shared store is metered, and every request asks "who is this?". A short per-instance cache keeps
// that to a few reads a minute. The trade-off: an approval or suspension made on another instance can
// take up to CACHE_MS to be seen here. Changes made on this instance show immediately.
const CACHE_MS = 20_000;
let cache: { at: number; data: AppUser[] } | null = null;

async function load(fresh = false): Promise<AppUser[]> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const data = await loadJson<AppUser[]>(FILE, []);
  cache = { at: Date.now(), data };
  return data;
}
async function save(u: AppUser[]) {
  await saveJson(FILE, u);
  cache = { at: Date.now(), data: u };
}

/** Break-glass administrators, set in the environment. Always approved. */
const seedAdmins = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export interface Identity { oid: string; email: string; name: string }

/** Finds this person. With `create`, an unknown person becomes a pending request. */
export async function resolveUser(id: Identity, opts: { create: boolean }): Promise<{ user: AppUser | null; isNewRequest: boolean }> {
  // Signing in reads fresh data; the many "who is this?" checks per page use the short cache.
  let all = await load(opts.create);
  const email = id.email.toLowerCase();
  // Someone not yet seen as approved may have just been approved elsewhere: look again without the
  // cache. Approved people (nearly all traffic) keep using it, and these lookups are rare.
  if (!opts.create && !all.some((u) => u.oid === id.oid && u.status === "approved")) all = await load(true);
  const seeded = seedAdmins().includes(email);
  let user = all.find((u) => u.oid === id.oid) ?? all.find((u) => u.email.toLowerCase() === email && !u.oid);
  let isNewRequest = false;
  let dirty = false; // only write when something changed
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
    dirty = true;
  } else {
    const name = id.name || user.name;
    if (user.oid !== id.oid || user.name !== name || user.email !== email) {
      Object.assign(user, { oid: id.oid, name, email });
      dirty = true;
    }
    if (seeded && (user.status !== "approved" || !user.isAdmin)) {
      Object.assign(user, { status: "approved", isAdmin: true, role: user.role ?? "CEO", decidedBy: "environment (ADMIN_EMAILS)", decidedAt: now });
      dirty = true;
    } else if (opts.create && user.status === "rejected" && user.decidedAt && Date.now() - Date.parse(user.decidedAt) > REREQUEST_AFTER_MS) {
      Object.assign(user, { status: "pending", requestedAt: now, reason: undefined });
      isNewRequest = true;
      dirty = true;
    }
  }
  if (opts.create && user.status === "approved") {
    user.lastSignInAt = now;
    dirty = true;
  }
  if (dirty) await save(all);
  return { user, isNewRequest };
}

export const listUsers = () => load(true);
export const findByOid = async (oid: string) => (await load(true)).find((u) => u.oid === oid) ?? null;

export type DecideAction = "approve" | "reject" | "suspend" | "reactivate" | "update";
export interface DecideInput { oid: string; action: DecideAction; role?: string; isAdmin?: boolean; reason?: string }

export async function decide(by: string, input: DecideInput): Promise<{ ok: true; user: AppUser } | { ok: false; error: string; status: number }> {
  const all = await load(true);
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
  await save(all);
  return { ok: true, user: u };
}
