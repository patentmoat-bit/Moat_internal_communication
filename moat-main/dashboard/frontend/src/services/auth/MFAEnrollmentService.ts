import { UserService } from "./UserService";
import { EncryptionService } from "./EncryptionService";
const twofactor = require("node-2fa");

export class MFAEnrollmentService {
  constructor(private userService: UserService) {}

  /**
   * Generates a unique base32 secret for a user and stores it encrypted.
   */
  async initializeEnrollment(userId: string, email: string): Promise<{ secret: string; uri: string }> {
    // Generate a unique secret
    const newSecret = twofactor.generateSecret({ name: "MOAT", account: email });
    const plaintextSecret = newSecret.secret;
    const uri = newSecret.uri;

    // Encrypt and persist the secret, but do NOT set mfa_enabled to true yet
    const encryptedSecret = EncryptionService.encrypt(plaintextSecret);
    await this.userService.enrollUser(userId, encryptedSecret); // This should just save the secret

    return { secret: plaintextSecret, uri };
  }

  async confirmEnrollment(userId: string): Promise<void> {
    // Mark as fully enrolled
    await this.userService.confirmMfaEnrollment(userId);
  }
}

