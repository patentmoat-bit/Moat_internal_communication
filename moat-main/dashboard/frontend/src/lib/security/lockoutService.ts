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
   * Layer 6 — MFA Endpoint Protection using dynamic configuration thresholds
   */
  async checkMfaLockout(factorId: string): Promise<{
    isLocked: boolean;
    unlockTime?: Date;
    error?: string;
    failedAttempts: number;
    remainingAttempts: number;
  }> {
    const config = getSecurityConfig();
    const store = this.getStore();
    const key = `mfa_${factorId}`;
    const now = Date.now();

    const state = store[key] || { failed_login_attempts: 0, failed_mfa_attempts: 0, locked_until: null, mfa_locked_until: null, last_failed_login: null, lockoutTier: 0 };
    if (state.mfa_locked_until && state.mfa_locked_until > now) {
      const errMsg = "Too many failed authentication attempts. Please try again later.";
      return {
        isLocked: true,
        unlockTime: new Date(state.mfa_locked_until),
        error: errMsg,
        failedAttempts: state.failed_mfa_attempts,
        remainingAttempts: 0,
      };
    } else if (state.mfa_locked_until && state.mfa_locked_until <= now) {
      state.mfa_locked_until = null;
      state.failed_mfa_attempts = 0;
    }

    return {
      isLocked: false,
      failedAttempts: state.failed_mfa_attempts,
      remainingAttempts: Math.max(0, config.MFA_MAX_FAILURES - state.failed_mfa_attempts),
    };
  }

  async incrementMfaFailure(factorId: string): Promise<{
    isLocked: boolean;
    unlockTime?: Date;
    attempts: number;
    error?: string;
  }> {
    const config = getSecurityConfig();
    const store = this.getStore();
    const key = `mfa_${factorId}`;
    const now = Date.now();

    if (!store[key]) {
      store[key] = { failed_login_attempts: 0, failed_mfa_attempts: 0, locked_until: null, mfa_locked_until: null, last_failed_login: null, lockoutTier: 0 };
    }

    const state = store[key];
    state.failed_mfa_attempts += 1;

    let isLocked = false;
    let unlockTime: Date | undefined;
    let errMsg: string | undefined;

    if (state.failed_mfa_attempts >= config.MFA_MAX_FAILURES) {
      state.mfa_locked_until = now + config.MFA_LOCK_DURATION_MS;
      isLocked = true;
      unlockTime = new Date(state.mfa_locked_until);
      errMsg = "Too many failed authentication attempts. Please try again later.";
    }

    try {
      await this.supabase
        .from("users")
        .update({
          failed_mfa_attempts: state.failed_mfa_attempts,
        })
        .eq("id", factorId);
    } catch {
      // Ignore DB error
    }

    return {
      isLocked,
      unlockTime,
      attempts: state.failed_mfa_attempts,
      error: errMsg,
    };
  }

  async resetMfaLockout(factorId: string): Promise<void> {
    const store = this.getStore();
    const key = `mfa_${factorId}`;
    delete store[key];

    try {
      await this.supabase
        .from("users")
        .update({
          failed_mfa_attempts: 0,
        })
        .eq("id", factorId);
    } catch {
      // Ignore DB error
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
