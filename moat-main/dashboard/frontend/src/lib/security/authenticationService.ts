import { SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
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
      .select("id, name, email, password_hash, role_id, is_active, status, roles(role_name)")
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

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
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

    const enrollment = await this.userService.getMfaEnrollment(user.id);
    let qrCodeSvg = undefined;
    if (!enrollment.isEnrolled) {
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
      mfa_enrolled: enrollment.isEnrolled,
      factor_id: user.id,
      qr_code_svg: qrCodeSvg,
      message: "MFA challenge required.",
    };
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
    if (!token || !newPassword || newPassword.length < 8) {
      throw { status: 400, message: "Valid token and password with at least 8 characters are required.", error: "Valid token and password with at least 8 characters are required." };
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
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 1. Update REAL Supabase Auth credential
    const authUpdateRes = await this.supabase.auth.admin.updateUserById(tokenRecord.user_id, { password: newPassword });
    if (authUpdateRes.error) {
      console.warn("Supabase Auth password update warned:", authUpdateRes.error);
    }

    // 2. Update custom profile table if needed
    const { error: updateError } = await this.supabase
      .from("users")
      .update({
        password_hash: passwordHash,
        failed_reset_requests: 0,
      })
      .eq("id", tokenRecord.user_id);

    if (updateError) {
      await this.auditLogService.logEvent({
        userId: tokenRecord.user_id,
        email,
        eventType: "PASSWORD_RESET_FAILED",
        ipAddress: ip,
        userAgent,
        endpoint: "/api/auth/reset-password",
        status: "FAILURE",
        failureReason: "Database update error",
      });
      throw { status: 500, message: "Failed to update password.", error: "Failed to update password." };
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

  async verifyMfaChallenge(factorId: string, code: string, ip: string, userAgent: string) {
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
