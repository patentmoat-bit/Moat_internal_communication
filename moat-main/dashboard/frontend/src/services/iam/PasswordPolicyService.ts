import { createClient } from "@/lib/supabase/client";

export interface PasswordPolicy {
  id: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_symbols: boolean;
  prevent_last_n: number;
  expiry_days: number;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
}

export class PasswordPolicyService {
  static async getPolicy(): Promise<PasswordPolicy | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from('password_policy').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching password policy:", error);
      return null;
    }
    return data;
  }

  static async updatePolicy(updates: Partial<PasswordPolicy>) {
    const supabase = createClient();
    const policy = await this.getPolicy();
    if (!policy) throw new Error("No policy found");
    const { data, error } = await supabase.from('password_policy').update(updates).eq('id', policy.id).select().single();
    if (error) throw error;
    return data;
  }

  static async validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const policy = await this.getPolicy();
    if (!policy) return { valid: true, errors: [] }; // Failsafe

    const errors: string[] = [];

    if (password.length < policy.min_length) {
      errors.push(`Password must be at least ${policy.min_length} characters long.`);
    }
    if (policy.require_uppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter.");
    }
    if (policy.require_lowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter.");
    }
    if (policy.require_numbers && !/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number.");
    }
    if (policy.require_symbols && !/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain at least one special character.");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Note: Password history check (prevent_last_n) would need to be done server-side 
  // with access to password hashes, usually via a Supabase Edge Function or custom RPC.
}
