import { createClient } from "@/lib/supabase/client";

export type AuditAction = 
  | 'LOGIN_SUCCESS' 
  | 'LOGIN_FAILED' 
  | 'LOGOUT'
  | 'PASSWORD_CHANGED' 
  | 'PASSWORD_RESET_REQUESTED'
  | 'ACCOUNT_LOCKED' 
  | 'ACCOUNT_UNLOCKED'
  | 'MFA_ENABLED' 
  | 'MFA_DISABLED'
  | 'MFA_VERIFIED'
  | 'MFA_FAILED'
  | 'ROLE_CHANGED'
  | 'USER_CREATED'
  | 'USER_DISABLED';

export interface AuditEventParams {
  userId?: string;
  action: AuditAction;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  country?: string;
}

export class AuditService {
  static async logEvent(params: AuditEventParams) {
    try {
      const supabase = createClient();
      
      // Attempt to gather client info if not provided
      let ip = params.ipAddress;
      let country = params.country;
      
      // Note: In a real Next.js environment, IP and Country are usually captured via headers in middleware
      // and passed down, or we use a 3rd party API client-side.
      
      await supabase.from('security_audit').insert({
        user_id: params.userId,
        action: params.action,
        details: params.details || {},
        ip_address: ip,
        user_agent: params.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : 'Unknown'),
        device_type: params.deviceType,
        browser: params.browser,
        country: country
      });
      
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // We don't throw here to avoid disrupting the main flow just because logging failed
    }
  }

  static async getEvents(userId?: string, limit = 50) {
    const supabase = createClient();
    let query = supabase.from('security_audit').select('*').order('created_at', { ascending: false }).limit(limit);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
