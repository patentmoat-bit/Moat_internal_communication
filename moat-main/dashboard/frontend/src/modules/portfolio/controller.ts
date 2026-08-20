import { NextRequest, NextResponse } from "next/server";
import { PortfolioService } from "./service";
import { PortfolioPatentSchema } from "./validation";

const service = new PortfolioService();

export class PortfolioController {
  static async list(req: NextRequest) {
    try {
      const patents = await service.getPatents();
      return NextResponse.json({ data: patents });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async getOne(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      const patent = await service.getPatent(resolvedParams.id);
      return NextResponse.json(patent);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
  }

  static async create(req: NextRequest) {
    try {
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
      const resolvedParams = await params;
      await service.removePatent(resolvedParams.id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
