import { NextRequest, NextResponse } from "next/server";
import { AlertsService } from "./service";
import { AlertSchema } from "./validation";
import { createAdminClient } from "@/lib/supabase/admin";

import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

const service = new AlertsService();

async function getAuthUser(req?: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export class AlertsController {
  static async list(req: NextRequest) {
    try {
      const user = await getAuthUser(req);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const data = await service.getUserAlerts(user.id);
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async getOne(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      const data = await service.getAlert(resolvedParams.id);
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json();
      const parsed = AlertSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const user = await getAuthUser(req);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const data = await service.createAlert({
        ...parsed.data,
        user_id: user.id
      });
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async update(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      const body = await req.json();
      const data = await service.updateAlert(resolvedParams.id, body);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async delete(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      await service.removeAlert(resolvedParams.id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
