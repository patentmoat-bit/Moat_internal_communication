import { SupabaseClient } from "@supabase/supabase-js";

interface IPReputationRecord {
  ip: string;
  failedAttempts: number;
  blockedUntil: number | null;
  reputationScore: number; // 0 to 100 (100 is pristine, < 30 is suspicious, 0 is blocked)
  lastSeen: number;
}

export class IPReputationService {
  private MAX_FAILED_ATTEMPTS = 15; // Max failed auth attempts across all accounts before IP block
  private BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes block duration
  private WINDOW_MS = 15 * 60 * 1000; // 15 minutes rolling window

  constructor(private supabase: SupabaseClient) {}

  private getStore(): Record<string, IPReputationRecord> {
    if (!(global as any).__enterpriseIpReputationStore) {
      (global as any).__enterpriseIpReputationStore = {};
    }
    return (global as any).__enterpriseIpReputationStore;
  }

  async checkReputation(ip: string): Promise<{ allowed: boolean; reason?: string; retryAfterMs?: number; score: number }> {
    const store = this.getStore();
    const now = Date.now();
    const record = store[ip];

    // Check DB fallback/persist if needed
    try {
      const { data } = await this.supabase
        .from("ip_reputation")
        .select("blocked_until, failed_attempts, score")
        .eq("ip_address", ip)
        .single();

      if (data && data.blocked_until && new Date(data.blocked_until).getTime() > now) {
        const retryAfterMs = new Date(data.blocked_until).getTime() - now;
        return {
          allowed: false,
          reason: "IP address is temporarily blocked due to excessive failed authentication attempts.",
          retryAfterMs,
          score: data.score || 0,
        };
      }
    } catch {
      // Supabase table might not exist in local dev; use in-memory store
    }

    if (record) {
      // Clean up old window
      if (now - record.lastSeen > this.WINDOW_MS && !record.blockedUntil) {
        record.failedAttempts = 0;
        record.reputationScore = Math.min(100, record.reputationScore + 10);
      }

      if (record.blockedUntil && record.blockedUntil > now) {
        return {
          allowed: false,
          reason: "IP address is temporarily blocked due to excessive failed authentication attempts.",
          retryAfterMs: record.blockedUntil - now,
          score: record.reputationScore,
        };
      } else if (record.blockedUntil && record.blockedUntil <= now) {
        record.blockedUntil = null;
        record.failedAttempts = Math.floor(this.MAX_FAILED_ATTEMPTS / 2); // Partial reset
      }

      return { allowed: true, score: record.reputationScore };
    }

    return { allowed: true, score: 100 };
  }

  async recordFailure(ip: string, reason: string): Promise<{ isBlocked: boolean; blockedUntil?: number }> {
    const store = this.getStore();
    const now = Date.now();
    if (!store[ip]) {
      store[ip] = { ip, failedAttempts: 0, blockedUntil: null, reputationScore: 100, lastSeen: now };
    }

    const record = store[ip];
    record.failedAttempts += 1;
    record.lastSeen = now;
    record.reputationScore = Math.max(0, record.reputationScore - 10);

    let isBlocked = false;
    if (record.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      record.blockedUntil = now + this.BLOCK_DURATION_MS;
      record.reputationScore = 0;
      isBlocked = true;
    }

    try {
      await this.supabase.from("ip_reputation").upsert({
        ip_address: ip,
        failed_attempts: record.failedAttempts,
        blocked_until: record.blockedUntil ? new Date(record.blockedUntil).toISOString() : null,
        score: record.reputationScore,
        last_seen: new Date(now).toISOString(),
      }, { onConflict: "ip_address" });
    } catch {
      // Ignore DB error if table not created yet
    }

    return { isBlocked, blockedUntil: record.blockedUntil || undefined };
  }

  async recordSuccess(ip: string): Promise<void> {
    const store = this.getStore();
    if (store[ip]) {
      store[ip].failedAttempts = 0;
      store[ip].blockedUntil = null;
      store[ip].reputationScore = Math.min(100, store[ip].reputationScore + 5);
      store[ip].lastSeen = Date.now();
    }
  }

  async blockIp(ip: string, durationMs: number, reason: string): Promise<void> {
    const store = this.getStore();
    const now = Date.now();
    const blockedUntil = now + durationMs;

    store[ip] = {
      ip,
      failedAttempts: this.MAX_FAILED_ATTEMPTS,
      blockedUntil,
      reputationScore: 0,
      lastSeen: now,
    };

    try {
      await this.supabase.from("ip_reputation").upsert({
        ip_address: ip,
        failed_attempts: this.MAX_FAILED_ATTEMPTS,
        blocked_until: new Date(blockedUntil).toISOString(),
        score: 0,
        reason,
        last_seen: new Date(now).toISOString(),
      }, { onConflict: "ip_address" });
    } catch {
      // Ignore DB error
    }
  }
}
