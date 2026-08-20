import { PatentsRepository } from "./repository";
import { PatentProject, PatentStatus, PatentPortfolio, PatentDocument } from "./types";

export class PatentsService {
  private repo = new PatentsRepository();

  async createProject(payload: Partial<PatentProject>): Promise<PatentProject> {
    const { data: project } = await this.repo.createProject(payload);
    if (!project) throw new Error("Failed to create patent project");

    // Insert initial status history
    await this.repo.addStatus({
      project_id: project.id,
      status: project.status || "pending",
      notes: "Patent project filing initialized."
    });

    return project;
  }

  async updateProject(id: string, payload: Partial<PatentProject>, actorId?: string): Promise<PatentProject> {
    // Fetch original project to detect status transitions
    const { data: original } = await this.repo.findProjectById(id);
    const { data: updated } = await this.repo.updateProject(id, payload);
    if (!updated) throw new Error("Failed to update patent project");

    // Log status transitions and trigger analyst notifications
    if (payload.status && payload.status !== original?.status) {
      await this.repo.addStatus({
        project_id: id,
        status: payload.status,
        notes: `Filing status updated to ${payload.status} by CEO.`
      });

      // Dispatch notifications to the Patent Analyst
      try {
        const { data: analysts } = await this.repo.findFirstAnalyst();
        const targetUser = analysts?.[0]?.id || actorId;
        if (targetUser) {
          await this.repo.notifyAnalyst(updated.title, payload.status, targetUser);
        }
      } catch (notifyErr) {
        console.warn("Failed to dispatch notifications to Patent Analyst:", notifyErr);
      }
    }

    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await this.repo.deleteProject(id);
    if (error) throw new Error(`Failed to delete patent project: ${error}`);
  }

  async updateStatus(projectId: string, status: string, notes?: string): Promise<PatentStatus> {
    const { data: project } = await this.repo.findProjectById(projectId);
    if (!project) throw new Error("Project not found");

    const { data: statusRow } = await this.repo.addStatus({
      project_id: projectId,
      status,
      notes: notes || `Status updated to ${status}.`
    });

    if (!statusRow) throw new Error("Failed to log status");
    return statusRow;
  }

  async listProjects(): Promise<PatentProject[]> {
    const { data } = await this.repo.listProjects();
    return data || [];
  }

  async getPortfolio(): Promise<PatentPortfolio[]> {
    const { data } = await this.repo.listPortfolioPatents();
    return data || [];
  }

  async uploadDocument(projectId: string, name: string, url: string, fileType?: string, size?: number): Promise<PatentDocument> {
    const { data } = await this.repo.addDocument({
      project_id: projectId,
      name,
      url,
      file_type: fileType || null,
      size: size || null
    });

    if (!data) throw new Error("Failed to add document record");
    return data;
  }

  async listDocuments(projectId: string): Promise<PatentDocument[]> {
    const { data } = await this.repo.listDocuments(projectId);
    return data || [];
  }
}

