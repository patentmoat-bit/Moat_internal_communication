import { NextRequest, NextResponse } from "next/server";
import { WorkspaceService } from "./service";
import { WorkspaceDocumentSchema, InventionSchema } from "./validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/security/requireAdmin";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

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

  // These three previously had NO auth check at all — any authenticated user
  // (or, given no session check either, potentially anyone who could reach the
  // route) could read, edit, or delete any invention by guessing/enumerating
  // its id. Now requires a valid session and, since inventions are
  // user-scoped, ownership (or admin) before allowing access.
  private static async assertCanAccessInvention(req: NextRequest, id: string) {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const invention = await service.getInvention(id);
    const isOwner = (invention as any)?.user_id === user.id;
    // Admin and CEO both need company-wide oversight of every project — the
    // CEO's "Executive View" (dashboard/ceo/moat) explicitly lists and lets
    // the CEO manage every project regardless of who drafted it, which the
    // first version of this check didn't account for (only owner-or-admin).
    const enterpriseRole = appRoleToEnterpriseRole(user.role);
    const hasOversightAccess = enterpriseRole === "admin" || enterpriseRole === "ceo";
    if (!isOwner && !hasOversightAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return invention;
  }

  static async getInvention(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      const gate = await WorkspaceController.assertCanAccessInvention(req, resolvedParams.id);
      if (gate instanceof NextResponse) return gate;
      return NextResponse.json(gate);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async updateInvention(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      const gate = await WorkspaceController.assertCanAccessInvention(req, resolvedParams.id);
      if (gate instanceof NextResponse) return gate;
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
      const gate = await WorkspaceController.assertCanAccessInvention(req, resolvedParams.id);
      if (gate instanceof NextResponse) return gate;
      await service.deleteInvention(resolvedParams.id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
