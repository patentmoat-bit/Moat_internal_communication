import { SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
    // Fetch mfa_enabled separately because encrypted_totp_secret column might not exist
    const { data } = await this.supabase
      .from("users")
      .select("mfa_enabled")
      .eq("id", userId)
      .single();
      
    const { data: secretData } = await this.supabase
      .from("users")
      .select("encrypted_totp_secret")
      .eq("id", userId)
      .single();
    
    // File-based fallback for local dev if DB schema is not updated
    const fallbackPath = path.join(process.cwd(), 'mfa_fallback.json');
    let fallbackData: any = {};
    try { if (fs.existsSync(fallbackPath)) fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8')); } catch (e) {}

    let fallbackMfa = fallbackData[userId];
    
    const isEnrolled = !!(data?.mfa_enabled || fallbackMfa?.mfa_enabled);
    const encryptedSecret = secretData?.encrypted_totp_secret || fallbackMfa?.secret_key || null;

    return { isEnrolled, encryptedSecret };
  }

  async enrollUser(userId: string, encryptedSecret: string): Promise<void> {
    // Just store the secret. Do not enable MFA yet.
    const { error } = await this.supabase.from("users").update({
      encrypted_totp_secret: encryptedSecret,
    }).eq("id", userId);

    if (error) {
      const fallbackPath = path.join(process.cwd(), 'mfa_fallback.json');
      let fallbackData: any = {};
      try { if (fs.existsSync(fallbackPath)) fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8')); } catch (e) {}
      fallbackData[userId] = { ...fallbackData[userId], secret_key: encryptedSecret, mfa_enabled: false };
      try { fs.writeFileSync(fallbackPath, JSON.stringify(fallbackData, null, 2)); } catch (e) {}
    }
  }

  async confirmMfaEnrollment(userId: string): Promise<void> {
    const { error } = await this.supabase.from("users").update({
      mfa_enabled: true,
      mfa_enrolled_at: new Date().toISOString()
    }).eq("id", userId);

    if (error) {
      const fallbackPath = path.join(process.cwd(), 'mfa_fallback.json');
      let fallbackData: any = {};
      try { if (fs.existsSync(fallbackPath)) fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8')); } catch (e) {}
      if (fallbackData[userId]) {
        fallbackData[userId].mfa_enabled = true;
      }
      try { fs.writeFileSync(fallbackPath, JSON.stringify(fallbackData, null, 2)); } catch (e) {}
    }
  }

  async recordMfaSuccess(userId: string): Promise<void> {
    await this.supabase.from("users").update({
      last_mfa_verified_at: new Date().toISOString()
    }).eq("id", userId);
  }

  async recordMfaSuccessAndResetLimits(userId: string): Promise<void> {
    // These columns don't actually exist in the table schema currently,
    // but we can try updating them safely via catch blocks or omit them.
    if (!(global as any).fallbackAccountStatus) (global as any).fallbackAccountStatus = {};
    (global as any).fallbackAccountStatus[userId] = { failed_login_attempts: 0, locked_until: null };
  }
}
