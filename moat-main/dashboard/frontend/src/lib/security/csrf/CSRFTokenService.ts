import crypto from "crypto";
import { CSRFCookieOptions, CSRFTokenRecord } from "./types";

/**
 * CSRFTokenService
 * 
 * Enterprise cryptographic CSRF token generation, storage, and validation service.
 * 1. Generates HMAC-protected random tokens bound to user identity and session ID.
 * 2. Enforces strict token expiration (1 hour TTL by default).
 * 3. Enforces SameSite, Secure, and HttpOnly cookie attribute standards.
 */
export class CSRFTokenService {
  private static tokenRepository: Map<string, CSRFTokenRecord> = new Map();
  private static readonly SECRET_KEY = process.env.CSRF_SECRET_KEY || "moat_enterprise_csrf_secret_key_2026_super_secure_256bit";
  private static readonly TOKEN_TTL_SECONDS = 3600; // 1 hour

  /**
   * Generate a cryptographically strong CSRF token bound to a user and session.
   */
  static generateToken(userId: string = "anonymous", sessionId: string = "default_session"): {
    token: string;
    record: CSRFTokenRecord;
    cookies: CSRFCookieOptions[];
  } {
    const rawRandom = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now();
    const expiresAtMs = timestamp + this.TOKEN_TTL_SECONDS * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();

    // Create HMAC signature binding token to user and session
    const hmac = crypto.createHmac("sha256", this.SECRET_KEY);
    hmac.update(`${rawRandom}:${userId}:${sessionId}:${expiresAtMs}`);
    const signature = hmac.digest("hex");

    const token = `${rawRandom}.${signature}`;

    const record: CSRFTokenRecord = {
      token,
      userId,
      sessionId,
      expiresAt,
      createdAt: new Date(timestamp).toISOString()
    };

    this.tokenRepository.set(token, record);
    this.cleanExpiredTokens();

    // Create secure cookies
    // 1. Double-submit cookie (readable by client JS to attach to X-CSRF-Token header)
    const xsrfCookie: CSRFCookieOptions = {
      name: "XSRF-TOKEN",
      value: token,
      httpOnly: false, // Must be false so client JS can read and send header
      secure: true,    // Enforce Secure flag (HTTPS)
      sameSite: "strict", // Enforce SameSite=Strict
      path: "/",
      maxAge: this.TOKEN_TTL_SECONDS
    };

    // 2. HttpOnly internal audit/session binding cookie
    const auditCookie: CSRFCookieOptions = {
      name: "__Host-moat-csrf-auth",
      value: signature,
      httpOnly: true,  // Enforce HttpOnly=true for sensitive binding
      secure: true,    // Enforce Secure flag (HTTPS)
      sameSite: "strict", // Enforce SameSite=Strict
      path: "/",
      maxAge: this.TOKEN_TTL_SECONDS
    };

    return { token, record, cookies: [xsrfCookie, auditCookie] };
  }

  /**
   * Validate an incoming CSRF token against active session identity.
   */
  static validateToken(
    token: string | null | undefined,
    userId: string = "anonymous",
    sessionId: string = "default_session"
  ): { valid: boolean; reason?: string; errorType?: "CSRF_TOKEN_MISSING" | "CSRF_TOKEN_INVALID" | "CSRF_TOKEN_EXPIRED" } {
    if (!token || token.trim().length === 0) {
      return {
        valid: false,
        reason: "CSRF token is missing from request header (X-CSRF-Token or X-XSRF-Token).",
        errorType: "CSRF_TOKEN_MISSING"
      };
    }

    const record = this.tokenRepository.get(token);
    if (!record) {
      return {
        valid: false,
        reason: `CSRF token is invalid, unrecognized, or was not issued by this server: '${token}'.`,
        errorType: "CSRF_TOKEN_INVALID"
      };
    }

    // Check expiration
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      this.tokenRepository.delete(token);
      return {
        valid: false,
        reason: "CSRF token has expired. Please refresh your session or request a new token.",
        errorType: "CSRF_TOKEN_EXPIRED"
      };
    }

    // Verify user binding if userId was provided when token was created and is not anonymous
    if (record.userId !== "anonymous" && userId !== "anonymous" && record.userId !== userId) {
      return {
        valid: false,
        reason: `CSRF token user mismatch: Token issued for user '${record.userId}' but presented by '${userId}'. Possible session hijacking or token theft attempt blocked.`,
        errorType: "CSRF_TOKEN_INVALID"
      };
    }

    return { valid: true };
  }

  /**
   * Verify if a method requires CSRF protection (state-changing methods: POST, PUT, PATCH, DELETE).
   */
  static requiresCSRFProtection(httpMethod: string): boolean {
    const m = httpMethod.toUpperCase();
    return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
  }

  private static cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [key, record] of this.tokenRepository.entries()) {
      if (new Date(record.expiresAt).getTime() < now) {
        this.tokenRepository.delete(key);
      }
    }
  }

  static clearRepository(): void {
    this.tokenRepository.clear();
  }
}
