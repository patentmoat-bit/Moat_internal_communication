import { createAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Local fallback DB
const LOCAL_DB_PATH = path.join(process.cwd(), "src/app/api/documents/local_db.json");

interface LocalDB {
  documents: any[];
  versions: any[];
  history: any[];
  comments: any[];
}

function getLocalDB(): LocalDB {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDb = { documents: [], versions: [], history: [], comments: [] };
    fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2));
    return defaultDb;
  }
  return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
}

function saveLocalDB(db: LocalDB) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2));
}

export class DocumentsRepository {
  private supabase = createAdminClient();

  async createDocument(payload: any, userId: string) {
    const docData = { ...payload, created_by: userId, id: uuidv4() };
    try {
      const { data, error } = await this.supabase.from("patent_documents").insert(docData).select().single();
      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error("[DocumentsRepository] Supabase INSERT failed:", err.message);
      // We will still fallback for development ease
      const db = getLocalDB();
      const newDoc = { ...docData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.documents.unshift(newDoc);
      saveLocalDB(db);
      return { data: newDoc };
    }
  }

  async getAllDocuments(userId: string, role: string) {
    try {
      let query = this.supabase
        .from("patent_documents")
        .select(`*, document_versions(*), workflow_status_history(*), review_comments(*)`)
        .order("updated_at", { ascending: false });

      const { PermissionService } = require("@/lib/security/authorization/PermissionService");
      const normalizedRole = PermissionService.normalizeRole(role);

      if (normalizedRole !== "CEO" && normalizedRole !== "Admin" && normalizedRole !== "super_admin" && normalizedRole !== "Design Team") {
        const { ProjectAccessService } = require("@/lib/security/authorization/ProjectAccessService");
        const authorizedProjects = ProjectAccessService.getAuthorizedProjects(userId, role);
        const projectIds = authorizedProjects.map((p: any) => p.id);
        
        if (projectIds.length > 0) {
          query = query.or(`created_by.eq.${userId},project_id.in.(${projectIds.join(',')})`);
        } else {
          query = query.eq("created_by", userId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // If remote DB is empty, try to merge with local DB to prevent missing data if local was used
      if (!data || data.length === 0) {
        const db = getLocalDB();
        if (db.documents.length > 0) {
          let localData = db.documents;
          if (role !== "CEO" && role !== "Admin" && role !== "super_admin") {
            const { ProjectAccessService } = require("@/lib/security/authorization/ProjectAccessService");
            const authorizedProjects = ProjectAccessService.getAuthorizedProjects(userId, role);
            const projectIds = authorizedProjects.map((p: any) => p.id);
            localData = localData.filter(d => d.created_by === userId || projectIds.includes(d.project_id));
          }
          return { data: localData };
        }
      }
      return { data };
    } catch (err: any) {
      console.error("[DocumentsRepository] Supabase SELECT failed:", err.message);
      const db = getLocalDB();
      const { PermissionService } = require("@/lib/security/authorization/PermissionService");
      const normalizedRole = PermissionService.normalizeRole(role);
      
      let localData = db.documents;
      if (normalizedRole !== "CEO" && normalizedRole !== "Admin" && normalizedRole !== "super_admin" && normalizedRole !== "Design Team") {
        const { ProjectAccessService } = require("@/lib/security/authorization/ProjectAccessService");
        const authorizedProjects = ProjectAccessService.getAuthorizedProjects(userId, role);
        const projectIds = authorizedProjects.map((p: any) => p.id);
        localData = localData.filter(d => d.created_by === userId || projectIds.includes(d.project_id));
      }
      return { data: localData };
    }
  }

  async getDocumentById(id: string, userId: string, role: string) {
    try {
      let query = this.supabase
        .from("patent_documents")
        .select(`
          *,
          document_versions(*),
          workflow_status_history(*),
          review_comments(*)
        `)
        .eq("id", id);

      const { PermissionService } = require("@/lib/security/authorization/PermissionService");
      const normalizedRole = PermissionService.normalizeRole(role);

      if (normalizedRole !== "CEO" && normalizedRole !== "Admin" && normalizedRole !== "super_admin" && normalizedRole !== "Design Team") {
        const { ProjectAccessService } = require("@/lib/security/authorization/ProjectAccessService");
        const authorizedProjects = ProjectAccessService.getAuthorizedProjects(userId, role);
        const projectIds = authorizedProjects.map((p: any) => p.id);
        
        if (projectIds.length > 0) {
          query = query.or(`created_by.eq.${userId},project_id.in.(${projectIds.join(',')})`);
        } else {
          query = query.eq("created_by", userId);
        }
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.warn("[DocumentsRepository] Supabase failed, using local DB:", err.message);
      const db = getLocalDB();
      const doc = db.documents.find(d => d.id === id);
      if (!doc) throw new Error("Document not found");

      const { PermissionService } = require("@/lib/security/authorization/PermissionService");
      const normalizedRole = PermissionService.normalizeRole(role);

      if (normalizedRole !== "CEO" && normalizedRole !== "Admin" && normalizedRole !== "super_admin" && normalizedRole !== "Design Team") {
        const { ProjectAccessService } = require("@/lib/security/authorization/ProjectAccessService");
        const authorizedProjects = ProjectAccessService.getAuthorizedProjects(userId, role);
        const projectIds = authorizedProjects.map((p: any) => p.id);
        if (doc.created_by !== userId && !projectIds.includes(doc.project_id)) {
           throw new Error("Unauthorized");
        }
      }

      doc.document_versions = db.versions.filter(v => v.document_id === id);
      doc.workflow_status_history = db.history.filter(h => h.document_id === id);
      doc.review_comments = db.comments.filter(c => c.document_id === id);
      return { data: doc };
    }
  }

  async addVersion(documentId: string, payload: any, userId: string) {
    let version_number = payload.version_number;
    if (!version_number) {
      try {
        const { count } = await this.supabase
          .from("document_versions")
          .select("*", { count: 'exact', head: true })
          .eq("document_id", documentId);
        version_number = `1.${(count || 0) + 1}`;
      } catch (e) {
        version_number = `1.1`;
      }
    }

    const versionData = { ...payload, version_number, document_id: documentId, uploaded_by: userId, id: uuidv4() };
    try {
      const { data, error } = await this.supabase.from("document_versions").insert(versionData).select().single();
      if (error) throw error;
      await this.supabase.from("patent_documents").update({ current_version_id: data.id }).eq("id", documentId);
      return { data };
    } catch (err: any) {
      console.warn("[DocumentsRepository] Supabase failed, using local DB:", err.message);
      const db = getLocalDB();
      const newVersion = { ...versionData, created_at: new Date().toISOString() };
      db.versions.unshift(newVersion);
      const doc = db.documents.find(d => d.id === documentId);
      if (doc) doc.current_version_id = newVersion.id;
      saveLocalDB(db);
      return { data: newVersion };
    }
  }

  async logStatusTransition(documentId: string, previousStatus: string, newStatus: string, userId: string, notes?: string) {
    const historyData = { document_id: documentId, previous_status: previousStatus, new_status: newStatus, changed_by: userId, notes, id: uuidv4() };
    try {
      await this.supabase.from("workflow_status_history").insert(historyData);
      await this.supabase.from("patent_documents").update({ status: newStatus }).eq("id", documentId);
      
      // Auto-trigger notifications
      if (newStatus === "Waiting for Patent Analyst Review") {
        const { WorkflowEmailService } = require("@/lib/workflow/WorkflowEmailService");
        WorkflowEmailService.sendEmail(
          "Patent Analyst", 
          `[MOAT Review Required] New Design File Uploaded`, 
          `The design team has uploaded a new revision for document ${documentId}. Please review it in the Analyst Workspace.`
        );
      } else if (newStatus === "Waiting for Drafter Review") {
        const { WorkflowEmailService } = require("@/lib/workflow/WorkflowEmailService");
        WorkflowEmailService.sendEmail(
          "Patent Drafter", 
          `[MOAT Review Required] New Design File Uploaded`, 
          `The design team has uploaded a new revision for document ${documentId}. Please review it in the Drafter Workspace.`
        );
      }

      if (newStatus === "Pending Design Review" || newStatus === "Changes Requested") {
        await this.supabase.from("design_notifications").insert({
          user_id: userId, // Assuming triggered by analyst, but alerts designer
          title: "Design Action Required",
          message: `Document status changed to ${newStatus}`,
          type: "action_required"
        });
      }
      
      if (["CEO Approved", "CEO Rejected", "Revision Requested by CEO"].includes(newStatus)) {
        await this.supabase.from("activity_logs").insert({
          id: uuidv4(),
          user_id: userId, // The person who acted (CEO)
          entity_type: "notification", // So it shows up in notifications
          entity_id: documentId,
          action: "unread",
          message: `Document ${documentId} status updated to ${newStatus}`,
          metadata: {
            title: `CEO Decision: ${newStatus}`,
            type: "status_update",
          }
        });
      }
    } catch (err: any) {
      console.warn("[DocumentsRepository] Supabase failed, using local DB:", err.message);
      const db = getLocalDB();
      db.history.unshift({ ...historyData, created_at: new Date().toISOString() });
      const doc = db.documents.find(d => d.id === documentId);
      if (doc) doc.status = newStatus;
      saveLocalDB(db);
    }
  }

  async addComment(documentId: string, payload: any, userId: string, role: string) {
    const commentData = { ...payload, document_id: documentId, user_id: userId, role, id: uuidv4() };
    try {
      const { data, error } = await this.supabase.from("review_comments").insert(commentData).select().single();
      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.warn("[DocumentsRepository] Supabase failed, using local DB:", err.message);
      const db = getLocalDB();
      const newComment = { ...commentData, created_at: new Date().toISOString() };
      db.comments.unshift(newComment);
      saveLocalDB(db);
      return { data: newComment };
    }
  }
}
