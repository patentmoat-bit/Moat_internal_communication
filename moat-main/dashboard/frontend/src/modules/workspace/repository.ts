import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspaceDocument, WorkspaceFile, Invention, InventionMemory } from "./types";

export class WorkspaceRepository {
  private supabase = createAdminClient();

  async findDocument(id: string) {
    return await this.supabase
      .from("workspace_documents")
      .select("*")
      .eq("id", id)
      .single();
  }

  async listDocuments() {
    return await this.supabase
      .from("workspace_documents")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async createDocument(data: Partial<WorkspaceDocument>) {
    return await this.supabase
      .from("workspace_documents")
      .insert({ ...data, updated_at: new Date().toISOString() })
      .select()
      .single();
  }

  async updateDocument(id: string, data: Partial<WorkspaceDocument>) {
    return await this.supabase
      .from("workspace_documents")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
  }

  async deleteDocument(id: string) {
    return await this.supabase
      .from("workspace_documents")
      .delete()
      .eq("id", id);
  }

  // Inventions
  async findInvention(id: string) {
    return await this.supabase
      .from("inventions")
      .select("*")
      .eq("id", id)
      .single();
  }

  async listInventions() {
    return await this.supabase
      .from("inventions")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async createInvention(data: Partial<Invention>) {
    let finalUserId = data.user_id;
    if (finalUserId) {
      const { data: userExists } = await this.supabase.from("users").select("id").eq("id", finalUserId).single();
      if (!userExists) finalUserId = undefined;
    }
    if (!finalUserId) {
      const { data: fallbackUser } = await this.supabase.from("users").select("id").limit(1).single();
      if (fallbackUser) finalUserId = fallbackUser.id;
      else finalUserId = "ba7452ce-02b4-498d-9459-44ca41ed3c95"; // FORCE hardcode valid CEO user ID if empty
    }

    const { user_id, ...insertData } = data;

    return await this.supabase
      .from("inventions")
      .insert({ ...insertData, user_id: finalUserId, updated_at: new Date().toISOString() })
      .select()
      .single();
  }

  async updateInvention(id: string, data: Partial<Invention>) {
    return await this.supabase
      .from("inventions")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
  }

  async deleteInvention(id: string) {
    return await this.supabase
      .from("inventions")
      .delete()
      .eq("id", id);
  }
}
