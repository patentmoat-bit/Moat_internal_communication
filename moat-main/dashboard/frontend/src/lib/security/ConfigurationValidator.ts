export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  environment: string;
}

/**
 * ConfigurationValidator
 * 
 * Validates startup configuration and environment variables to prevent secret leakage.
 * Ensures Service Role Keys are never exposed to the client via NEXT_PUBLIC_* prefixes,
 * and verifies required environment variables are present before execution.
 */
export class ConfigurationValidator {
  private static isValidated = false;
  private static lastResult: ValidationResult | null = null;

  /**
   * Validate system environment variables and security configuration.
   */
  static validate(forceRecheck = false): ValidationResult {
    if (ConfigurationValidator.isValidated && !forceRecheck && ConfigurationValidator.lastResult) {
      return ConfigurationValidator.lastResult;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const env = process.env.NODE_ENV || "development";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || "";

    // 1. Ensure Service Role Key is never exposed via NEXT_PUBLIC_*
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("NEXT_PUBLIC_")) {
        // Check if variable name looks like a secret
        if (
          key.includes("SERVICE_ROLE") ||
          key.includes("SECRET") ||
          key.includes("PRIVATE_KEY") ||
          key.includes("ADMIN_KEY")
        ) {
          errors.push(`SECURITY VIOLATION: Secret variable name exposed to client bundle: ${key}`);
        }

        // Check if variable value matches a known server-only secret
        if (serviceRoleKey && value === serviceRoleKey && value.length > 10) {
          errors.push(`CRITICAL SECURITY LEAK: SUPABASE_SERVICE_ROLE_KEY is exposed in client variable ${key}`);
        }
        if (jwtSecret && value === jwtSecret && value.length > 5) {
          errors.push(`CRITICAL SECURITY LEAK: JWT_SECRET is exposed in client variable ${key}`);
        }
      }
    }

    // 2. Check required basic Supabase client configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
      if (env === "production") {
        errors.push("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
      } else {
        warnings.push("NEXT_PUBLIC_SUPABASE_URL is not set; using local development fallback.");
      }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY) {
      if (env === "production") {
        errors.push("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
      } else {
        warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set; using local development fallback.");
      }
    }

    // 3. Production Hardening Rules
    if (env === "production") {
      if (process.env.NEXT_PUBLIC_VERBOSE_ERRORS === "true" || process.env.VERBOSE_ERRORS === "true") {
        errors.push("SECURITY MISCONFIGURATION: Verbose error output must be disabled in production.");
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      environment: env,
    };

    ConfigurationValidator.isValidated = true;
    ConfigurationValidator.lastResult = result;

    if (!result.isValid && env === "production") {
      console.error("[CRITICAL CONFIGURATION ERROR] Security startup validation failed:", errors);
    }

    return result;
  }

  /**
   * Throw an exception if critical security rules are violated.
   */
  static assertValidConfiguration(): void {
    const res = ConfigurationValidator.validate();
    if (!res.isValid) {
      throw new Error(`System Startup Failed — Security Misconfiguration: ${res.errors.join("; ")}`);
    }
  }
}
