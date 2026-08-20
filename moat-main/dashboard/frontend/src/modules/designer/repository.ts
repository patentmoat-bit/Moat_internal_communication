import { createAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const LOCAL_DB_PATH = path.join(process.cwd(), "src/app/api/designer/local_db.json");

interface LocalDB {
  tasks: any[];
  assets: any[];
}

function getLocalDB(): LocalDB {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDb = { tasks: [], assets: [] };
    fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2));
    return defaultDb;
  }
  return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
}

function saveLocalDB(db: LocalDB) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2));
}

export class DesignerRepository {
  private supabase = createAdminClient();

  async getTasks() {
    try {
      const { data, error } = await this.supabase
        .from("design_tasks")
        .select(`*, design_assets(*)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.warn("[DesignerRepository] Supabase failed, using local DB:", err.message);
      const db = getLocalDB();
      return { data: db.tasks };
    }
  }

  async createTask(payload: any, userId: string) {
    const taskData = { ...payload, assigned_by: userId, id: uuidv4() };
    try {
      const { data, error } = await this.supabase.from("design_tasks").insert(taskData).select().single();
      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.warn("[DesignerRepository] Supabase failed, using local DB:", err.message);
      const db = getLocalDB();
      const newTask = { ...taskData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.tasks.unshift(newTask);
      saveLocalDB(db);
      return { data: newTask };
    }
  }

  async updateTaskStatus(taskId: string, newStatus: string) {
    try {
      const { data, error } = await this.supabase.from("design_tasks").update({ status: newStatus }).eq("id", taskId).select().single();
      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.warn("[DesignerRepository] Supabase failed, using local DB:", err.message);
      const db = getLocalDB();
      const task = db.tasks.find(t => t.id === taskId);
      if (!task) throw new Error("Task not found");
      task.status = newStatus;
      task.updated_at = new Date().toISOString();
      saveLocalDB(db);
      return { data: task };
    }
  }

  async addAsset(taskId: string, payload: any, userId: string) {
    const assetData = { ...payload, task_id: taskId, uploaded_by: userId, id: uuidv4() };
    try {
      const { data, error } = await this.supabase.from("design_assets").insert(assetData).select().single();
      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.warn("[DesignerRepository] Supabase failed, using local DB:", err.message);
      const db = getLocalDB();
      const newAsset = { ...assetData, created_at: new Date().toISOString() };
      db.assets.unshift(newAsset);
      saveLocalDB(db);
      return { data: newAsset };
    }
  }
}
