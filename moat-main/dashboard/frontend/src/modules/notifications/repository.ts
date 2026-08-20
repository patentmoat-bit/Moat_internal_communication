import { createAdminClient } from "@/lib/supabase/admin";
import { Notification } from "./types";

export class NotificationsRepository {
  private supabase = createAdminClient();

  async findByReceiver(receiverId: string) {
    return await this.supabase
      .from("notifications")
      .select("*")
      .eq("receiver", receiverId)
      .order("created_at", { ascending: false });
  }

  async create(data: Partial<Notification>) {
    return await this.supabase
      .from("notifications")
      .insert(data)
      .select()
      .single();
  }

  async markAsRead(id: string) {
    return await this.supabase
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async delete(id: string) {
    return await this.supabase
      .from("notifications")
      .delete()
      .eq("id", id);
  }
}
