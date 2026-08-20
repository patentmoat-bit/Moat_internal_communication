import { SupabaseClient } from "@supabase/supabase-js";
import { UserService } from "./UserService";
import { MFAEnrollmentService } from "./MFAEnrollmentService";
import { TOTPVerificationService } from "./TOTPVerificationService";
import { EncryptionService } from "./EncryptionService";
import { RateLimitService } from "./RateLimitService";
import { AuditLogService } from "./AuditLogService";
import { SessionService } from "./SessionService";

export class AuthenticationService {
  public userService: UserService;
  public mfaEnrollmentService: MFAEnrollmentService;
  public rateLimitService: RateLimitService;
  public auditLogService: AuditLogService;
  public sessionService: SessionService;

  constructor(private supabase: SupabaseClient) {
    this.userService = new UserService(supabase);
    this.mfaEnrollmentService = new MFAEnrollmentService(this.userService);
    this.rateLimitService = new RateLimitService(supabase);
    this.auditLogService = new AuditLogService(supabase);
    this.sessionService = new SessionService(supabase);
  }

  async verifyMfa(userId: string, code: string, ipAddress: string, userAgent: string) {
    // Phase 2 Optimization: Consolidate User, Rate Limit, and MFA Status checks into a SINGLE query.
    const user = await this.userService.getUser(userId);
    if (!user) throw new Error("Account not found.");

    // 1. Check Rate Limit synchronously using pre-fetched user data
    const lockedUntil = user.locked_until;
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      throw new Error("Account is temporarily locked. Please try again later.");
    }

    // 2. Get Enrollment Status from pre-fetched user data
    let isEnrolled = user.mfa_enabled;
    let encryptedSecret = user.encrypted_totp_secret;
    let secret = "";
    
    // Fallback logic for local environment
    if (!isEnrolled || !encryptedSecret) {
        const enrollment = await this.userService.getMfaEnrollment(userId);
        isEnrolled = enrollment.isEnrolled;
        encryptedSecret = enrollment.encryptedSecret;
    }

    if (!enrollment.isEnrolled || !enrollment.encryptedSecret) {
      const enrollmentData = await this.mfaEnrollmentService.initializeEnrollment(userId, user.email);
      secret = typeof enrollmentData === 'string' ? enrollmentData : (enrollmentData as any).secret;
      const isValid = TOTPVerificationService.verify(secret, code, 1);
      
      if (!isValid) {
        await this.handleFailedAttempt(userId, ipAddress, userAgent);
        throw new Error("Invalid or expired authenticator code");
      }

      // Successful setup
      await this.mfaEnrollmentService.confirmEnrollment(userId);
      await this.auditLogService.logEvent(userId, "MFA_ENROLLMENT_COMPLETED", ipAddress, userAgent);
      
    } else {
      // Subsequent logins - Decrypt and verify
      const decrypted = EncryptionService.decrypt(encryptedSecret);
      if (!decrypted) throw new Error("Internal server error: MFA configuration corrupted.");
      secret = decrypted;
      
      const isValid = TOTPVerificationService.verify(secret, code, 1);
      if (!isValid) {
        await this.handleFailedAttempt(userId, ipAddress, userAgent);
        throw new Error("Invalid or expired authenticator code");
      }
    }

    // 3. Phase 2 Optimization: Consolidate Reset attempts and MFA success updates
    // Instead of doing 2 separate UPDATE statements, we do 1.
    await this.userService.recordMfaSuccessAndResetLimits(userId);

    // 4. Issue JWT and Session
    const roleName = Array.isArray(user.roles) ? user.roles[0]?.role_name : (user.roles as any)?.role_name || "Viewer";
    await this.sessionService.createSession(userId, user.email, user.name, roleName, ipAddress, userAgent);

    // 5. Audit Logging
    // Fire both inserts concurrently using Promise.all
    await Promise.all([
        this.auditLogService.logEvent(userId, "MFA_VERIFIED", ipAddress, userAgent),
        this.auditLogService.logEvent(userId, "LOGIN_SUCCESS", ipAddress, userAgent)
    ]);

    return { id: user.id, email: user.email, name: user.name, role: roleName };
  }

  private async handleFailedAttempt(userId: string, ipAddress: string, userAgent: string) {
    await this.auditLogService.logEvent(userId, "INVALID_MFA_CODE", ipAddress, userAgent);
    
    const isLocked = await this.rateLimitService.incrementFailedAttempt(userId);
    if (isLocked) {
      await this.auditLogService.logEvent(userId, "ACCOUNT_LOCKED", ipAddress, userAgent, { reason: "Too many failed MFA attempts" });
      throw new Error("Account is temporarily locked. Please try again later.");
    }
  }
}
