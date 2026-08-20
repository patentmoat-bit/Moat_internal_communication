import { createAdminClient } from "@/lib/supabase/admin";
import { Alert } from "./types";

export class AlertsRepository {
  private supabase = createAdminClient();

  async findByUserId(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from("notifications")
        .select("*")
        .eq("receiver", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Map notifications to the Alert interface format expected by the UI
      const mappedData = data?.map(n => ({
        id: n.id,
        title: n.title,
        description: n.description || "",
        type: n.type || "System",
        priority: n.priority || "Normal",
        status: n.is_read ? "Approved" : "Pending", // using read state as status proxy
        created_at: n.created_at,
        created_by: n.created_by || "System",
        history: [{
          action: "Notification Created",
          by: "System",
          timestamp: n.created_at
        }],
        metadata: n.metadata
      }));
      
      return { data: mappedData, error: null };
    } catch (err: any) {
      console.warn("Failed to fetch notifications from Supabase, using local DB:", err.message);
      try {
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(process.cwd(), 'src', 'app', 'api', 'alerts', 'local_db.json');
        
        let data: any[] = [];
        if (fs.existsSync(dbPath)) {
          const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
          // In fallback, just return all or try to match
          data = db.notifications || [];
        }
        
        const mappedData = data?.map(n => ({
          id: n.id,
          title: n.title,
          description: n.description || "",
          type: n.type || "System",
          priority: n.priority || "Normal",
          status: n.is_read ? "Approved" : "Pending", 
          created_at: n.created_at,
          created_by: n.created_by || "System",
          history: [{
            action: "Notification Created",
            by: "System",
            timestamp: n.created_at
          }],
          metadata: n.metadata
        }));
        return { data: mappedData, error: null };
      } catch (fsErr) {
        return { data: [], error: err };
      }
    }
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
