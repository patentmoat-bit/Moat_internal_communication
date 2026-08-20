import { createClient } from "@/lib/supabase/client";

export class MFAService {
  static async getMFASettings(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.from('mfa_settings').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching MFA settings:", error);
      throw error;
    }
    return data;
  }

  static async enrollTOTP() {
    // This utilizes Supabase's native MFA API
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) throw error;
    return data;
  }

  static async challengeTOTP(factorId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) throw error;
    return data;
  }

  static async verifyTOTP(factorId: string, challengeId: string, code: string) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (error) throw error;
    return data;
  }

  static async unenroll(factorId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    return data;
  }

  static async listFactors() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data;
  }
}
