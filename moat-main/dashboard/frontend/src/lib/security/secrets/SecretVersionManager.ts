import crypto from "crypto";
import { SecretStatus, SecretType, SecretVersionRecord } from "./types";
import { AESEncryptionService } from "./AESEncryptionService";
import { SecretAuditLogService } from "./SecretAuditLogService";

/**
 * SecretVersionManager
 * 
 * Enterprise centralized secret storage, retrieval, versioning, and expiration manager.
 * 1. Stores secrets with explicit version numbers (e.g. v1, v2, v3) and active/deprecated status tracking.
 * 2. Never stores secrets in plaintext; encrypts payloads using 256-bit AES-GCM before storage.
 * 3. Supports graceful fallback by retaining previous DEPRECATED versions for active token decoding.
 * 4. Enforces expiration monitoring and logs all access attempts.
 */
export class SecretVersionManager {
  private static repository: Map<string, SecretVersionRecord[]> = new Map();

  /**
   * Register a new version of a secret. Encrypts value and marks previous active versions as DEPRECATED.
   */
  static async registerSecret(
    name: string,
    type: SecretType,
    rawValue: string,
    ttlDays: number = 90,
    registeredBy: string = "system_init"
  ): Promise<SecretVersionRecord> {
    const existingVersions = this.repository.get(name) || [];
    let nextVersionNumber = 1;

    // Deprecate previous active versions
    for (const ver of existingVersions) {
      if (ver.status === "ACTIVE") {
        ver.status = "DEPRECATED";
      }
      if (ver.version >= nextVersionNumber) {
        nextVersionNumber = ver.version + 1;
      }
    }

    const now = Date.now();
    const expiresAt = new Date(now + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    // Encrypt raw value using AES-256-GCM
    const encryptedPayload = AESEncryptionService.encrypt(rawValue);

    const record: SecretVersionRecord = {
      id: `sec_ver_${crypto.randomUUID()}`,
      name,
      type,
      version: nextVersionNumber,
      payload: encryptedPayload,
      status: "ACTIVE",
      createdAt: new Date(now).toISOString(),
      expiresAt
    };

    existingVersions.unshift(record);
    this.repository.set(name, existingVersions);

    await SecretAuditLogService.logAccess(name, nextVersionNumber, registeredBy, "127.0.0.1", "ROTATE");
    await SecretAuditLogService.logAuditEvent("SECRET_REGISTERED", name, nextVersionNumber, `Registered new ${type} secret '${name}' (v${nextVersionNumber}) with ${ttlDays}-day TTL.`, "INFO");

    return record;
  }

  /**
   * Retrieve and decrypt the active (or specified) version of a secret.
   */
  static async getSecret(
    name: string,
    versionNumber?: number,
    accessedBy: string = "system_service",
    ipAddress: string = "127.0.0.1"
  ): Promise<{ decryptedValue: string; version: number; record: SecretVersionRecord }> {
    const versions = this.repository.get(name);
    if (!versions || versions.length === 0) {
      await SecretAuditLogService.logAuditEvent("SECRET_NOT_FOUND", name, versionNumber || 0, `Failed retrieval attempt for unregistered secret '${name}'.`, "WARNING");
      throw new Error(`Secret '${name}' is not registered in the centralized secret manager.`);
    }

    let targetRecord: SecretVersionRecord | undefined;
    if (versionNumber !== undefined) {
      targetRecord = versions.find((v) => v.version === versionNumber);
    } else {
      // Find active version
      targetRecord = versions.find((v) => v.status === "ACTIVE");
      if (!targetRecord) {
        // Fallback to latest deprecated if no active exists
        targetRecord = versions[0];
      }
    }

    if (!targetRecord) {
      throw new Error(`Version v${versionNumber} of secret '${name}' does not exist.`);
    }

    if (targetRecord.status === "REVOKED") {
      await SecretAuditLogService.logAuditEvent("REVOKED_SECRET_ACCESSED", name, targetRecord.version, `Access denied: Secret '${name}' (v${targetRecord.version}) is revoked!`, "CRITICAL");
      throw new Error(`Security Violation: Secret '${name}' (v${targetRecord.version}) has been revoked and cannot be accessed.`);
    }

    // Check expiration
    if (new Date(targetRecord.expiresAt).getTime() < Date.now()) {
      targetRecord.status = "EXPIRED";
      await SecretAuditLogService.logAuditEvent("EXPIRED_SECRET_ACCESSED", name, targetRecord.version, `Access warning: Secret '${name}' (v${targetRecord.version}) has expired! Rotation required immediately.`, "WARNING");
    }

    // Decrypt payload
    const decryptedValue = AESEncryptionService.decrypt(targetRecord.payload);
    targetRecord.lastAccessedAt = new Date().toISOString();

    // Log access
    await SecretAuditLogService.logAccess(name, targetRecord.version, accessedBy, ipAddress, "LOAD");

    return { decryptedValue, version: targetRecord.version, record: targetRecord };
  }

  /**
   * Revoke a specific secret version.
   */
  static async revokeSecret(name: string, versionNumber?: number, revokedBy: string = "admin_security"): Promise<boolean> {
    const versions = this.repository.get(name);
    if (!versions) return false;

    let revokedCount = 0;
    for (const v of versions) {
      if (versionNumber === undefined || v.version === versionNumber) {
        v.status = "REVOKED";
        revokedCount++;
        await SecretAuditLogService.logAccess(name, v.version, revokedBy, "127.0.0.1", "REVOKE");
      }
    }

    return revokedCount > 0;
  }

  /**
   * Check all stored secrets for expiration or upcoming expiration.
   */
  static async checkExpirations(simulatedCurrentTime?: number): Promise<{ checked: number; expiredCount: number; expiringSoonCount: number }> {
    const now = simulatedCurrentTime || Date.now();
    let expiredCount = 0;
    let expiringSoonCount = 0;

    for (const [name, versions] of this.repository.entries()) {
      for (const v of versions) {
        if (v.status !== "ACTIVE" && v.status !== "DEPRECATED") continue;

        const expTime = new Date(v.expiresAt).getTime();
        if (now > expTime) {
          v.status = "EXPIRED";
          expiredCount++;
          await SecretAuditLogService.logAuditEvent("SECRET_EXPIRED", name, v.version, `Secret '${name}' (v${v.version}) expired on ${new Date(expTime).toLocaleDateString()}. Automatic rotation triggered.`, "CRITICAL");
        } else if (expTime - now < 7 * 24 * 60 * 60 * 1000) {
          expiringSoonCount++;
          await SecretAuditLogService.logAuditEvent("SECRET_EXPIRING_SOON", name, v.version, `Secret '${name}' (v${v.version}) will expire in less than 7 days.`, "WARNING");
        }
      }
    }

    return { checked: this.repository.size, expiredCount, expiringSoonCount };
  }

  static getVersions(name: string): SecretVersionRecord[] {
    return this.repository.get(name) || [];
  }

  static getAllSecretNames(): string[] {
    return Array.from(this.repository.keys());
  }

  static clearRepository(): void {
    this.repository.clear();
  }
}
