import crypto from "crypto";

const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.MFA_ENCRYPTION_KEY;
  if (!secret || secret.length === 0) {
    throw new Error("Missing required environment variable: MFA_ENCRYPTION_KEY");
  }
  // Derive a 32-byte AES-256 key regardless of the raw secret's length.
  return crypto.createHash("sha256").update(secret).digest();
}

export class EncryptionService {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${encrypted}:${authTag}`;
  }

  static decrypt(text: string): string | null {
    try {
      const [ivHex, encryptedHex, authTagHex] = text.split(":");
      if (!ivHex || !encryptedHex || !authTagHex) return null;
      const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivHex, "hex"));
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
