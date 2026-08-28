import { SupabaseClient } from "@supabase/supabase-js";
import { getSecurityConfig } from "./securityConfig";

interface LockoutState {
  failed_login_attempts: number;
  failed_mfa_attempts: number;
  locked_until: number | null;
  mfa_locked_until: number | null;
  last_failed_login: number | null;
  lockoutTier: number;
}

export class LockoutService {
  constructor(private supabase: SupabaseClient) {}

  private getStore(): Record<string, LockoutState> {
    if (!(global as any).__enterpriseLockoutStore) {
      (global as any).__enterpriseLockoutStore = {};
    }
    return (global as any).__enterpriseLockoutStore;
  }

  /**
   * Layer 2 — Per-User Rate Limiting using dynamic configuration thresholds
   */
  async checkLockout(identifier: string): Promise<{
    isLocked: boolean;
    unlockTime?: Date;
    error?: string;
    reason?: string;
    failedAttempts: number;
    remainingAttempts: number;
  }> {
    const config = getSecurityConfig();
    const store = this.getStore();
    const key = identifier.toLowerCase().trim();
    const now = Date.now();

    try {
      const { data } = await this.supabase
        .from("users")
        .select("locked_until, failed_login_attempts, last_failed_login")
        .eq("email", key)
        .single();

      if (data) {
        const lockedUntilMs = data.locked_until ? new Date(data.locked_until).getTime() : null;
        if (lockedUntilMs && lockedUntilMs > now) {
          const lockMins = Math.round(config.ACCOUNT_LOCK_DURATION_MS / 60000);
          const errMsg = `Your account has been temporarily locked due to multiple failed login attempts. Please try again after ${lockMins} minutes.`;
          return {
            isLocked: true,
            unlockTime: new Date(lockedUntilMs),
            error: errMsg,
            reason: errMsg,
            failedAttempts: data.failed_login_attempts || config.LOGIN_MAX_FAILURES,
            remainingAttempts: 0,
          };
        }
      }
    } catch {
      // Fallback to in-memory store
    }

    const state = store[key] || { failed_login_attempts: 0, failed_mfa_attempts: 0, locked_until: null, mfa_locked_until: null, last_failed_login: null, lockoutTier: 0 };
    if (state.locked_until && state.locked_until > now) {
      const lockMins = Math.round(config.ACCOUNT_LOCK_DURATION_MS / 60000);
      const errMsg = `Your account has been temporarily locked due to multiple failed login attempts. Please try again after ${lockMins} minutes.`;
      return {
        isLocked: true,
        unlockTime: new Date(state.locked_until),
        error: errMsg,
        reason: errMsg,
        failedAttempts: state.failed_login_attempts,
        remainingAttempts: 0,
      };
    } else if (state.locked_until && state.locked_until <= now) {
      state.locked_until = null;
      state.failed_login_attempts = 0;
    }

    return {
      isLocked: false,
      failedAttempts: state.failed_login_attempts,
      remainingAttempts: Math.max(0, config.LOGIN_MAX_FAILURES - state.failed_login_attempts),
    };
  }

  async incrementFailure(identifier: string): Promise<{
    isLocked: boolean;
    unlockTime?: Date;
    attempts: number;
    error?: string;
    reason?: string;
  }> {
    const config = getSecurityConfig();
    const store = this.getStore();
    const key = identifier.toLowerCase().trim();
    const now = Date.now();

    if (!store[key]) {
      store[key] = { failed_login_attempts: 0, failed_mfa_attempts: 0, locked_until: null, mfa_locked_until: null, last_failed_login: null, lockoutTier: 0 };
    }

    const state = store[key];
    state.failed_login_attempts += 1;
    state.last_failed_login = now;

    let isLocked = false;
    let unlockTime: Date | undefined;
    let errMsg: string | undefined;

    if (state.failed_login_attempts >= config.LOGIN_MAX_FAILURES) {
      state.locked_until = now + config.ACCOUNT_LOCK_DURATION_MS;
      isLocked = true;
      unlockTime = new Date(state.locked_until);
      const lockMins = Math.round(config.ACCOUNT_LOCK_DURATION_MS / 60000);
      errMsg = `Your account has been temporarily locked due to multiple failed login attempts. Please try again after ${lockMins} minutes.`;
    }

    try {
      await this.supabase
        .from("users")
        .update({
          failed_login_attempts: state.failed_login_attempts,
          locked_until: state.locked_until ? new Date(state.locked_until).toISOString() : null,
          last_failed_login: new Date(now).toISOString(),
        })
        .eq("email", key);
    } catch {
      // Ignore DB error
    }

    return {
      isLocked,
      unlockTime,
      attempts: state.failed_login_attempts,
      error: errMsg,
      reason: errMsg,
    };
  }

