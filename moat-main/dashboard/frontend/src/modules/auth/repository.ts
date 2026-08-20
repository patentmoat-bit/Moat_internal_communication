import { createAdminClient } from "@/lib/supabase/admin";
import { UserProfile } from "./types";

export class AuthRepository {
  private supabase = createAdminClient();

  async getProfile(userId: string): Promise<{ data: UserProfile | null; error: any }> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    
    return { data: data as UserProfile | null, error };
  }

  async createProfile(userId: string, email: string, details: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: any }> {
    const payload = {
      id: userId,
      email,
      name: details.name || email.split("@")[0],
      role: details.role || "Patent Analyst",
      department: details.department || null,
      company: details.company || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from("users")
      .upsert(payload)
      .select()
      .single();

    return { data: data as UserProfile | null, error };
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userId);
  }
}
