const twofactor = require("node-2fa");

export class TOTPVerificationService {
  /**
   * Validates a TOTP code against a secret using RFC6238 standard.
   * @param secret Plaintext base32 TOTP secret
   * @param code The 6 digit code from the user
   * @param window Allowed drift window (1 = ±30 seconds)
   */
  static verify(secret: string, code: string, window: number = 1): boolean {
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return false; // Reject random strings, invalid length
    }
    
    // node-2fa returns an object if valid, null if invalid
    const result = twofactor.verifyToken(secret, code, window);
    return result != null;
  }
}