  async resetLockout(identifier: string): Promise<void> {
    const store = this.getStore();
    const key = identifier.toLowerCase().trim();
    if (store[key]) {
      store[key].failed_login_attempts = 0;
      store[key].locked_until = null;
    }

    try {
      await this.supabase
        .from("users")
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_failed_login: null,
        })
        .eq("email", key);
    } catch {
      // Ignore DB error
    }
  }

  /**
   * How many separate lockout cycles (5 failures -> 15min pause, repeated) an
   * account can go through, with no successful MFA verification in between,
   * before it's suspended outright and an admin is notified.
   */
  private readonly MFA_LOCKOUT_CYCLES_BEFORE_BAN = 2;

  /**
   * Layer 6 — MFA Endpoint Protection. Backed by real columns on public.users
   * (mfa_locked_until, mfa_lockout_count, failed_mfa_attempts) rather than an
   * in-memory store, so it's consistent across server restarts and instances.
   */
  async checkMfaLockout(factorId: string): Promise<{
    isLocked: boolean;
    isBanned?: boolean;
    unlockTime?: Date;
    error?: string;
    failedAttempts: number;
    remainingAttempts: number;
  }> {
    const config = getSecurityConfig();
    const now = Date.now();

    const { data } = await this.supabase
      .from("users")
      .select("failed_mfa_attempts, mfa_locked_until, is_active, status")
      .eq("id", factorId)
      .single();

    if (!data) {
      return { isLocked: false, failedAttempts: 0, remainingAttempts: config.MFA_MAX_FAILURES };
    }

    if (!data.is_active || data.status === "SUSPENDED" || data.status === "DISABLED") {
      return {
        isLocked: true,
        isBanned: true,
        error: "This account has been suspended due to repeated failed authentication attempts. Contact your administrator.",
        failedAttempts: data.failed_mfa_attempts || 0,
        remainingAttempts: 0,
      };
    }

    const lockedUntilMs = data.mfa_locked_until ? new Date(data.mfa_locked_until).getTime() : null;
    if (lockedUntilMs && lockedUntilMs > now) {
      const lockMins = Math.round(config.MFA_LOCK_DURATION_MS / 60000);
      return {
        isLocked: true,
        unlockTime: new Date(lockedUntilMs),
        error: `Too many failed authentication attempts. Please try again after ${lockMins} minutes.`,
        failedAttempts: data.failed_mfa_attempts || 0,
        remainingAttempts: 0,
      };
    }

    return {
      isLocked: false,
      failedAttempts: data.failed_mfa_attempts || 0,
      remainingAttempts: Math.max(0, config.MFA_MAX_FAILURES - (data.failed_mfa_attempts || 0)),
    };
  }

  async incrementMfaFailure(factorId: string): Promise<{
    isLocked: boolean;
    isBanned?: boolean;
    unlockTime?: Date;
    attempts: number;
    error?: string;
  }> {
    const config = getSecurityConfig();
    const now = Date.now();

    const { data } = await this.supabase
      .from("users")
      .select("failed_mfa_attempts, mfa_lockout_count, email, name")
      .eq("id", factorId)
      .single();

    const attempts = (data?.failed_mfa_attempts || 0) + 1;

    if (attempts < config.MFA_MAX_FAILURES) {
      await this.supabase.from("users").update({ failed_mfa_attempts: attempts }).eq("id", factorId);
      return { isLocked: false, attempts };
    }

    // Threshold reached — start a lockout cycle and count it toward the ban escalation.
    const lockoutCount = (data?.mfa_lockout_count || 0) + 1;
    const unlockTime = new Date(now + config.MFA_LOCK_DURATION_MS);
    const lockMins = Math.round(config.MFA_LOCK_DURATION_MS / 60000);

    if (lockoutCount >= this.MFA_LOCKOUT_CYCLES_BEFORE_BAN) {
      await this.supabase
        .from("users")
        .update({
          failed_mfa_attempts: attempts,
          mfa_lockout_count: lockoutCount,
          mfa_locked_until: unlockTime.toISOString(),
          is_active: false,
          status: "SUSPENDED",
        })
        .eq("id", factorId);

      if (data?.email) {
        await this.notifyAdminsOfSuspension(data.email, data.name || data.email);
      }

      return {
        isLocked: true,
        isBanned: true,
        attempts,
        error: "This account has been suspended due to repeated failed authentication attempts. Contact your administrator.",
      };
    }

    await this.supabase
      .from("users")
      .update({
        failed_mfa_attempts: attempts,
        mfa_lockout_count: lockoutCount,
        mfa_locked_until: unlockTime.toISOString(),
      })
      .eq("id", factorId);

    return {
      isLocked: true,
      unlockTime,
      attempts,
      error: `Too many failed authentication attempts. Please try again after ${lockMins} minutes.`,
    };
  }

  async resetMfaLockout(factorId: string): Promise<void> {
    try {
      await this.supabase
        .from("users")
        .update({
          failed_mfa_attempts: 0,
          mfa_locked_until: null,
          mfa_lockout_count: 0,
        })
        .eq("id", factorId);
    } catch {
      // Ignore DB error
    }
  }

  /** Emails every active admin/super-admin when an account is auto-suspended. */
  private async notifyAdminsOfSuspension(suspendedEmail: string, suspendedName: string): Promise<void> {
    try {
      const { data: admins } = await this.supabase
        .from("users")
        .select("email, roles(role_name)")
        .eq("is_active", true);

      const adminEmails = (admins || [])
        .filter((u: any) => {
          const roleName = Array.isArray(u.roles) ? u.roles[0]?.role_name : u.roles?.role_name;
          return roleName === "Admin" || roleName === "Super Admin";
        })
        .map((u: any) => u.email)
        .filter(Boolean);

      if (adminEmails.length === 0) return;

      const { dispatchEmails } = await import("@/lib/events/handlers");
      await dispatchEmails(
        adminEmails,
        [],
        "MOAT Security Alert: Account Auto-Suspended",
        `
          <h2>Account Auto-Suspended</h2>
          <p>The account <b>${suspendedName}</b> (${suspendedEmail}) has been automatically suspended after repeated failed MFA verification attempts across multiple lockout cycles.</p>
          <p>Review this account in the admin panel before reactivating it.</p>
        `
      );
    } catch (e) {
      console.error("Failed to notify admins of account suspension:", e);
    }
  }

  async applyProgressiveDelay(attempts: number): Promise<void> {
    if (attempts <= 1) return;
    let delayMs = 0;
    if (attempts === 2) delayMs = 1000;
    else if (attempts === 3) delayMs = 2000;
    else if (attempts === 4) delayMs = 4000;
    else if (attempts >= 5) delayMs = 8000;

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  async simulateConstantTimeDelay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 150) + 200));
  }
}
