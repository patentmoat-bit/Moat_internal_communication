import { PortfolioRepository } from "./repository";
import { PortfolioPatent } from "./types";

export class PortfolioService {
  private repo = new PortfolioRepository();

  async getPatents(): Promise<PortfolioPatent[]> {
    const { data, error } = await this.repo.listAll();
    if (error) {
      console.warn("Could not retrieve portfolio patents, returning empty list.", error.message);
      return [];
    }
    return data || [];
  }

  async getPatent(id: string): Promise<PortfolioPatent> {
    const { data, error } = await this.repo.findById(id);
    if (error || !data) throw new Error("Patent not found");
    return data;
  }

  async addPatent(payload: Partial<PortfolioPatent>): Promise<PortfolioPatent> {
    const { data, error } = await this.repo.create(payload);
    if (error) throw new Error(`Failed to add patent: ${error.message}`);
    return data;
  }

  async updatePatent(id: string, payload: Partial<PortfolioPatent>): Promise<PortfolioPatent> {
    const { data, error } = await this.repo.update(id, payload);
    if (error) throw new Error(`Failed to update patent: ${error.message}`);
    return data;
  }

  async removePatent(id: string): Promise<void> {
    const { error } = await this.repo.delete(id);
    if (error) throw new Error(`Failed to delete patent: ${error.message}`);
  }
}
