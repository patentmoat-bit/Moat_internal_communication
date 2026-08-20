import { WorkspaceRepository } from "./repository";
import { WorkspaceDocument, Invention } from "./types";

export class WorkspaceService {
  private repo = new WorkspaceRepository();

  async getDocuments(): Promise<WorkspaceDocument[]> {
    const { data, error } = await this.repo.listDocuments();
    if (error) {
      console.warn("Could not retrieve workspace documents, returning empty list.", error.message);
      return [];
    }
    return data || [];
  }

  async createDocument(payload: Partial<WorkspaceDocument>): Promise<WorkspaceDocument> {
    const { data, error } = await this.repo.createDocument(payload);
    if (error) throw new Error(`Failed to create document: ${error.message}`);
    return data;
  }

  async getInventions(): Promise<Invention[]> {
    const { data, error } = await this.repo.listInventions();
    if (error) {
      console.warn("Could not retrieve inventions, returning empty list.", error.message);
      return [];
    }
    return data || [];
  }

  async getInvention(id: string): Promise<Invention> {
    const { data, error } = await this.repo.findInvention(id);
    if (error || !data) throw new Error("Invention not found");
    return data;
  }

  async createInvention(payload: Partial<Invention>): Promise<Invention> {
    const { data, error } = await this.repo.createInvention(payload);
    if (error) throw new Error(`Failed to create invention: ${error.message}`);
    return data;
  }

  async updateInvention(id: string, payload: Partial<Invention>): Promise<Invention> {
    const { data, error } = await this.repo.updateInvention(id, payload);
    if (error) throw new Error(`Failed to update invention: ${error.message}`);
    return data;
  }

  async deleteInvention(id: string): Promise<void> {
    const { error } = await this.repo.deleteInvention(id);
    if (error) throw new Error(`Failed to delete invention: ${error.message}`);
  }
}
