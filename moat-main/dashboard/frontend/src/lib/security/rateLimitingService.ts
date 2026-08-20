import { SupabaseClient } from "@supabase/supabase-js";
import { getSecurityConfig } from "./securityConfig";

interface RateLimitBucket {
  tokens: number;
  lastUpdated: number;
}

interface IpRequestLog {
  ip: string;
  timestamp: number;
  endpoint: string;
  userAgent: string;
}

export class RateLimitingService {
  constructor(private supabase?: SupabaseClient) {}

  private getStore(): Record<string, RateLimitBucket> {
    if (!(global as any).__enterpriseRateLimitStore) {
      (global as any).__enterpriseRateLimitStore = {};
    }
    return (global as any).__enterpriseRateLimitStore;
  }

  private getIpLogStore(): IpRequestLog[] {
    if (!(global as any).__enterpriseIpLogStore) {
      (global as any).__enterpriseIpLogStore = [];
    }
    return (global as any).__enterpriseIpLogStore;
  }

  async trackAndCheckIpLimit(
    ip: string,
    endpoint: string,
    userAgent: string,
    maxRequests: number = 10,
    windowMs: number = 5 * 60 * 1000
  ): Promise<{ allowed: boolean; remaining: number; retryAfterMs?: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (this.supabase) {
      try {
        await this.supabase.from("ip_rate_limits").insert({
          ip_address: ip,
          timestamp: new Date(now).toISOString(),
          endpoint,
          user_agent: userAgent,
        });

        const { count, error } = await this.supabase
          .from("ip_rate_limits")
          .select("*", { count: "exact", head: true })
          .eq("ip_address", ip)
          .eq("endpoint", endpoint)
          .gte("timestamp", new Date(windowStart).toISOString());

        if (!error && typeof count === "number") {
          if (count > maxRequests) {
            return { allowed: false, remaining: 0, retryAfterMs: windowMs };
          }
          return { allowed: true, remaining: Math.max(0, maxRequests - count) };
        }
      } catch {
        // Fallback to in-memory
      }
    }

    let logs = this.getIpLogStore();
    logs = logs.filter((l) => l.timestamp >= windowStart);
    (global as any).__enterpriseIpLogStore = logs;

    logs.push({ ip, timestamp: now, endpoint, userAgent });

    const ipRequests = logs.filter((l) => l.ip === ip && l.endpoint === endpoint);

    if (ipRequests.length > maxRequests) {
      const oldestTimestamp = ipRequests[0]?.timestamp || now;
      const retryAfterMs = Math.max(1000, windowMs - (now - oldestTimestamp));
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    return { allowed: true, remaining: maxRequests - ipRequests.length };
  }

  async checkLimit(key: string, maxRequests: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfterMs?: number;
  }> {
    const store = this.getStore();
    const now = Date.now();

    if (!store[key]) {
      store[key] = { tokens: maxRequests, lastUpdated: now };
    }

    const bucket = store[key];
    const elapsed = now - bucket.lastUpdated;

    if (elapsed > 0) {
      const tokensToAdd = Math.floor((elapsed / windowMs) * maxRequests);
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(maxRequests, bucket.tokens + tokensToAdd);
        bucket.lastUpdated = now;
      }
    }

    if (bucket.tokens <= 0) {
      const timeUntilNextToken = Math.ceil(windowMs / maxRequests) - elapsed;
      const retryAfterMs = Math.max(1000, timeUntilNextToken);
      return {
        allowed: false,
        remaining: 0,
        resetTime: bucket.lastUpdated + windowMs,
        retryAfterMs,
      };
    }

    return {
      allowed: true,
      remaining: bucket.tokens,
      resetTime: bucket.lastUpdated + windowMs,
    };
  }

  async consume(key: string, maxRequests: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfterMs?: number;
  }> {
    const status = await this.checkLimit(key, maxRequests, windowMs);
    if (status.allowed) {
      const store = this.getStore();
      store[key].tokens = Math.max(0, store[key].tokens - 1);
      status.remaining = store[key].tokens;
    }
    return status;
  }

  async resetLimit(key: string): Promise<void> {
    const store = this.getStore();
    delete store[key];
  }

