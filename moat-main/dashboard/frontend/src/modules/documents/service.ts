import { DocumentsRepository } from "./repository";

export class DocumentsService {
  private repo = new DocumentsRepository();

  async createDocument(payload: any, userId: string) {
    const { data } = await this.repo.createDocument(payload, userId);
    if (!data) throw new Error("Failed to create document");
    await this.repo.logStatusTransition(data.id, "None", data.status || "Draft Created", userId, "Document project created");
    return data;
  }

  async getAllDocuments(userId: string, role: string) {
    const { data } = await this.repo.getAllDocuments(userId, role);
    return data;
  }

  async getDocumentById(id: string, userId: string, role: string) {
    const { data } = await this.repo.getDocumentById(id, userId, role);
    return data;
  }

  async addVersion(documentId: string, payload: any, userId: string) {
    const { data } = await this.repo.addVersion(documentId, payload, userId);
    if (!data) throw new Error("Failed to add version");
    return data;
  }

  async transitionStatus(documentId: string, previousStatus: string, newStatus: string, userId: string, notes?: string) {
    await this.repo.logStatusTransition(documentId, previousStatus, newStatus, userId, notes);
    return { success: true, newStatus };
  }

  async addComment(documentId: string, payload: any, userId: string, role: string) {
    const { data } = await this.repo.addComment(documentId, payload, userId, role);
    return data;
  }
}
