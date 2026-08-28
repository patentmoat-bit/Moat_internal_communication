import { NextRequest, NextResponse } from "next/server";
import { PortfolioService } from "./service";
import { PortfolioPatentSchema } from "./validation";
import { requireAuth } from "@/lib/security/requireAdmin";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

const service = new PortfolioService();

// Portfolio entries are company-wide (not per-user) data, so the gate here is
// authentication for reads and a role check for mutations, rather than
// per-row ownership. This previously had NO auth check at all on the
// single-item get/update/delete routes.
const MUTATION_ROLES = ["admin", "ceo", "patent_counsel"];

async function requireMutationRole(req: NextRequest) {
  const user = await requireAuth(req);
  if (user instanceof NextResponse) return user;
  if (!MUTATION_ROLES.includes(appRoleToEnterpriseRole(user.role) || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

export class PortfolioController {
  static async list(req: NextRequest) {
    try {
      const auth = await requireAuth(req);
      if (auth instanceof NextResponse) return auth;
      const patents = await service.getPatents();
      return NextResponse.json({ data: patents });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async getOne(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const auth = await requireAuth(req);
      if (auth instanceof NextResponse) return auth;
      const resolvedParams = await params;
      const patent = await service.getPatent(resolvedParams.id);
      return NextResponse.json(patent);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
  }

  static async create(req: NextRequest) {
    try {
      const auth = await requireMutationRole(req);
      if (auth instanceof NextResponse) return auth;

      const body = await req.json();
      const parsed = PortfolioPatentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const patent = await service.addPatent(parsed.data);
      return NextResponse.json({ success: true, data: patent });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async update(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const auth = await requireMutationRole(req);
      if (auth instanceof NextResponse) return auth;
      const resolvedParams = await params;
      const body = await req.json();
      const patent = await service.updatePatent(resolvedParams.id, body);
      return NextResponse.json({ success: true, data: patent });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async delete(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const auth = await requireMutationRole(req);
      if (auth instanceof NextResponse) return auth;
      const resolvedParams = await params;
      await service.removePatent(resolvedParams.id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
