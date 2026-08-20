import { createAdminClient } from "@/lib/supabase/admin";
import { PatentProject, PatentStatus, PatentPortfolio, PatentDocument, PatentVersion } from "./types";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export class PatentsRepository {
  private supabase = createAdminClient();
  private localDbPath = path.resolve(process.cwd(), "src/app/api/patents/projects/local_db.json");
  private localDocsDbPath = path.resolve(process.cwd(), "src/app/api/patents/projects/local_docs_db.json");

  private readLocalDocuments(): PatentDocument[] {
    try {
      const dir = path.dirname(this.localDocsDbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(this.localDocsDbPath)) {
        fs.writeFileSync(this.localDocsDbPath, JSON.stringify([], null, 2), "utf8");
        return [];
      }
      return JSON.parse(fs.readFileSync(this.localDocsDbPath, "utf8"));
    } catch (e) {
      console.error("[PatentsRepository] Error reading local docs DB:", e);
      return [];
    }
  }

  private writeLocalDocuments(data: PatentDocument[]) {
    try {
      const dir = path.dirname(this.localDocsDbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.localDocsDbPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("[PatentsRepository] Error writing local docs DB:", e);
    }
  }

  private readLocal(): PatentProject[] {
    try {
      const dir = path.dirname(this.localDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.localDbPath)) {
        const seed: PatentProject[] = [
          {
            id: "1",
            title: "Distributed Neural Model Compression System",
            description: "A system for compressing large language model weights dynamically based on client hardware constraints prior to transmission.",
            status: "granted",
            filing_region: "US",
            created_by: null,
            created_at: "2026-01-10T12:00:00.000Z",
            updated_at: "2026-01-10T12:00:00.000Z"
          },
          {
            id: "2",
            title: "Decentralized Zero-Knowledge Data Verification Vault",
            description: "Multi-party computation engine utilizing zero-knowledge proofs to authenticate document signatures without exposing payload content.",
            status: "filed",
            filing_region: "PCT",
            created_by: null,
            created_at: "2026-02-15T15:30:00.000Z",
            updated_at: "2026-02-15T15:30:00.000Z"
          },
          {
            id: "3",
            title: "Adaptive Real-Time Spatial Translation Engine",
            description: "A wearable device and processing engine designed to translate visual scenes into natural language audio cues for visually impaired users.",
            status: "published",
            filing_region: "IND",
            created_by: null,
            created_at: "2026-03-22T09:15:00.000Z",
            updated_at: "2026-03-22T09:15:00.000Z"
          },
          {
            id: "4",
            title: "Automated Claim-Drafting Generative Model",
            description: "AI-assisted drafting system compiling patent claims based on a structured description of invention specifications and technical claims.",
            status: "published",
            filing_region: "US",
            created_by: null,
            created_at: "2026-04-05T10:00:00.000Z",
            updated_at: "2026-04-05T10:00:00.000Z"
          }
        ];
        fs.writeFileSync(this.localDbPath, JSON.stringify(seed, null, 2), "utf8");
        return seed;
      }
      const raw = fs.readFileSync(this.localDbPath, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("[PatentsRepository] Error reading local fallback DB:", e);
      return [];
    }
  }

  private writeLocal(data: PatentProject[]) {
    try {
      const dir = path.dirname(this.localDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.localDbPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("[PatentsRepository] Error writing local fallback DB:", e);
    }
  }

  async findProjectById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from("patent_projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return { data: data as PatentProject };
    } catch (err: any) {
      console.warn("[PatentsRepository] findProjectById Supabase failed, using local DB fallback:", err.message);
      const local = this.readLocal();
      const found = local.find(p => p.id === id);
      return { data: found || null };
    }
  }

  async createProject(data: Partial<PatentProject>) {
    try {
      const { filing_region, ...dbData } = data;
      const { data: res, error } = await this.supabase
        .from("patent_projects")
        .insert({ ...dbData, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return { data: res as PatentProject };
    } catch (err: any) {
      console.warn("[PatentsRepository] createProject Supabase failed, using local DB:", err.message);
      const local = this.readLocal();
      const newRecord: PatentProject = {
        id: uuidv4(),
        title: data.title!,
        description: data.description || null,
        status: data.status || "filed",
        filing_region: data.filing_region || "US",
        created_by: data.created_by || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      local.unshift(newRecord);
      this.writeLocal(local);
      return { data: newRecord };
    }
  }

  async listProjects() {
    try {
      const { data, error } = await this.supabase
        .from("patent_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { data: data as PatentProject[] };
    } catch (err: any) {
      console.warn("[PatentsRepository] listProjects Supabase failed, using local DB fallback:", err.message);
      return { data: this.readLocal() };
    }
  }

  async updateProject(id: string, payload: Partial<PatentProject>) {
    try {
      const { filing_region, ...dbData } = payload;
      const { data, error } = await this.supabase
        .from("patent_projects")
        .update({ ...dbData, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { data: data as PatentProject };
    } catch (err: any) {
      console.warn("[PatentsRepository] updateProject Supabase failed, using local DB:", err.message);
      const local = this.readLocal();
      const idx = local.findIndex(p => p.id === id);
      if (idx !== -1) {
        local[idx] = {
          ...local[idx],
          ...payload,
          updated_at: new Date().toISOString()
        };
        this.writeLocal(local);
        return { data: local[idx] };
      }
      throw new Error("Patent project not found in fallback DB");
    }
  }

  async deleteProject(id: string) {
    try {
      const { error } = await this.supabase
        .from("patent_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.warn("[PatentsRepository] deleteProject Supabase failed, using local DB:", err.message);
      const local = this.readLocal();
      const filtered = local.filter(p => p.id !== id);
      this.writeLocal(filtered);
      return { success: true, error: null };
    }
  }

  async findFirstAnalyst() {
    try {
      const { data, error } = await this.supabase
        .from("users")
        .select("id")
        .eq("role", "Patent Analyst")
        .limit(1);
      if (error) throw error;
      return { data };
    } catch (e) {
      return { data: null };
    }
  }

  async notifyAnalyst(projectTitle: string, status: string, targetUserId: string) {
    try {
      // 1. Insert into notifications table
      await this.supabase.from("notifications").insert({
        title: "Patent Project Filing Update",
        description: `Patent Project "${projectTitle}" status has been set to ${status.toUpperCase()} by CEO.`,
        type: "Filing Status Update",
        priority: "high",
        receiver: targetUserId,
        is_read: false
      });

      // 2. Insert into activity_logs table for search dashboard activity feed
      await this.supabase.from("activity_logs").insert({
        user_id: targetUserId,
        entity_type: "notification",
        action: "unread",
        message: `CEO set status of Patent Project "${projectTitle}" to ${status.toUpperCase()}`,
        metadata: {
          title: projectTitle,
          type: "patent_project",
          link: "/ceo/patent-filing"
        }
      });
    } catch (err) {
      console.warn("[PatentsRepository] Failed to write notification:", err);
    }
  }

  async addStatus(statusData: Partial<PatentStatus>) {
    return await this.supabase
      .from("patent_status")
      .insert(statusData)
      .select()
      .single();
  }

  async getStatusHistory(projectId: string) {
    return await this.supabase
      .from("patent_status")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
  }

  async createPortfolioPatent(data: Partial<PatentPortfolio>) {
    return await this.supabase
      .from("patent_portfolio")
      .insert({ ...data, updated_at: new Date().toISOString() })
      .select()
      .single();
  }

  async listPortfolioPatents() {
    return await this.supabase
      .from("patent_portfolio")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async addDocument(doc: Partial<PatentDocument>) {
    try {
      const { data, error } = await this.supabase
        .from("patent_documents")
        .insert(doc)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.warn("[PatentsRepository] addDocument failed, using local fallback:", err.message);
      const localDocs = this.readLocalDocuments();
      const newDoc = {
        id: Date.now().toString(),
        ...doc,
        created_at: new Date().toISOString()
      } as PatentDocument;
      localDocs.unshift(newDoc);
      this.writeLocalDocuments(localDocs);
      return { data: newDoc, error: null };
    }
  }

  async listDocuments(projectId: string) {
    try {
      const { data, error } = await this.supabase
        .from("patent_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.warn("[PatentsRepository] listDocuments failed, using local fallback:", err.message);
      const localDocs = this.readLocalDocuments();
      const projectDocs = localDocs.filter(d => d.project_id === projectId);
      return { data: projectDocs, error: null };
    }
  }
}
