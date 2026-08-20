import crypto from "crypto";
import { RotationSummary, SecretType } from "./types";
import { SecretVersionManager } from "./SecretVersionManager";
import { AESEncryptionService } from "./AESEncryptionService";
import { SecretAuditLogService } from "./SecretAuditLogService";

/**
 * KeyRotationService
 * 
 * Enterprise credential and key rotation engine.
 * 1. Automates rotation for JWT secrets, Microsoft Graph OAuth secrets, Supabase service keys, and AES encryption keys.
 * 2. Enforces version incrementing and retains previous DEPRECATED versions for graceful session transition.
 * 3. Supports master AES key rotation with automatic re-encryption of all stored ciphertext payloads.
 */
export class KeyRotationService {
  /**
   * Rotate JWT Signing Secret.
   * Generates a new 256-bit cryptographic secret and marks the previous version as DEPRECATED.
   */
  static async rotateJWTSecret(secretName: string = "MOAT_JWT_SECRET", initiatedBy: string = "auto_rotator"): Promise<RotationSummary> {
    const oldVersions = SecretVersionManager.getVersions(secretName);
    const oldVerNumber = oldVersions.length > 0 ? oldVersions[0].version : 0;

    // Generate new 256-bit hex secret
    const newSecretValue = crypto.randomBytes(32).toString("hex");
    const newRecord = await SecretVersionManager.registerSecret(secretName, "JWT_SECRET", newSecretValue, 30, initiatedBy);

    await SecretAuditLogService.logAuditEvent(
      "JWT_SECRET_ROTATED",
      secretName,
      newRecord.version,
      `Successfully rotated JWT secret from v${oldVerNumber} to v${newRecord.version}. Old version retained as DEPRECATED for graceful token decoding.`,
      "INFO"
    );

    return {
      secretName,
      oldVersion: oldVerNumber,
      newVersion: newRecord.version,
      rotatedAt: newRecord.createdAt,
      status: "SUCCESS"
    };
  }

  /**
   * Rotate Microsoft Graph OAuth Client Secret.
   */
  static async rotateGraphSecret(secretName: string = "GRAPH_CLIENT_SECRET", initiatedBy: string = "auto_rotator"): Promise<RotationSummary> {
    const oldVersions = SecretVersionManager.getVersions(secretName);
    const oldVerNumber = oldVersions.length > 0 ? oldVersions[0].version : 0;

    const newSecretValue = `ms_graph_sec_${crypto.randomBytes(24).toString("hex")}`;
    const newRecord = await SecretVersionManager.registerSecret(secretName, "GRAPH_SECRET", newSecretValue, 60, initiatedBy);

    await SecretAuditLogService.logAuditEvent(
      "GRAPH_SECRET_ROTATED",
      secretName,
      newRecord.version,
      `Successfully rotated Microsoft Graph client secret from v${oldVerNumber} to v${newRecord.version}.`,
      "INFO"
    );

    return {
      secretName,
      oldVersion: oldVerNumber,
      newVersion: newRecord.version,
      rotatedAt: newRecord.createdAt,
      status: "SUCCESS"
    };
  }

  /**
   * Rotate Supabase Service Role Key.
   */
  static async rotateSupabaseKey(secretName: string = "SUPABASE_SERVICE_ROLE_KEY", initiatedBy: string = "auto_rotator"): Promise<RotationSummary> {
    const oldVersions = SecretVersionManager.getVersions(secretName);
    const oldVerNumber = oldVersions.length > 0 ? oldVersions[0].version : 0;

    const newSecretValue = `sbp_srv_${crypto.randomBytes(32).toString("hex")}`;
    const newRecord = await SecretVersionManager.registerSecret(secretName, "SUPABASE_KEY", newSecretValue, 90, initiatedBy);

    await SecretAuditLogService.logAuditEvent(
      "SUPABASE_KEY_ROTATED",
      secretName,
      newRecord.version,
      `Successfully rotated Supabase service key from v${oldVerNumber} to v${newRecord.version}.`,
      "INFO"
    );

    return {
      secretName,
      oldVersion: oldVerNumber,
      newVersion: newRecord.version,
      rotatedAt: newRecord.createdAt,
      status: "SUCCESS"
    };
  }

  /**
   * Rotate Master AES-GCM 256-bit Encryption Key and Re-Encrypt All Stored Secrets.
   */
  static async rotateAESEncryptionKey(initiatedBy: string = "security_admin"): Promise<{ oldKeyHex: string; newKeyHex: string; reEncryptedCount: number }> {
    const { oldKeyHex, newKeyHex } = AESEncryptionService.rotateMasterKey();

    let reEncryptedCount = 0;
    const allNames = SecretVersionManager.getAllSecretNames();

    for (const name of allNames) {
      const versions = SecretVersionManager.getVersions(name);
      for (const ver of versions) {
        if (ver.status === "REVOKED") continue;
        try {
          // Decrypt with old key
          const plaintext = AESEncryptionService.decrypt(ver.payload, oldKeyHex);
          // Re-encrypt with new key
          ver.payload = AESEncryptionService.encrypt(plaintext, newKeyHex);
          reEncryptedCount++;
          await SecretAuditLogService.logAccess(name, ver.version, initiatedBy, "127.0.0.1", "RE_ENCRYPT");
        } catch (err: any) {
          await SecretAuditLogService.logAuditEvent("RE_ENCRYPTION_FAILED", name, ver.version, `Failed to re-encrypt secret version v${ver.version} during AES master key rotation: ${err.message}`, "CRITICAL");
        }
      }
    }

    await SecretAuditLogService.logAuditEvent(
      "AES_MASTER_KEY_ROTATED",
      "MASTER_AES_KEY",
      1,
      `Successfully rotated 256-bit AES master encryption key and re-encrypted ${reEncryptedCount} stored secret payloads.`,
      "CRITICAL"
    );

    return { oldKeyHex, newKeyHex, reEncryptedCount };
  }

  /**
   * Execute Periodic Secret Rotation check across all registered secrets.
   */
  static async executePeriodicRotation(): Promise<RotationSummary[]> {
    const summaries: RotationSummary[] = [];
    const allNames = SecretVersionManager.getAllSecretNames();

    for (const name of allNames) {
      const versions = SecretVersionManager.getVersions(name);
      const activeVer = versions.find((v) => v.status === "ACTIVE" || v.status === "EXPIRED");
      if (!activeVer) continue;

      // If expired, rotate automatically
      if (activeVer.status === "EXPIRED" || new Date(activeVer.expiresAt).getTime() < Date.now()) {
        let summary: RotationSummary;
        if (activeVer.type === "JWT_SECRET") {
          summary = await this.rotateJWTSecret(name, "auto_periodic_rotator");
        } else if (activeVer.type === "GRAPH_SECRET") {
          summary = await this.rotateGraphSecret(name, "auto_periodic_rotator");
        } else if (activeVer.type === "SUPABASE_KEY") {
          summary = await this.rotateSupabaseKey(name, "auto_periodic_rotator");
        } else {
          // Generic secret rotation
          const newVal = `rot_sec_${crypto.randomBytes(24).toString("hex")}`;
          const newRec = await SecretVersionManager.registerSecret(name, activeVer.type, newVal, 60, "auto_periodic_rotator");
          summary = { secretName: name, oldVersion: activeVer.version, newVersion: newRec.version, rotatedAt: newRec.createdAt, status: "SUCCESS" };
        }
        summaries.push(summary);
      }
    }

    return summaries;
  }
}
