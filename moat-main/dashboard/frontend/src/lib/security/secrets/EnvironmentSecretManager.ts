import { SecretStatus, SecretType } from "./types";
import { SecretVersionManager } from "./SecretVersionManager";
import { KeyRotationService } from "./KeyRotationService";
import { SecretAuditLogService } from "./SecretAuditLogService";

/**
 * EnvironmentSecretManager
 * 
 * Centralized enterprise secret manager coordinating Phase 7 security controls:
 * Application Startup -> Load Secrets -> Validate Secret Version -> Decrypt Secret -> Initialize Services -> Periodic Secret Rotation -> Audit Rotation.
 */
export class EnvironmentSecretManager {
  private static isInitialized = false;

  /**
   * Execute application startup security workflow:
   * Load, validate, decrypt, initialize services, and check rotation schedules.
   */
  static async initialize(): Promise<{ initialized: boolean; secretsLoaded: number; status: string }> {
    if (this.isInitialized) {
      return { initialized: true, secretsLoaded: SecretVersionManager.getAllSecretNames().length, status: "READY" };
    }

    await SecretAuditLogService.logAuditEvent("APP_STARTUP_INIT", "SYSTEM", 1, "Initiating centralized secret loading, version validation, and decryption...", "INFO");

    // Load and register essential system credentials with explicit TTLs
    await SecretVersionManager.registerSecret("MOAT_JWT_SECRET", "JWT_SECRET", process.env.JWT_SECRET || "default_jwt_secret_hex_2026_super_secure_32bytes", 30, "startup_loader");
    await SecretVersionManager.registerSecret("GRAPH_CLIENT_SECRET", "GRAPH_SECRET", process.env.GRAPH_SECRET || "default_graph_oauth_secret_2026", 60, "startup_loader");
    await SecretVersionManager.registerSecret("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY", process.env.SUPABASE_KEY || "default_supabase_service_role_key_2026", 90, "startup_loader");
    await SecretVersionManager.registerSecret("MOAT_DATABASE_URL", "DATABASE_URL", process.env.DATABASE_URL || "postgresql://moat_admin:secure_pwd@localhost:5432/moat_prod", 180, "startup_loader");
    await SecretVersionManager.registerSecret("MOAT_API_KEY", "API_KEY", process.env.MOAT_API_KEY || "moat_live_api_key_889900112233", 90, "startup_loader");

    // Validate and Decrypt each secret to guarantee integrity before initializing services
    const names = SecretVersionManager.getAllSecretNames();
    for (const name of names) {
      try {
        const res = await SecretVersionManager.getSecret(name, undefined, "startup_validator", "127.0.0.1");
        if (!res.decryptedValue || res.decryptedValue.length === 0) {
          throw new Error(`Decrypted secret string is empty for '${name}'.`);
        }
      } catch (err: any) {
        await SecretAuditLogService.logAuditEvent("STARTUP_VALIDATION_FAILED", name, 1, `Failed to validate/decrypt secret '${name}' during startup: ${err.message}`, "CRITICAL");
        throw err;
      }
    }

    // Perform initial expiration and periodic rotation check
    const expRes = await SecretVersionManager.checkExpirations();
    if (expRes.expiredCount > 0) {
      await KeyRotationService.executePeriodicRotation();
    }

    this.isInitialized = true;
    await SecretAuditLogService.logAuditEvent("APP_STARTUP_COMPLETED", "SYSTEM", 1, `Successfully loaded, validated, and decrypted ${names.length} secrets. Services initialized.`, "INFO");

    return { initialized: true, secretsLoaded: names.length, status: "READY" };
  }

  /**
   * Retrieve decrypted secret value for an authorized service.
   */
  static async getSecretValue(name: string, accessedBy: string = "service", ipAddress: string = "127.0.0.1"): Promise<string> {
    if (!this.isInitialized) await this.initialize();
    const res = await SecretVersionManager.getSecret(name, undefined, accessedBy, ipAddress);
    return res.decryptedValue;
  }

  /**
   * List all stored secrets and their version metadata (without exposing plaintext values).
   */
  static async listSecrets(): Promise<Array<{ name: string; type: SecretType; activeVersion: number; status: SecretStatus; expiresAt: string; totalVersions: number }>> {
    if (!this.isInitialized) await this.initialize();
    const names = SecretVersionManager.getAllSecretNames();
    return names.map((name) => {
      const versions = SecretVersionManager.getVersions(name);
      const active = versions.find((v) => v.status === "ACTIVE") || versions[0];
      return {
        name,
        type: active.type,
        activeVersion: active.version,
        status: active.status,
        expiresAt: active.expiresAt,
        totalVersions: versions.length
      };
    });
  }

  static getAuditTrail(): { accessHistory: any[]; systemLogs: any[] } {
    return {
      accessHistory: SecretAuditLogService.getAccessHistory(),
      systemLogs: SecretAuditLogService.getAuditLogs()
    };
  }

  static async resetAndClear(): Promise<void> {
    this.isInitialized = false;
    SecretVersionManager.clearRepository();
    SecretAuditLogService.clearRepository();
  }
}
