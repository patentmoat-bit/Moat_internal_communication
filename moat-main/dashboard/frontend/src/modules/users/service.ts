import { UsersRepository } from "./repository";
import { UserProfile, UserRole } from "./types";

export class UsersService {
  private repo = new UsersRepository();

  async getUser(id: string): Promise<UserProfile> {
    const { data, error } = await this.repo.getProfile(id);
    if (error) throw new Error(`User profile not found: ${error.message}`);
    return data as UserProfile;
  }

  async updateProfile(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const { data: updated, error } = await this.repo.updateProfile(id, data);
    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return updated as UserProfile;
  }

  async listUsers(): Promise<UserProfile[]> {
    const { data, error } = await this.repo.getAllProfiles();
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    return (data || []) as UserProfile[];
  }

  async listRoles(): Promise<UserRole[]> {
    const { data, error } = await this.repo.getRoles();
    if (error) {
      // Return default roles as fallback if roles table is not queried yet or fails
      console.warn("Could not retrieve roles from database, returning defaults.", error.message);
      return [
        { id: "1", name: "CEO", description: "Chief Executive Officer", created_at: new Date().toISOString() },
        { id: "2", name: "CTO", description: "Chief Technology Officer", created_at: new Date().toISOString() },
        { id: "3", name: "CIO", description: "Chief Information Officer", created_at: new Date().toISOString() },
        { id: "4", name: "Analyst", description: "Patent/Trademark Analyst", created_at: new Date().toISOString() },
        { id: "5", name: "Admin", description: "System Administrator", created_at: new Date().toISOString() }
      ];
    }
    return data || [];
  }
}
