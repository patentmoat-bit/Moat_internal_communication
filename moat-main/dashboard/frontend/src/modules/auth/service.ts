import { AuthRepository } from "./repository";
import { UserProfile } from "./types";

export class AuthService {
  private repo = new AuthRepository();

  async getUserProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await this.repo.getProfile(userId);
    if (error) {
      console.error(`[AuthService.getUserProfile] Error: ${error.message}`);
      throw new Error(`Profile not found: ${error.message}`);
    }
    if (!data) {
      throw new Error("User profile does not exist.");
    }
    return data;
  }

  async syncUserProfile(userId: string, email: string, details: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.repo.createProfile(userId, email, details);
    if (error) {
      console.error(`[AuthService.syncUserProfile] Error: ${error.message}`);
      throw new Error(`Failed to sync profile: ${error.message}`);
    }
    if (!data) {
      throw new Error("Failed to create profile.");
    }
    return data;
  }

  async recordLogin(userId: string): Promise<void> {
    await this.repo.updateLastLogin(userId);
  }
}
