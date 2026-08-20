import { NextRequest, NextResponse } from "next/server";
import { WorkspaceService } from "./service";
import { WorkspaceDocumentSchema, InventionSchema } from "./validation";
import { createAdminClient } from "@/lib/supabase/admin";

const service = new WorkspaceService();

export class WorkspaceController {
  static async listDocuments(req: NextRequest) {
    try {
      const data = await service.getDocuments();
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async createDocument(req: NextRequest) {
    try {
      const body = await req.json();
      const parsed = WorkspaceDocumentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const supabase = createAdminClient();
      const { data: { user } } = await supabase.auth.getUser();

      const data = await service.createDocument({
        ...parsed.data,
        created_by: user?.id || null
      });
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async listInventions(req: NextRequest) {
    try {
      const data = await service.getInventions();
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async createInvention(req: NextRequest) {
    try {
      const body = await req.json();
      const parsed = InventionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const supabase = createAdminClient();
      const { data: { user } } = await supabase.auth.getUser();

      const data = await service.createInvention({
        ...parsed.data,
        user_id: user?.id || null
      });
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async getInvention(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      const data = await service.getInvention(resolvedParams.id);
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async updateInvention(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      const body = await req.json();
      const data = await service.updateInvention(resolvedParams.id, body);
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async deleteInvention(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      await service.deleteInvention(resolvedParams.id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
