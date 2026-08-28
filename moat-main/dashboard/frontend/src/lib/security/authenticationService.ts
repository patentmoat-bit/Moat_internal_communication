import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { SignJWT, jwtVerify } from "jose";
import { IPReputationService } from "./ipReputationService";
import { RateLimitingService } from "./rateLimitingService";
import { LockoutService } from "./lockoutService";
import { CaptchaService } from "./captchaService";
import { AuditLogService } from "./auditLogService";
import { SessionService } from "./sessionService";
import { UserService } from "@/services/auth/UserService";
import { MFAEnrollmentService } from "@/services/auth/MFAEnrollmentService";
import { TOTPVerificationService } from "@/services/auth/TOTPVerificationService";
import { EncryptionService } from "@/services/auth/EncryptionService";
import { validatePasswordPolicy } from "./passwordPolicy";

export class EnterpriseAuthenticationService {
  public ipReputationService: IPReputationService;
  public rateLimitingService: RateLimitingService;
  public lockoutService: LockoutService;
  public captchaService: CaptchaService;
  public auditLogService: AuditLogService;
  public sessionService: SessionService;
  private userService: UserService;
  private mfaEnrollmentService: MFAEnrollmentService;

  constructor(private supabase: SupabaseClient) {
    this.ipReputationService = new IPReputationService(supabase);
    this.rateLimitingService = new RateLimitingService(supabase);
    this.lockoutService = new LockoutService(supabase);
    this.captchaService = new CaptchaService(this.ipReputationService, this.lockoutService);
    this.auditLogService = new AuditLogService(supabase);
    this.sessionService = new SessionService(supabase);
    this.userService = new UserService(supabase);
    this.mfaEnrollmentService = new MFAEnrollmentService(this.userService);
  }

  private getMfaChallengeSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET_KEY;
    if (!secret || secret.length === 0) {
      throw new Error("Missing required environment variable: JWT_SECRET_KEY");
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * A signed, short-lived token binding an MFA challenge to the user who
   * just passed the password check. Prevents /api/auth/mfa/verify from
   * being callable with an arbitrary client-supplied user id.
   */
  private async signMfaChallengeToken(userId: string): Promise<string> {
    return new SignJWT({ purpose: "mfa_challenge" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(this.getMfaChallengeSecret());
  }

  private async verifyMfaChallengeToken(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.getMfaChallengeSecret());
      if (payload.purpose !== "mfa_challenge" || typeof payload.sub !== "string") {
        throw new Error("Invalid challenge token");
      }
      return payload.sub;
    } catch {
      throw { status: 401, message: "MFA challenge expired or invalid. Please sign in again.", error: "MFA challenge expired or invalid. Please sign in again." };
    }
  }

  /**
   * Issues a real password-reset token for a user who just proved they know
   * their current (admin-issued temporary) password, so the client can jump
   * straight to the reset-password page without an email round-trip.
   */
  private async issueForcedResetToken(userId: string, ip: string, userAgent: string): Promise<string> {
    const crypto = require("crypto");
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiryMinutes = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || "30", 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const insertRes = await this.supabase.from("password_reset_tokens").insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      requested_ip: ip,
      user_agent: userAgent,
    });
    if (insertRes.error) {
      console.error("Failed to store forced-reset token:", insertRes.error);
      throw { status: 500, message: "Failed to initiate password reset.", error: "Failed to initiate password reset." };
    }

