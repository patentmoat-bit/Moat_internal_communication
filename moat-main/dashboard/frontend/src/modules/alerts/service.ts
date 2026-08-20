import { AlertsRepository } from "./repository";
import { Alert } from "./types";

export class AlertsService {
  private repo = new AlertsRepository();

  async getUserAlerts(userId: string): Promise<Alert[]> {
    const { data, error } = await this.repo.findByUserId(userId);
    if (error) {
      console.warn("Could not retrieve alerts, returning empty list.", error.message);
      return [];
    }
    return data || [];
  }

  async getAlert(id: string): Promise<Alert> {
    const { data, error } = await this.repo.findById(id);
    if (error || !data) throw new Error("Alert not found");
    return data;
  }

  async createAlert(payload: Partial<Alert>): Promise<Alert> {
    const { data, error } = await this.repo.create(payload);
    if (error) throw new Error(`Failed to create alert: ${error.message}`);
    return data;
  }

  async updateAlert(id: string, payload: Partial<Alert>): Promise<Alert> {
    const { data, error } = await this.repo.update(id, payload);
    if (error) throw new Error(`Failed to update alert: ${error.message}`);
    return data;
  }

  async removeAlert(id: string): Promise<void> {
    const { error } = await this.repo.delete(id);
    if (error) throw new Error(`Failed to delete alert: ${error.message}`);
  }
}
