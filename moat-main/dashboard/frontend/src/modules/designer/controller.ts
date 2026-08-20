import { NextRequest, NextResponse } from "next/server";
import { DesignerService } from "./service";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

const service = new DesignerService();

async function getAuthUser(req?: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub as string,
    name: (payload.name as string) || (payload.email as string)?.split("@")[0] || "User",
    role: (payload.role as string) || "Designer",
  };
}

export class DesignerController {
  static async listTasks(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const data = await service.getTasks();
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async createTask(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const data = await service.createTask(body, user.id);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async updateTaskStatus(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const resolvedParams = await params;
      const body = await req.json();
      const data = await service.updateTaskStatus(resolvedParams.id, body.status);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async addAsset(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const resolvedParams = await params;
      const body = await req.json();
      const data = await service.addAsset(resolvedParams.id, body, user.id);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
