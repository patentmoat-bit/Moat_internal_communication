import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export interface DBInvention {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  title: string;
  description: string;
  status: string;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DBAlert {
  id: string;
  user_id: string;
  name: string;
  alert_type: string;
  criteria: Record<string, any>;
  frequency: string;
  is_active: boolean;
  last_checked_at?: string | null;
  match_count: number;
  created_at: string;
  description?: string;
  delivery_channels: string[];
  last_match_data?: any;
  updated_at?: string;
}

export interface DBActivityLog {
  id: string;
  user_id: string;
  actor_id?: string;
  workspace_id?: string | null;
  entity_type: string;
  entity_id?: string | null;
  action: string; // 'unread' | 'read'
  message: string;
  metadata: Record<string, any>;
  created_at: string;
}

const supabase = createClient();

export const ceoPatentService = {
  // ── Projects (Inventions) ──────────────────────────────────────────────────
  async getProjects(): Promise<DBInvention[]> {
    const res = await fetch("/api/ceo/projects", { cache: "no-store" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch projects");
    }
    return res.json();
  },

  async createProjectIdea(title: string, description: string, status: string = "drafting", tags: string[] = [], assignedTo?: string): Promise<DBInvention> {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Unauthorized: Please log in again.");

    const res = await fetch("/api/ceo/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        title,
        description,
        status,
        tags,
        ...(assignedTo ? { assigned_to: assignedTo } : {})
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create project");
    }
    return res.json();
  },

  // ── Alerts ──────────────────────────────────────────────────────────────────
  async getAlerts(): Promise<DBAlert[]> {
    const res = await fetch("/api/ceo/alerts", { cache: "no-store" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch alerts");
    }
    return res.json();
  },

  async dismissAlert(alertId: string): Promise<void> {
    const res = await fetch(`/api/ceo/alerts?id=${alertId}`, { method: "PATCH" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to dismiss alert");
    }
  },

  // ── Notifications (Activity Logs) ──────────────────────────────────────────
  async getNotifications(): Promise<DBActivityLog[]> {
    const res = await fetch("/api/ceo/notifications", { cache: "no-store" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch notifications");
    }
    return res.json();
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    const res = await fetch(`/api/ceo/notifications?id=${notificationId}`, { method: "PATCH" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to mark notification read");
    }
  },

  async markAllNotificationsRead(): Promise<void> {
    const res = await fetch("/api/ceo/notifications", { method: "PATCH" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to mark all notifications read");
    }
  },

  // ── Realtime Subscription ────────────────────────────────────────────────
  subscribeToDashboardChanges(callback: () => void) {
    const channel = supabase.channel('shared-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventions' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, callback)
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
