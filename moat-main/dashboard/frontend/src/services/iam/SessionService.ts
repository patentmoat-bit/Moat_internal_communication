import { createClient } from "@/lib/supabase/client";

export class SessionService {
  static async getActiveSessions(userId?: string) {
    const supabase = createClient();
    let query = supabase.from('user_sessions').select(`
      id, user_id, user_agent, ip_address, expires_at, created_at, updated_at, 
      device_type, browser, os, country, last_active_at,
      profiles (name, email)
    `).order('last_active_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    // Filter active sessions (where expires_at > now)
    query = query.gte('expires_at', new Date().toISOString());

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async revokeSession(sessionId: string) {
    const supabase = createClient();
    // To effectively revoke, we can delete the session or set expires_at to now.
    // We'll delete it to clean up.
    const { error } = await supabase.from('user_sessions').delete().eq('id', sessionId);
    if (error) throw error;
    return true;
  }

  static async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    const supabase = createClient();
    let query = supabase.from('user_sessions').delete().eq('user_id', userId);
    if (exceptSessionId) {
      query = query.neq('id', exceptSessionId);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  }
}
