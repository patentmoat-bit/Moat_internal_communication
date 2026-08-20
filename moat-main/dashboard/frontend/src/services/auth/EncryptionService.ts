import crypto from "crypto";

const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef"; // 32 chars for AES-256
const IV_LENGTH = 16;

export class EncryptionService {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${encrypted}:${authTag}`;
  }

  static decrypt(text: string): string | null {
    try {
      const [ivHex, encryptedHex, authTagHex] = text.split(":");
      if (!ivHex || !encryptedHex || !authTagHex) return null;
      const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY), Buffer.from(ivHex, "hex"));
      decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      console.error("Decryption failed:", err);
      return null;
    }
  }
}
