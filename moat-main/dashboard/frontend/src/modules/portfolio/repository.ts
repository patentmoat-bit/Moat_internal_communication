import { createAdminClient } from "@/lib/supabase/admin";
import { PortfolioPatent } from "./types";

export class PortfolioRepository {
  private supabase = createAdminClient();

  async listAll() {
    // Try both portfolio_patents and patent_portfolio just in case
    return await this.supabase
      .from("portfolio_patents")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async findById(id: string) {
    return await this.supabase
      .from("portfolio_patents")
      .select("*")
      .eq("id", id)
      .single();
  }

  async create(data: Partial<PortfolioPatent>) {
    return await this.supabase
      .from("portfolio_patents")
      .insert(data)
      .select()
      .single();
  }

  async update(id: string, data: Partial<PortfolioPatent>) {
    return await this.supabase
      .from("portfolio_patents")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
  }

  async delete(id: string) {
    return await this.supabase
      .from("portfolio_patents")
      .delete()
      .eq("id", id);
  }
}
