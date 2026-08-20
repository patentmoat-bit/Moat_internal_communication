export interface EnterpriseSecurityConfig {
  LOGIN_RATE_LIMIT: number;              // 10 requests / 5 minutes
  LOGIN_RATE_LIMIT_WINDOW_MS: number;    // 300000 ms (5 minutes)
  LOGIN_MAX_FAILURES: number;            // 5
  ACCOUNT_LOCK_DURATION_MS: number;      // 900000 ms (15 minutes)
  PASSWORD_RESET_LIMIT: number;          // 3 per hour
  PASSWORD_RESET_WINDOW_MS: number;      // 3600000 ms (1 hour)
  PASSWORD_RESET_IP_LIMIT: number;       // 10 per hour
  PASSWORD_RESET_IP_WINDOW_MS: number;   // 3600000 ms (1 hour)
  MFA_MAX_FAILURES: number;              // 5
  MFA_LOCK_DURATION_MS: number;          // 900000 ms (15 minutes)
  LOGIN_IP_MAX_ATTEMPTS: number;         // 10
  LOGIN_EMAIL_MAX_ATTEMPTS: number;      // 5
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: number; // 900 seconds (15 minutes)
}

export function getSecurityConfig(): EnterpriseSecurityConfig {
  const overrides = (global as any).__enterpriseSecurityConfigOverrides || {};

  return {
    LOGIN_RATE_LIMIT: overrides.LOGIN_RATE_LIMIT ?? parseInt(process.env.LOGIN_RATE_LIMIT || "10", 10),
    LOGIN_RATE_LIMIT_WINDOW_MS: overrides.LOGIN_RATE_LIMIT_WINDOW_MS ?? parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || "300000", 10),
    LOGIN_MAX_FAILURES: overrides.LOGIN_MAX_FAILURES ?? parseInt(process.env.LOGIN_MAX_FAILURES || "5", 10),
    ACCOUNT_LOCK_DURATION_MS: overrides.ACCOUNT_LOCK_DURATION_MS ?? parseInt(process.env.ACCOUNT_LOCK_DURATION_MS || "900000", 10),
    PASSWORD_RESET_LIMIT: overrides.PASSWORD_RESET_LIMIT ?? parseInt(process.env.PASSWORD_RESET_LIMIT || "3", 10),
    PASSWORD_RESET_WINDOW_MS: overrides.PASSWORD_RESET_WINDOW_MS ?? parseInt(process.env.PASSWORD_RESET_WINDOW_MS || "3600000", 10),
    PASSWORD_RESET_IP_LIMIT: overrides.PASSWORD_RESET_IP_LIMIT ?? parseInt(process.env.PASSWORD_RESET_IP_LIMIT || "10", 10),
    PASSWORD_RESET_IP_WINDOW_MS: overrides.PASSWORD_RESET_IP_WINDOW_MS ?? parseInt(process.env.PASSWORD_RESET_IP_WINDOW_MS || "3600000", 10),
    MFA_MAX_FAILURES: overrides.MFA_MAX_FAILURES ?? parseInt(process.env.MFA_MAX_FAILURES || "5", 10),
    MFA_LOCK_DURATION_MS: overrides.MFA_LOCK_DURATION_MS ?? parseInt(process.env.MFA_LOCK_DURATION_MS || "900000", 10),
    CAPTCHA_AFTER_FAILURES: overrides.CAPTCHA_AFTER_FAILURES ?? parseInt(process.env.CAPTCHA_AFTER_FAILURES || "3", 10),
    LOGIN_IP_MAX_ATTEMPTS: overrides.LOGIN_IP_MAX_ATTEMPTS ?? parseInt(process.env.LOGIN_IP_MAX_ATTEMPTS || "10", 10),
    LOGIN_EMAIL_MAX_ATTEMPTS: overrides.LOGIN_EMAIL_MAX_ATTEMPTS ?? parseInt(process.env.LOGIN_EMAIL_MAX_ATTEMPTS || "5", 10),
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: overrides.LOGIN_RATE_LIMIT_WINDOW_SECONDS ?? parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS || "900", 10),
  };
}

export function updateSecurityConfigOverrides(newOverrides: Partial<EnterpriseSecurityConfig>): EnterpriseSecurityConfig {
  if (!(global as any).__enterpriseSecurityConfigOverrides) {
    (global as any).__enterpriseSecurityConfigOverrides = {};
  }
  Object.assign((global as any).__enterpriseSecurityConfigOverrides, newOverrides);
  return getSecurityConfig();
}
