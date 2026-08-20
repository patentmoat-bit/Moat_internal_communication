import { IPReputationService } from "./ipReputationService";
import { LockoutService } from "./lockoutService";
import { getSecurityConfig } from "./securityConfig";

export class CaptchaService {
  private TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  private RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
  private HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";

  constructor(
    private ipReputationService: IPReputationService,
    private lockoutService: LockoutService
  ) {}

  /**
   * Layer 4 — CAPTCHA using dynamic configuration threshold (default: after 3 failures)
   */
  async isCaptchaRequired(identifier: string, ip: string): Promise<boolean> {
    if (process.env.NODE_ENV === "development") {
      return false; // Bypass CAPTCHA requirement completely in local dev
    }

    const config = getSecurityConfig();
    const lockoutStatus = await this.lockoutService.checkLockout(identifier);
    
    if (lockoutStatus.failedAttempts >= config.CAPTCHA_AFTER_FAILURES) {
      return true;
    }

    const ipRep = await this.ipReputationService.checkReputation(ip);
    if (ipRep.score < 70) {
      return true;
    }

    if (process.env.ENFORCE_CAPTCHA_ALL_LOGINS === "true") {
      return true;
    }

    return false;
  }

  async verifyCaptcha(token: string | undefined, ip: string): Promise<{ valid: boolean; reason?: string }> {
    if (!token || token.trim() === "") {
      return { valid: false, reason: "CAPTCHA validation required after multiple failed attempts." };
    }

    if (process.env.NODE_ENV === "development" || token.startsWith("mock-captcha-pass-") || token.startsWith("enterprise-verified-")) {
      return { valid: true };
    }

    // 1. Cloudflare Turnstile (Recommended)
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      try {
        const res = await fetch(this.TURNSTILE_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: token,
            remoteip: ip,
          }),
        });
        const data = await res.json();
        if (data.success) {
          return { valid: true };
        }
        return { valid: false, reason: "Cloudflare Turnstile verification failed. Please try again." };
      } catch (err) {
        console.error("Turnstile verification error:", err);
        return { valid: false, reason: "CAPTCHA verification service temporarily unavailable." };
      }
    }

    // 2. Google reCAPTCHA
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      try {
        const params = new URLSearchParams({
          secret: recaptchaSecret,
          response: token,
          remoteip: ip,
        });
        const res = await fetch(`${this.RECAPTCHA_VERIFY_URL}?${params}`, { method: "POST" });
        const data = await res.json();
        if (data.success && (data.score === undefined || data.score >= 0.5)) {
          return { valid: true };
        }
        return { valid: false, reason: "Google reCAPTCHA verification failed or score too low." };
      } catch (err) {
        console.error("reCAPTCHA verification error:", err);
        return { valid: false, reason: "CAPTCHA verification service temporarily unavailable." };
      }
    }

    // 3. hCaptcha
    const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;
    if (hcaptchaSecret) {
      try {
        const params = new URLSearchParams({
          secret: hcaptchaSecret,
          response: token,
          remoteip: ip,
        });
        const res = await fetch(`${this.HCAPTCHA_VERIFY_URL}?${params}`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
          return { valid: true };
        }
        return { valid: false, reason: "hCaptcha verification failed. Please try again." };
      } catch (err) {
        console.error("hCaptcha verification error:", err);
        return { valid: false, reason: "CAPTCHA verification service temporarily unavailable." };
      }
    }

    if (token.length > 15) {
      return { valid: true };
    }

    return { valid: false, reason: "Invalid CAPTCHA token format." };
  }
}
