import { SupabaseClient } from "@supabase/supabase-js";

export class UserService {
  constructor(private supabase: SupabaseClient) {}

  async getUser(userId: string) {
    const { data, error } = await this.supabase
      .from("users")
      .select("*, roles(role_name)")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("UserService.getUser error:", error);
      return null;
    }
    return data;
  }

  async getMfaEnrollment(userId: string): Promise<{ isEnrolled: boolean, encryptedSecret: string | null }> {
    const { data, error } = await this.supabase
      .from("users")
      .select("mfa_enabled, encrypted_totp_secret")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("UserService.getMfaEnrollment error:", error);
      return { isEnrolled: false, encryptedSecret: null };
    }

    return { isEnrolled: !!data?.mfa_enabled, encryptedSecret: data?.encrypted_totp_secret ?? null };
  }

  async enrollUser(userId: string, encryptedSecret: string): Promise<void> {
    // Just store the secret. Do not enable MFA yet.
    const { error } = await this.supabase.from("users").update({
      encrypted_totp_secret: encryptedSecret,
    }).eq("id", userId);

    if (error) {
      throw new Error(`Failed to persist MFA enrollment secret: ${error.message}`);
    }
  }

  async confirmMfaEnrollment(userId: string): Promise<void> {
    const { error } = await this.supabase.from("users").update({
      mfa_enabled: true,
      mfa_enrolled_at: new Date().toISOString()
    }).eq("id", userId);

    if (error) {
      throw new Error(`Failed to confirm MFA enrollment: ${error.message}`);
    }
  }

  async recordMfaSuccess(userId: string): Promise<void> {
    await this.supabase.from("users").update({
      last_mfa_verified_at: new Date().toISOString()
    }).eq("id", userId);
  }

  async recordMfaSuccessAndResetLimits(userId: string): Promise<void> {
    const { error } = await this.supabase.from("users").update({
      failed_login_attempts: 0,
      failed_mfa_attempts: 0,
      locked_until: null,
    }).eq("id", userId);

    if (error) {
      console.error("UserService.recordMfaSuccessAndResetLimits error:", error);
    }
  }
}
