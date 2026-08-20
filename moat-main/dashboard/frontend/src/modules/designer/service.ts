import { DesignerRepository } from "./repository";

export class DesignerService {
  private repo = new DesignerRepository();

  async getTasks() {
    const { data } = await this.repo.getTasks();
    return data;
  }

  async createTask(payload: any, userId: string) {
    const { data } = await this.repo.createTask(payload, userId);
    return data;
  }

  async updateTaskStatus(taskId: string, newStatus: string) {
    const { data } = await this.repo.updateTaskStatus(taskId, newStatus);
    return data;
  }

  async addAsset(taskId: string, payload: any, userId: string) {
    const { data } = await this.repo.addAsset(taskId, payload, userId);
    return data;
  }
}