    return rawToken;
  }

  async authenticateLogin(email: string, password: string, ip: string, userAgent: string, captchaToken?: string) {
    const cleanEmail = email.toLowerCase().trim();
    const domain = cleanEmail.split('@')[1];

    const rateLimit = await this.rateLimitingService.checkLoginLimit(cleanEmail, ip, userAgent);
    if (!rateLimit.allowed) {
      await this.ipReputationService.recordFailure(ip, "Rate limit exceeded on login");
      
      const crypto = require("crypto");
      const hashedEmail = crypto.createHash('sha256').update(cleanEmail).digest('hex');

      await this.auditLogService.logEvent({
        email: null,
        eventType: "LOGIN_RATE_LIMITED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "WARNING",
        failureReason: "Login rate limit exceeded",
        metadata: {
          accountIdentifier: hashedEmail
        }
      });
      const errorMsg = rateLimit.error || "Too many login attempts. Please try again later.";
      throw { status: 429, message: errorMsg, error: errorMsg, retryAfterMs: rateLimit.retryAfterMs, code: "RATE_LIMITED" };
    }

    // 1. Enterprise Domain Validation
    const { data: orgDomain, error: orgDomainError } = await this.supabase
      .from("organization_domains")
      .select("id, is_enabled, organization_id")
      .eq("domain", domain)
      .single();

    if (!orgDomain) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "DOMAIN_ACCESS_DENIED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "FAILURE",
        failureReason: "Domain not in enterprise allowlist",
      });
      await this.rateLimitingService.recordLoginFailure(cleanEmail, ip);
      // Generic error to prevent enumeration
      throw { status: 401, message: "Unable to authenticate with the provided credentials.", error: "Unable to authenticate with the provided credentials." };
    }

    const { data: org } = await this.supabase
      .from("organizations")
      .select("id, is_enabled, name")
      .eq("id", orgDomain.organization_id)
      .single();

    if (!orgDomain.is_enabled || !org?.is_enabled) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "DOMAIN_DISABLED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "FAILURE",
        failureReason: "Domain or organization is disabled",
      });
      await this.rateLimitingService.recordLoginFailure(cleanEmail, ip);
      // Generic error
      throw { status: 401, message: "Unable to authenticate with the provided credentials.", error: "Unable to authenticate with the provided credentials." };
    }

    const ipRep = await this.ipReputationService.checkReputation(ip);
    if (!ipRep.allowed) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "IP_BLOCKED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "FAILURE",
        failureReason: ipRep.reason || "IP reputation blocked",
      });
      throw { status: 429, message: ipRep.reason || "IP address temporarily blocked.", error: ipRep.reason || "IP address temporarily blocked." };
    }



    const lockout = await this.lockoutService.checkLockout(cleanEmail);
    if (lockout.isLocked) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "ACCOUNT_LOCKED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "FAILURE",
        failureReason: lockout.reason || "Account locked due to multiple failed attempts",
      });
      const errorMsg = lockout.error || lockout.reason || "Your account has been temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.";
      throw { status: 429, message: errorMsg, error: errorMsg };
    }

    const requiresCaptcha = await this.captchaService.isCaptchaRequired(cleanEmail, ip);
    if (requiresCaptcha) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "CAPTCHA_REQUIRED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "INFO",
      });
      const captchaRes = await this.captchaService.verifyCaptcha(captchaToken, ip);
      if (!captchaRes.valid) {
        await this.auditLogService.logEvent({
          email: cleanEmail,
          eventType: "CAPTCHA_FAILED",
          ipAddress: ip,
          userAgent,
          endpoint: "/api/auth/login",
          status: "FAILURE",
          failureReason: captchaRes.reason || "CAPTCHA verification failed",
        });
        const errorMsg = captchaRes.reason || "CAPTCHA validation required after multiple failed attempts.";
        throw { status: 400, message: errorMsg, error: errorMsg };
      }
    }

    const { data: user, error } = await this.supabase
      .from("users")
      .select("id, name, email, role_id, is_active, status, password_change_required, roles(role_name)")
      .eq("email", cleanEmail)
      .single();

    if (error || !user) {
      const lockRes = await this.lockoutService.incrementFailure(cleanEmail);
      await this.lockoutService.applyProgressiveDelay(lockRes.attempts);
      await this.ipReputationService.recordFailure(ip, "Login attempt for non-existent account");
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: lockRes.isLocked ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "FAILURE",
        failureReason: "Account not found",
      });

      if (lockRes.isLocked) {
        const errorMsg = lockRes.error || "Your account has been temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.";
        throw { status: 429, message: errorMsg, error: errorMsg };
      }
      
      await this.rateLimitingService.recordLoginFailure(cleanEmail, ip);
      throw { status: 401, message: "Invalid email or password.", error: "Invalid email or password." };
    }

    if (!user.is_active || user.status === "DISABLED" || user.status === "SUSPENDED" || user.status === "Inactive") {
      await this.auditLogService.logEvent({
        userId: user.id,
        email: cleanEmail,
        eventType: "LOGIN_FAILED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "FAILURE",
        failureReason: "Account disabled or suspended",
      });
      throw { status: 403, message: "Account is disabled. Please contact your administrator.", error: "Account is disabled. Please contact your administrator." };
    }

    // The single source of truth for credentials is Supabase Auth itself — no
    // separate custom password store. This MUST run on a throwaway client, not
    // `this.supabase` — signInWithPassword mutates the calling client's internal
    // session state, which would silently switch every later call in this class
    // (audit logs, reset tokens, MFA writes) from service-role to the freshly
    // authenticated user's own (far more restricted) session for the rest of
    // this request.
    const credentialCheckClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: signInError } = await credentialCheckClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    const isPasswordValid = !signInError;
    if (!isPasswordValid) {
      const lockRes = await this.lockoutService.incrementFailure(cleanEmail);
      await this.lockoutService.applyProgressiveDelay(lockRes.attempts);
      await this.ipReputationService.recordFailure(ip, "Invalid password");
      await this.auditLogService.logEvent({
        userId: user.id,
        email: cleanEmail,
        eventType: lockRes.isLocked ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "FAILURE",
        failureReason: "Invalid password",
      });

      if (lockRes.isLocked) {
        const errorMsg = lockRes.error || "Your account has been temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.";
        throw { status: 429, message: errorMsg, error: errorMsg };
      }
      await this.rateLimitingService.recordLoginFailure(cleanEmail, ip);
      throw { status: 401, message: "Invalid email or password.", error: "Invalid email or password." };
    }

    await this.lockoutService.resetLockout(cleanEmail);
    await this.rateLimitingService.resetLoginFailures(cleanEmail);
    await this.ipReputationService.recordSuccess(ip);

    // Log LOGIN_SUCCESS for audit trail upon successful password check
    await this.auditLogService.logEvent({
      userId: user.id,
      email: cleanEmail,
      eventType: "DOMAIN_LOGIN_ALLOWED",
      ipAddress: ip,
      userAgent,
      endpoint: "/api/auth/login",
      status: "SUCCESS",
      metadata: { stage: "password_verified", mfa_required: true, domain, organization: org?.name },
    });

    // Record last login IP and timestamp
    try {
      await this.supabase
        .from("users")
        .update({
          last_login_ip: ip,
          last_login_at: new Date().toISOString(),
          failed_login_attempts: 0,
          locked_until: null,
        })
        .eq("id", user.id);
    } catch {
      // Ignore DB error if table structure fallback in memory
    }

    if (user.password_change_required) {
      const resetToken = await this.issueForcedResetToken(user.id, ip, userAgent);
      await this.auditLogService.logEvent({
        userId: user.id,
        email: cleanEmail,
        eventType: "PASSWORD_RESET_REQUESTED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "INFO",
        metadata: { stage: "forced_password_change" },
      });
      return {
        requiresPasswordReset: true,
        reset_token: resetToken,
        message: "You must set a new password before continuing.",
      };
    }

    return await this.issueMfaChallenge(user, ip, userAgent);
  }

  /**
   * The shared "second half" of login — issues an MFA challenge (or reuses an
   * unconfirmed one) for a user who has already been authenticated by some
   * other means. Used by both authenticateLogin (password) and authenticateSso
   * (Microsoft/Azure AD), so there is exactly one place that decides when MFA
   * is satisfied and a real session becomes issuable — an SSO login can no
   * more skip this than a password login can.
   */
  private async issueMfaChallenge(user: { id: string; email: string }, ip: string, userAgent: string) {
    const cleanEmail = user.email;
    const enrollment = await this.userService.getMfaEnrollment(user.id);
    // A user is only truly enrolled once a secret actually exists — the
    // `mfa_enabled` flag can be true with no secret ever generated (e.g.
    // bad/incomplete seed data), which previously skipped QR generation
    // entirely and left the account impossible to verify.
    const isFullyEnrolled = enrollment.isEnrolled && !!enrollment.encryptedSecret;
    let qrCodeSvg = undefined;
    if (!isFullyEnrolled) {
      await this.auditLogService.logEvent({
        userId: user.id,
        email: cleanEmail,
        eventType: "MFA_ENROLLMENT_STARTED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/login",
        status: "INFO",
      });

      if (!enrollment.encryptedSecret) {
        // Generate and store new secret without enabling MFA
        const { secret, uri } = await this.mfaEnrollmentService.initializeEnrollment(user.id, cleanEmail);
        const QRCode = require('qrcode');
        qrCodeSvg = await QRCode.toString(uri, { type: 'svg', width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      } else {
        // Reuse existing unconfirmed secret
        const secret = EncryptionService.decrypt(enrollment.encryptedSecret);
        if (secret) {
          const QRCode = require('qrcode');
          const uri = `otpauth://totp/MOAT:${encodeURIComponent(cleanEmail)}?secret=${secret}&issuer=MOAT`;
          qrCodeSvg = await QRCode.toString(uri, { type: 'svg', width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        }
      }
    }

    return {
      requiresMFA: true,
      mfa_required: true,
      mfa_enrolled: isFullyEnrolled,
      challenge_token: await this.signMfaChallengeToken(user.id),
      qr_code_svg: qrCodeSvg,
      message: "MFA challenge required.",
    };
  }

  /**
   * Completes login for a user who already authenticated via Microsoft/Azure
   * AD through Supabase Auth's own OAuth flow — no password ever touches this
   * app. Applies the same organization-domain allowlist and account-status
   * checks as password login (an existing account is still required; this
   * never auto-provisions one), then funnels into the identical MFA challenge
   * used everywhere else via issueMfaChallenge(). Deliberately does NOT apply
   * the password-lockout/rate-limit/captcha machinery here — those defend
   * against password guessing, which doesn't apply once Microsoft has already
   * verified the user's identity — and does NOT check password_change_required,
   * since that flag is about forcing a temporary PASSWORD to be changed, which
   * is meaningless for a login that never used a password.
   */
  async authenticateSso(email: string, ip: string, userAgent: string) {
    const cleanEmail = email.toLowerCase().trim();
    const domain = cleanEmail.split('@')[1];

    const { data: orgDomain } = await this.supabase
      .from("organization_domains")
      .select("id, is_enabled, organization_id")
      .eq("domain", domain)
      .single();

    if (!orgDomain) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "DOMAIN_ACCESS_DENIED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/sso/bridge",
        status: "FAILURE",
        failureReason: "Domain not in enterprise allowlist",
      });
      throw { status: 401, message: "Unable to authenticate with the provided credentials.", error: "Unable to authenticate with the provided credentials." };
    }

    const { data: org } = await this.supabase
      .from("organizations")
      .select("id, is_enabled, name")
      .eq("id", orgDomain.organization_id)
      .single();

    if (!orgDomain.is_enabled || !org?.is_enabled) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "DOMAIN_DISABLED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/sso/bridge",
        status: "FAILURE",
        failureReason: "Domain or organization is disabled",
      });
      throw { status: 401, message: "Unable to authenticate with the provided credentials.", error: "Unable to authenticate with the provided credentials." };
    }

    const { data: user, error } = await this.supabase
      .from("users")
      .select("id, name, email, role_id, is_active, status, roles(role_name)")
      .eq("email", cleanEmail)
      .single();

    if (error || !user) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "LOGIN_FAILED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/sso/bridge",
        status: "FAILURE",
        failureReason: "SSO login for account with no matching profile",
      });
      throw { status: 403, message: "No account found for this Microsoft identity. Contact your administrator.", error: "No account found for this Microsoft identity. Contact your administrator." };
    }

    if (!user.is_active || user.status === "DISABLED" || user.status === "SUSPENDED" || user.status === "Inactive") {
      await this.auditLogService.logEvent({
        userId: user.id,
        email: cleanEmail,
        eventType: "LOGIN_FAILED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/sso/bridge",
        status: "FAILURE",
        failureReason: "Account disabled or suspended",
      });
      throw { status: 403, message: "Account is disabled. Please contact your administrator.", error: "Account is disabled. Please contact your administrator." };
    }

    await this.auditLogService.logEvent({
      userId: user.id,
      email: cleanEmail,
      eventType: "DOMAIN_LOGIN_ALLOWED",
      ipAddress: ip,
      userAgent,
      endpoint: "/api/auth/sso/bridge",
      status: "SUCCESS",
      metadata: { stage: "sso_verified", mfa_required: true, domain, organization: org?.name, provider: "microsoft" },
    });

    try {
      await this.supabase
        .from("users")
        .update({ last_login_ip: ip, last_login_at: new Date().toISOString() })
        .eq("id", user.id);
    } catch {
      // Ignore DB error if table structure fallback in memory
    }

    return await this.issueMfaChallenge(user, ip, userAgent);
  }

  async requestPasswordReset(email: string, ip: string, userAgent: string, captchaToken?: string) {
    const cleanEmail = email.toLowerCase().trim();

    const ipRep = await this.ipReputationService.checkReputation(ip);
    if (!ipRep.allowed) {
      throw { status: 429, message: "IP address temporarily blocked.", error: "IP address temporarily blocked." };
    }

    const rateLimit = await this.rateLimitingService.checkForgotPasswordLimit(cleanEmail, ip, userAgent);
    if (!rateLimit.allowed) {
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "PASSWORD_RESET_RATE_LIMIT",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/forgot-password",
        status: "WARNING",
        failureReason: "Password reset rate limit exceeded",
      });
      const errorMsg = rateLimit.error || "Too many password reset requests. Please try again later.";
      throw { status: 429, message: errorMsg, error: errorMsg };
    }

    const requiresCaptcha = await this.captchaService.isCaptchaRequired(cleanEmail, ip);
    if (requiresCaptcha) {
      const captchaRes = await this.captchaService.verifyCaptcha(captchaToken, ip);
      if (!captchaRes.valid) {
        throw { status: 400, message: captchaRes.reason || "CAPTCHA verification failed.", error: captchaRes.reason || "CAPTCHA verification failed." };
      }
    }

    const { data: user } = await this.supabase.from("users").select("id, email, failed_reset_requests").eq("email", cleanEmail).single();

    if (!user) {
      await this.lockoutService.simulateConstantTimeDelay();
      await this.auditLogService.logEvent({
        email: cleanEmail,
        eventType: "PASSWORD_RESET_REQUESTED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/forgot-password",
        status: "WARNING",
        failureReason: "Reset requested for non-existent account",
      });
      return {
        success: true,
        message: "If an account exists, a password reset link has been sent.",
      };
    }

    try {
      await this.supabase
        .from("users")
        .update({
          failed_reset_requests: (user.failed_reset_requests || 0) + 1,
        })
        .eq("id", user.id);
    } catch {
      // Ignore DB error
    }

    await this.auditLogService.logEvent({
      userId: user.id,
      email: cleanEmail,
      eventType: "PASSWORD_RESET_REQUESTED",
      ipAddress: ip,
      userAgent,
      endpoint: "/api/auth/forgot-password",
      status: "SUCCESS",
    });

    // 1. Generate cryptographically secure random token (32 bytes)
    const crypto = require("crypto");
    const rawToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash token for database storage (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 3. Expiry - configurable, default 30 mins
    const expiryMinutes = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || "30", 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // 4. Store token hash in DB
    try {
      await this.supabase.from("password_reset_tokens").insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        requested_ip: ip,
        user_agent: userAgent
      });
    } catch (e) {
      console.warn("Failed to insert into password_reset_tokens:", e);
    }

    // 5. Dispatch email via MS Graph infrastructure
    const resetUrl = `https://moat.ai/reset-password?token=${rawToken}`;
    const htmlBody = `
      <h2>MOAT Password Reset Request</h2>
      <p>We received a request to reset the password for your MOAT account.</p>
      <p>Click the link below to reset it. This link is valid for ${expiryMinutes} minutes.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#c9a84c;color:#000;text-decoration:none;border-radius:5px;font-weight:bold;">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    try {
      const { dispatchEmails } = require("@/lib/events/handlers");
      await dispatchEmails([cleanEmail], [], "MOAT Password Reset Request", htmlBody);
    } catch (emailError) {
      console.error("Failed to send password reset email");
    }

    await this.auditLogService.logEvent({
      userId: user.id,
      email: cleanEmail,
      eventType: "PASSWORD_RESET_EMAIL_SENT",
      ipAddress: ip,
      userAgent,
      endpoint: "/api/auth/forgot-password",
      status: "SUCCESS",
    });

    // generic response without token disclosure
    return {
      success: true,
      message: "If an account exists, a password reset link has been sent.",
    };
  }

  async completePasswordReset(token: string, newPassword: string, ip: string, userAgent: string) {
    if (!token || !newPassword) {
      throw { status: 400, message: "Valid token and new password are required.", error: "Valid token and new password are required." };
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      const message = policyCheck.errors.join(" ");
      throw { status: 400, message, error: message };
    }

    const rateLimit = await this.rateLimitingService.checkResetPasswordLimit(token.slice(0, 20), ip, userAgent);
    if (!rateLimit.allowed) {
      const errorMsg = rateLimit.error || "Too many reset attempts. Please try again later.";
      throw { status: 429, message: errorMsg, error: errorMsg };
    }

    const crypto = require("crypto");
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: tokenRecord } = await this.supabase
      .from("password_reset_tokens")
      .select("id, user_id, used_at, revoked_at, expires_at")
      .eq("token_hash", tokenHash)
      .single();

    if (!tokenRecord) {
      await this.ipReputationService.recordFailure(ip, "Invalid password reset token");
      await this.auditLogService.logEvent({
        eventType: "PASSWORD_RESET_TOKEN_REJECTED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/reset-password",
        status: "FAILURE",
        failureReason: "Unknown or forged token",
      });
      throw { status: 401, message: "Invalid or expired password reset link.", error: "Invalid or expired password reset link." };
    }

    if (tokenRecord.revoked_at) {
      await this.auditLogService.logEvent({
        userId: tokenRecord.user_id,
        eventType: "PASSWORD_RESET_TOKEN_REJECTED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/reset-password",
        status: "FAILURE",
        failureReason: "Revoked token",
      });
      throw { status: 401, message: "Invalid or expired password reset link.", error: "Invalid or expired password reset link." };
    }

    if (tokenRecord.used_at) {
      await this.auditLogService.logEvent({
        userId: tokenRecord.user_id,
        eventType: "PASSWORD_RESET_TOKEN_REUSED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/reset-password",
        status: "FAILURE",
        failureReason: "Token already used",
      });
      throw { status: 401, message: "Invalid or expired password reset link.", error: "Invalid or expired password reset link." };
    }

    if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      await this.auditLogService.logEvent({
        userId: tokenRecord.user_id,
        eventType: "PASSWORD_RESET_TOKEN_EXPIRED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/reset-password",
        status: "FAILURE",
        failureReason: "Token expired",
      });
      throw { status: 401, message: "Invalid or expired password reset link.", error: "Invalid or expired password reset link." };
    }

    const { data: user } = await this.supabase.from("users").select("email").eq("id", tokenRecord.user_id).single();
    if (!user) {
      throw { status: 401, message: "Invalid or expired password reset link.", error: "Target user not found." };
    }

    const email = user.email;

    // Supabase Auth is the single source of truth for credentials — update it directly,
    // there is no separate custom password store to keep in sync anymore.
    const authUpdateRes = await this.supabase.auth.admin.updateUserById(tokenRecord.user_id, { password: newPassword });
    if (authUpdateRes.error) {
      await this.auditLogService.logEvent({
        userId: tokenRecord.user_id,
        email,
        eventType: "PASSWORD_RESET_FAILED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/reset-password",
        status: "FAILURE",
        failureReason: authUpdateRes.error.message,
      });
      throw { status: 500, message: "Failed to update password.", error: "Failed to update password." };
    }

    const clearFlagRes = await this.supabase
      .from("users")
      .update({ password_change_required: false })
      .eq("id", tokenRecord.user_id);
    if (clearFlagRes.error) {
      console.error("Failed to clear password_change_required after reset:", clearFlagRes.error);
    }

    // 3. Mark token used
    await this.supabase.from("password_reset_tokens").update({
      used_at: new Date().toISOString(),
      used_ip: ip
    }).eq("id", tokenRecord.id);

    // 4. Invalidate sessions
    await this.sessionService.revokeSession(email, undefined, "PASSWORD_RESET");

    await this.auditLogService.logEvent({
      userId: tokenRecord.user_id,
      email,
      eventType: "PASSWORD_RESET_SESSIONS_REVOKED",
      ipAddress: ip,
      userAgent,
      endpoint: "/api/auth/reset-password",
      status: "SUCCESS",
    });

    await this.auditLogService.logEvent({
      userId: tokenRecord.user_id,
      email,
      eventType: "PASSWORD_RESET_SUCCESS",
      ipAddress: ip,
      userAgent,
      endpoint: "/api/auth/reset-password",
      status: "SUCCESS",
    });

    return { success: true, message: "Password reset successfully. Please log in with your new credentials." };
  }

  async verifyMfaChallenge(challengeToken: string, code: string, ip: string, userAgent: string) {
    // factorId is derived from a signed, short-lived token issued at the end
    // of a successful password check — it is never trusted from raw client
    // input, so this endpoint can't be used to attempt MFA codes against an
    // arbitrary user id obtained some other way.
    const factorId = await this.verifyMfaChallengeToken(challengeToken);

    const mfaLock = await this.lockoutService.checkMfaLockout(factorId);
    if (mfaLock.isLocked) {
      await this.auditLogService.logEvent({
        userId: factorId,
        eventType: "MFA_LOCKED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/mfa/verify",
        status: "FAILURE",
        failureReason: mfaLock.error || "Too many failed MFA attempts",
      });
      const errorMsg = mfaLock.error || "Too many failed authentication attempts. Please try again later.";
      throw { status: 429, message: errorMsg, error: errorMsg };
    }

    const rateLimit = await this.rateLimitingService.checkMfaVerifyLimit(factorId, ip, userAgent);
    if (!rateLimit.allowed) {
      await this.auditLogService.logEvent({
        userId: factorId,
        eventType: "RATE_LIMIT_EXCEEDED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/mfa/verify",
        status: "WARNING",
        failureReason: "MFA rate limit exceeded",
      });
      const errorMsg = rateLimit.error || "Too many failed authentication attempts. Please try again later.";
      throw { status: 429, message: errorMsg, error: errorMsg };
    }

    const user = await this.userService.getUser(factorId);
    if (!user) {
      throw { status: 401, message: "Account not found.", error: "Account not found." };
    }

    const enrollment = await this.userService.getMfaEnrollment(factorId);
    let secret = "";

    if (!enrollment.encryptedSecret) {
      throw { status: 400, message: "MFA enrollment not initialized.", error: "MFA enrollment not initialized." };
    }

    const decrypted = EncryptionService.decrypt(enrollment.encryptedSecret);
    if (!decrypted) throw { status: 500, message: "MFA configuration corrupted.", error: "MFA configuration corrupted." };
    secret = decrypted;

    const isValid = TOTPVerificationService.verify(secret, code, 1);
    if (!isValid) {
      const failRes = await this.lockoutService.incrementMfaFailure(factorId);
      await this.lockoutService.applyProgressiveDelay(failRes.attempts);
      await this.ipReputationService.recordFailure(ip, "Invalid MFA code");
      await this.auditLogService.logEvent({
        userId: factorId,
        email: user.email,
        eventType: failRes.isLocked ? "MFA_LOCKED" : "MFA_FAILED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/mfa/verify",
        status: "FAILURE",
        failureReason: "Invalid TOTP code",
      });
      if (failRes.isLocked) {
        const errorMsg = failRes.error || "Too many failed authentication attempts. Please try again later.";
        throw { status: 429, message: errorMsg, error: errorMsg };
      }
      throw { status: 401, message: "Invalid or expired authenticator code.", error: "Invalid or expired authenticator code." };
    }

    if (!enrollment.isEnrolled) {
      await this.mfaEnrollmentService.confirmEnrollment(factorId);
      await this.auditLogService.logEvent({
        userId: factorId,
        email: user.email,
        eventType: "MFA_ENROLLMENT_COMPLETED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/mfa/verify",
        status: "SUCCESS",
      });
    }

    await this.lockoutService.resetMfaLockout(factorId);
    await this.rateLimitingService.resetLimit(`mfa:id:${factorId}`);
    await this.userService.recordMfaSuccess(factorId);

    // Record last login IP and timestamp
    try {
      await this.supabase
        .from("users")
        .update({
          last_login_ip: ip,
          last_login_at: new Date().toISOString(),
          failed_mfa_attempts: 0,
        })
        .eq("id", user.id);
    } catch {
      // Ignore DB error if table structure fallback in memory
    }

    const roleName = Array.isArray(user.roles) ? user.roles[0]?.role_name : (user.roles as any)?.role_name || "Viewer";
    const domain = user.email.split('@')[1]?.toLowerCase();
    const tokens = await this.sessionService.createSession({ id: user.id, email: user.email, name: user.name, roleName, organizationId: user.organization_id, domain }, ip, userAgent);

    await this.auditLogService.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "MFA_VERIFIED",
      ipAddress: ip,
      userAgent,
      endpoint: "/api/auth/mfa/verify",
      status: "SUCCESS",
    });
    await this.auditLogService.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "LOGIN_SUCCESS",
      ipAddress: ip,
      userAgent,
      endpoint: "/api/auth/mfa/verify",
      status: "SUCCESS",
    });

    return { id: user.id, email: user.email, name: user.name, role: roleName, accessToken: tokens.accessToken };
  }
}
