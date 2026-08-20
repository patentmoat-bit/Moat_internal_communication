import { createAdminClient } from "@/lib/supabase/admin";
import { Trademark, TrademarkHistory, TrademarkFile } from "./types";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export class TrademarksRepository {
  private supabase = createAdminClient();
  private localDbPath = path.resolve(process.cwd(), "src/app/api/trademarks/local_db.json");

  private readLocal(): Trademark[] {
    try {
      if (!fs.existsSync(this.localDbPath)) {
        return [];
      }
      const raw = fs.readFileSync(this.localDbPath, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("[TrademarksRepository] Error reading local fallback DB:", e);
      return [];
    }
  }

  private writeLocal(data: Trademark[]) {
    try {
      fs.writeFileSync(this.localDbPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("[TrademarksRepository] Error writing local fallback DB:", e);
    }
  }

  async findAll(filters: { type?: string; status?: string; search?: string }) {
    try {
      let query = this.supabase
        .from("trademarks")
        .select("*, files:trademark_files(*)")
        .order("created_at", { ascending: false });

      if (filters.type && filters.type !== "All") {
        query = query.eq("type", filters.type.toLowerCase());
      }
      if (filters.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }
      if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data as Trademark[] };
    } catch (err: any) {
      console.warn("[TrademarksRepository] Supabase failed, using local DB fallback:", err.message);
      let local = this.readLocal();
      if (filters.type && filters.type !== "All") {
        local = local.filter(t => t.type === filters.type!.toLowerCase());
      }
      if (filters.status && filters.status !== "All") {
        local = local.filter(t => t.status === filters.status);
      }
      if (filters.search) {
        local = local.filter(t => t.name.toLowerCase().includes(filters.search!.toLowerCase()));
      }
      return { data: local };
    }
  }

  async findById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from("trademarks")
        .select("*, files:trademark_files(*), history:trademark_history(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return { data: data as Trademark };
    } catch (err: any) {
      console.warn("[TrademarksRepository] findById Supabase failed, using local DB fallback:", err.message);
      const local = this.readLocal();
      const found = local.find(t => t.id === id);
      return { data: found || null };
    }
  }

  async create(payload: Partial<Trademark>) {
    try {
      const { data, error } = await this.supabase
        .from("trademarks")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return { data: data as Trademark };
    } catch (err: any) {
      console.warn("[TrademarksRepository] create Supabase failed, using local DB:", err.message);
      const local = this.readLocal();
      const newRecord: Trademark = {
        id: uuidv4(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        type: payload.type!,
        name: payload.name!,
        application_number: payload.application_number,
        status: payload.status || "Pending",
        class: payload.class,
        goods_services: payload.goods_services,
        country: payload.country,
        image_url: payload.image_url,
        metadata: payload.metadata || {},
        files: []
      };
      local.unshift(newRecord);
      this.writeLocal(local);
      return { data: newRecord };
    }
  }

  async update(id: string, payload: Partial<Trademark>) {
    try {
      const { data, error } = await this.supabase
        .from("trademarks")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { data: data as Trademark };
    } catch (err: any) {
      console.warn("[TrademarksRepository] update Supabase failed, using local DB:", err.message);
      const local = this.readLocal();
      const idx = local.findIndex(t => t.id === id);
      if (idx !== -1) {
        local[idx] = {
          ...local[idx],
          ...payload,
          updated_at: new Date().toISOString()
        };
        this.writeLocal(local);
        return { data: local[idx] };
      }
      throw new Error("Not found");
    }
  }

  async delete(id: string) {
    try {
      const { error } = await this.supabase.from("trademarks").delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn("[TrademarksRepository] delete Supabase failed, using local DB:", err.message);
      const local = this.readLocal();
      const filtered = local.filter(t => t.id !== id);
      this.writeLocal(filtered);
      return { success: true };
    }
  }

  async addFile(filePayload: Partial<TrademarkFile>) {
    try {
      const { data, error } = await this.supabase
        .from("trademark_files")
        .insert(filePayload)
        .select()
        .single();
      if (error) throw error;
      return { data: data as TrademarkFile };
    } catch (err: any) {
      console.warn("[TrademarksRepository] addFile Supabase failed, local fallback:", err.message);
      const local = this.readLocal();
      const tIdx = local.findIndex(t => t.id === filePayload.trademark_id);
      const newFile: TrademarkFile = {
        id: uuidv4(),
        trademark_id: filePayload.trademark_id!,
        name: filePayload.name!,
        url: filePayload.url!,
        size: filePayload.size,
        type: filePayload.type,
        created_at: new Date().toISOString()
      };
      if (tIdx !== -1) {
        if (!local[tIdx].files) local[tIdx].files = [];
        local[tIdx].files!.push(newFile);
        this.writeLocal(local);
      }
      return { data: newFile };
    }
  }

  async deleteFile(fileId: string) {
    try {
      const { error } = await this.supabase.from("trademark_files").delete().eq("id", fileId);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn("[TrademarksRepository] deleteFile Supabase failed, local fallback:", err.message);
      const local = this.readLocal();
      for (const t of local) {
        if (t.files) {
          const originalLength = t.files.length;
          t.files = t.files.filter(f => f.id !== fileId);
          if (t.files.length !== originalLength) {
            this.writeLocal(local);
            break;
          }
        }
      }
      return { success: true };
    }
  }

  async logHistory(trademarkId: string, action: string, performedBy: string) {
    try {
      await this.supabase.from("trademark_history").insert({
        trademark_id: trademarkId,
        action,
        performed_by: performedBy
      });
    } catch (err) {
      console.warn("[TrademarksRepository] Failed to write history:", err);
    }
  }
}
