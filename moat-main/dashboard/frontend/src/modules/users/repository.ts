import { createAdminClient } from "@/lib/supabase/admin";
import { UserProfile, UserRole } from "./types";

export class UsersRepository {
  private supabase = createAdminClient();

  async getProfile(id: string) {
    return await this.supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
  }

  async updateProfile(id: string, data: Partial<UserProfile>) {
    return await this.supabase
      .from("users")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
  }

  async getAllProfiles() {
    return await this.supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async getRoles(): Promise<{ data: UserRole[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from("roles")
      .select("*");
    return { data: data as UserRole[] | null, error };
  }
}
