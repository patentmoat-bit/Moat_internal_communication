import crypto from "crypto";
import { EncryptedPayload } from "./types";

/**
 * AESEncryptionService
 * 
 * Enterprise 256-bit AES-GCM cryptographic encryption and decryption engine.
 * 1. Encrypts sensitive secret payloads (JWT secrets, API keys, certificates) at rest.
 * 2. Generates unique initialization vectors (12 bytes) and authentication tags (16 bytes) per operation.
 * 3. Enforces cryptographic integrity verification on decryption to prevent tampering or ciphertext modification.
 */
export class AESEncryptionService {
  // Master 256-bit (32-byte) encryption key stored in hex format
  private static masterKeyHex: string = process.env.MOAT_MASTER_ENCRYPTION_KEY || crypto.createHash("sha256").update("moat_enterprise_master_secret_2026_super_secure").digest("hex");

  /**
   * Encrypt a raw secret string using AES-256-GCM.
   */
  static encrypt(rawSecret: string, customKeyHex?: string): EncryptedPayload {
    const keyHex = customKeyHex || this.masterKeyHex;
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) {
      throw new Error(`AES-256-GCM encryption requires a 32-byte (256-bit) key, got ${key.length} bytes.`);
    }

    // 12-byte IV for GCM mode
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(rawSecret, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return {
      encryptedValue: encrypted,
      iv: iv.toString("hex"),
      authTag
    };
  }

  /**
   * Decrypt an encrypted secret payload using AES-256-GCM and verify authenticity.
   */
  static decrypt(payload: EncryptedPayload, customKeyHex?: string): string {
    const keyHex = customKeyHex || this.masterKeyHex;
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) {
      throw new Error(`AES-256-GCM decryption requires a 32-byte (256-bit) key, got ${key.length} bytes.`);
    }

    try {
      const iv = Buffer.from(payload.iv, "hex");
      const authTag = Buffer.from(payload.authTag, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(payload.encryptedValue, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (err: any) {
      throw new Error(`Cryptographic Decryption Failure: Authentication tag mismatch or ciphertext tampering detected! (${err.message})`);
    }
  }

  /**
   * Rotate the master AES encryption key and return the new key hex.
   */
  static rotateMasterKey(): { oldKeyHex: string; newKeyHex: string } {
    const oldKeyHex = this.masterKeyHex;
    const newKeyHex = crypto.randomBytes(32).toString("hex");
    this.masterKeyHex = newKeyHex;
    return { oldKeyHex, newKeyHex };
  }

  static getMasterKeyHex(): string {
    return this.masterKeyHex;
  }

  static setMasterKeyHex(keyHex: string): void {
    this.masterKeyHex = keyHex;
  }
}