  /**
   * Layer 1 — Strict F-07 IP & Email Login Rate Limiting (Check only)
   * Does NOT increment the failure counters.
   */
  async checkLoginLimit(email: string, ip: string, userAgent: string = "Unknown"): Promise<{ allowed: boolean; retryAfterMs?: number; error?: string }> {
    const config = getSecurityConfig();
    const windowMs = config.LOGIN_RATE_LIMIT_WINDOW_SECONDS * 1000;
    
    // Check IP Limit
    const ipCheck = await this.checkLimit(`login:ip:${ip}`, config.LOGIN_IP_MAX_ATTEMPTS, windowMs);
    
    // Check Email Limit
    const crypto = require("crypto");
    const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    const emailCheck = await this.checkLimit(`login:email:${hashedEmail}`, config.LOGIN_EMAIL_MAX_ATTEMPTS, windowMs);

    if (!ipCheck.allowed || !emailCheck.allowed) {
      const retryAfterMs = Math.max(ipCheck.retryAfterMs || 0, emailCheck.retryAfterMs || 0);
      return { allowed: false, retryAfterMs, error: "Too many login attempts. Please try again later." };
    }
    return { allowed: true };
  }

  /**
   * Record a login failure (increments counters).
   */
  async recordLoginFailure(email: string, ip: string): Promise<void> {
    const config = getSecurityConfig();
    const windowMs = config.LOGIN_RATE_LIMIT_WINDOW_SECONDS * 1000;

    await this.consume(`login:ip:${ip}`, config.LOGIN_IP_MAX_ATTEMPTS, windowMs);

    const crypto = require("crypto");
    const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    await this.consume(`login:email:${hashedEmail}`, config.LOGIN_EMAIL_MAX_ATTEMPTS, windowMs);
  }

  /**
   * Reset login failures (after successful login)
   */
  async resetLoginFailures(email: string): Promise<void> {
    const crypto = require("crypto");
    const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    await this.resetLimit(`login:email:${hashedEmail}`);
  }

  async checkForgotPasswordLimit(identifier: string, ip: string, userAgent: string = "Unknown"): Promise<{ allowed: boolean; retryAfterMs?: number; error?: string }> {
    const config = getSecurityConfig();
    const layer1 = await this.trackAndCheckIpLimit(ip, "/api/auth/forgot-password", userAgent, config.PASSWORD_RESET_IP_LIMIT, config.PASSWORD_RESET_IP_WINDOW_MS);
    if (!layer1.allowed) {
      return { allowed: false, retryAfterMs: layer1.retryAfterMs, error: "Too many password reset requests. Please try again later." };
    }

    const idLimit = await this.consume(`forgot:id:${identifier.toLowerCase()}`, config.PASSWORD_RESET_LIMIT, config.PASSWORD_RESET_WINDOW_MS);
    if (!idLimit.allowed) {
      return { allowed: false, retryAfterMs: idLimit.retryAfterMs, error: "Too many password reset requests. Please try again later." };
    }

    return { allowed: true };
  }

  async checkResetPasswordLimit(tokenOrId: string, ip: string, userAgent: string = "Unknown"): Promise<{ allowed: boolean; retryAfterMs?: number; error?: string }> {
    const layer1 = await this.trackAndCheckIpLimit(ip, "/api/auth/reset-password", userAgent, 15, 15 * 60 * 1000);
    if (!layer1.allowed) {
      return { allowed: false, retryAfterMs: layer1.retryAfterMs, error: "Too many password reset attempts. Please try again later." };
    }

    const idLimit = await this.consume(`reset:id:${tokenOrId}`, 5, 15 * 60 * 1000);
    if (!idLimit.allowed) {
      return { allowed: false, retryAfterMs: idLimit.retryAfterMs, error: "Too many password reset attempts. Please try again later." };
    }

    return { allowed: true };
  }

  async checkMfaVerifyLimit(factorId: string, ip: string, userAgent: string = "Unknown"): Promise<{ allowed: boolean; retryAfterMs?: number; error?: string }> {
    const layer1 = await this.trackAndCheckIpLimit(ip, "/api/auth/mfa/verify", userAgent, 20, 15 * 60 * 1000);
    if (!layer1.allowed) {
      return { allowed: false, retryAfterMs: layer1.retryAfterMs, error: "Too many MFA verification attempts. Please try again later." };
    }
    return { allowed: true };
  }
}
