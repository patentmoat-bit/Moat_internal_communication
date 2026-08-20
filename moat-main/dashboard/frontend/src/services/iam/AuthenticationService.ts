import { createClient } from "@/lib/supabase/client";
import { AuditService } from "./AuditService";

export class AuthenticationService {
  
  static async checkAccountStatus(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.from('account_status').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async recordFailedLogin(email: string) {
    // In a real scenario, this would be an edge function that bypasses RLS using a service role key
    // so we can increment failed_login_attempts safely without the user being logged in.
    console.log(`Failed login attempt for ${email}`);
    // We would log to security_audit here with 'LOGIN_FAILED'
  }

  static async recordSuccessfulLogin(userId: string, deviceInfo: any) {
    const supabase = createClient();
    
    // Reset failed login attempts
    await supabase.from('account_status')
      .upsert({ user_id: userId, failed_login_attempts: 0, status: 'Active' });

    // Log the successful login in security_audit
    await AuditService.logEvent({
      userId,
      action: 'LOGIN_SUCCESS',
      ...deviceInfo
    });

    // We can also insert/update the session in user_sessions
    // Supabase native handles session tokens, but we mirror to our table
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      await supabase.from('user_sessions').upsert({
        id: sessionData.session.access_token, // or generate a uuid
        user_id: userId,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        country: deviceInfo.country,
        ip_address: deviceInfo.ipAddress,
        user_agent: deviceInfo.userAgent,
        expires_at: new Date((sessionData.session.expires_at || 0) * 1000).toISOString()
      }, { onConflict: 'id' });
    }
  }

  static async lockAccount(userId: string, durationMinutes: number) {
    const supabase = createClient();
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);
    
    await supabase.from('account_status')
      .upsert({ user_id: userId, status: 'Locked', locked_until: lockedUntil.toISOString() });

    await AuditService.logEvent({
      userId,
      action: 'ACCOUNT_LOCKED',
      details: { durationMinutes }
    });
  }
}
