// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Supabase User Service
// All user-related Supabase operations live here (clean architecture).
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "./admin";
import { createClient } from "./client";
import type { User, AppRole } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  department: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface CreateUserPayload {
  id: string;
  name: string;
  email: string;
  role?: AppRole;
  department?: string;
  company?: string;
}

export interface UpdateUserPayload {
  name?: string;
  department?: string;
  company?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a database row to the frontend User shape. */
export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as AppRole,
    department: row.department ?? undefined,
    company: row.company ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLogin: row.last_login ?? undefined,
  };
}

// ── Service (client-side, uses anon key + RLS) ─────────────────────────────

/**
 * Fetch the authenticated user's profile from public.users.
 * Relies on Supabase RLS (only sees own row).
 */
export async function getMyProfile(): Promise<User | null> {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error || !data) return null;
  return rowToUser(data as UserRow);
}

/**
 * Update the authenticated user's own profile.
 */
export async function updateMyProfile(payload: UpdateUserPayload): Promise<User | null> {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data, error } = await supabase
    .from("users")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", authUser.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return rowToUser(data as UserRow);
}

/**
 * Record a login timestamp for the current user.
 */
export async function recordLogin(ipAddress = "Unknown", userAgent = "Unknown"): Promise<void> {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return;

  await supabase
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", authUser.id);

  await supabase
    .from("login_history")
    .insert({
      user_id: authUser.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: "success",
    });
}

// ── Admin Service (server-side only, uses service_role key) ───────────────────

/**
 * Create or upsert a user profile row.
 * Used server-side when creating a new account.
 */
export async function adminUpsertUser(payload: CreateUserPayload): Promise<User | null> {
  const admin = createAdminClient();
  
  const upsertData: any = {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role ?? "Patent Analyst",
    department: payload.department ?? null,
    company: payload.company ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("users")
    .upsert(upsertData, { onConflict: "id" })
    .select("*")
    .single();

  if (error || !data) return null;
  return rowToUser(data as UserRow);
}

/**
 * Fetch any user by id (admin only).
 */
export async function adminGetUser(userId: string): Promise<User | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return rowToUser(data as UserRow);
}

/**
 * Update a user's role (admin only).
 */
export async function adminSetRole(userId: string, role: AppRole): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("users")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);
}
