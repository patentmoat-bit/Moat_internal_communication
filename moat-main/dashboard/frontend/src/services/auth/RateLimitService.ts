import { SupabaseClient } from "@supabase/supabase-js";

export class RateLimitService {
  private MAX_ATTEMPTS = 5;
  private LOCK_DURATION_MS = 15 * 60 * 1000; // 15 mins

  constructor(private supabase: SupabaseClient) {}

  async checkRateLimit(userId: string): Promise<boolean> {
    const { data: user } = await this.supabase
      .from("users")
      .select("locked_until")
      .eq("id", userId)
      .single();
    
    // Check fallback if DB column is missing
    let lockedUntil = user?.locked_until || (global as any).fallbackAccountStatus?.[userId]?.locked_until || null;

    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      return false; // locked
    }
    return true; // allowed
  }

  async incrementFailedAttempt(userId: string): Promise<boolean> {
    const { data: user } = await this.supabase
      .from("users")
      .select("failed_mfa_attempts")
      .eq("id", userId)
      .single();

    let attempts = (user?.failed_mfa_attempts || (global as any).fallbackAccountStatus?.[userId]?.failed_login_attempts || 0) + 1;
    let lockedUntil = null;
    let isLocked = false;

    if (attempts >= this.MAX_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + this.LOCK_DURATION_MS).toISOString();
      isLocked = true;
    }

    const { error } = await this.supabase.from("users").update({
      failed_mfa_attempts: attempts,
      locked_until: lockedUntil
    }).eq("id", userId);

    if (error) {
      if (!(global as any).fallbackAccountStatus) (global as any).fallbackAccountStatus = {};
      (global as any).fallbackAccountStatus[userId] = { failed_login_attempts: attempts, locked_until: lockedUntil };
    }

    return isLocked;
  }

  async resetAttempts(userId: string): Promise<void> {
    const { error } = await this.supabase.from("users").update({
      failed_mfa_attempts: 0,
      locked_until: null
    }).eq("id", userId);

    if (error) {
      if (!(global as any).fallbackAccountStatus) (global as any).fallbackAccountStatus = {};
      (global as any).fallbackAccountStatus[userId] = { failed_login_attempts: 0, locked_until: null };
    }
  }
}
