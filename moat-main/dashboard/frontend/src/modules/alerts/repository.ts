import { createAdminClient } from "@/lib/supabase/admin";
import { Alert } from "./types";

export class AlertsRepository {
  private supabase = createAdminClient();

  // Previously queried the "notifications" table and mapped rows into a
  // shape (title/description/type/priority/status/history) that doesn't
  // match the real Alert interface at all, with a local-file fallback on
  // top — every other method here correctly targets "alerts". Fixed to do
  // the same.
  async findByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return { data, error };
  }

  async findById(id: string) {
    return await this.supabase
      .from("alerts")
      .select("*")
      .eq("id", id)
      .single();
  }

  async create(data: Partial<Alert>) {
    return await this.supabase
      .from("alerts")
      .insert(data)
      .select()
      .single();
  }

  async update(id: string, data: Partial<Alert>) {
    return await this.supabase
      .from("alerts")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
  }

  async delete(id: string) {
    return await this.supabase
      .from("alerts")
      .delete()
      .eq("id", id);
  }
}
