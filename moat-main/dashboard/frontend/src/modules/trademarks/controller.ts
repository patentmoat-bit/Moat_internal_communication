import { NextRequest, NextResponse } from "next/server";
import { TrademarksService } from "./service";
import { TrademarkSchema, TrademarkFileSchema } from "./validation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { AuthorizationMiddleware } from "@/lib/security/authorization/AuthorizationMiddleware";

const service = new TrademarksService();

async function getAuthUser(req?: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub as string,
    name: (payload.name as string) || (payload.email as string)?.split("@")[0] || "User",
    role: (payload.role as string) || "Patent Analyst",
  };
}

export class TrademarksController {
  static async list(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const authRes = await AuthorizationMiddleware.authorize({
        token: req.cookies.get("custom_access_token")?.value,
        userId: user.id,
        userRole: user.role,
        requiredPermission: "trademarks:read",
        endpoint: "/api/trademarks",
        httpMethod: "GET",
        clientIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      if (!authRes.authorized) {
        return NextResponse.json({ error: authRes.reason }, { status: 403 });
      }

      const { searchParams } = new URL(req.url);
      const type = searchParams.get("type") || undefined;
      const status = searchParams.get("status") || undefined;
      const search = searchParams.get("search") || undefined;

      const data = await service.getTrademarks({ type, status, search });
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async getOne(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const resolvedParams = await params;

      const authRes = await AuthorizationMiddleware.authorize({
        token: req.cookies.get("custom_access_token")?.value,
        userId: user.id,
        userRole: user.role,
        requiredPermission: "trademarks:read",
        targetObjectId: resolvedParams.id,
        targetObjectType: "trademark",
        endpoint: `/api/trademarks/${resolvedParams.id}`,
        httpMethod: "GET",
        clientIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      if (!authRes.authorized) {
        return NextResponse.json({ error: authRes.reason }, { status: 403 });
      }

      const data = await service.getTrademark(resolvedParams.id);
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async create(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const authRes = await AuthorizationMiddleware.authorize({
        token: req.cookies.get("custom_access_token")?.value,
        userId: user.id,
        userRole: user.role,
        requiredPermission: "trademarks:write",
        endpoint: "/api/trademarks",
        httpMethod: "POST",
        clientIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      if (!authRes.authorized) {
        return NextResponse.json({ error: authRes.reason }, { status: 403 });
      }

      const body = await req.json();
      const parsed = TrademarkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const data = await service.createTrademark(parsed.data, user.name);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      console.error("TrademarksController.create ERROR:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async update(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const resolvedParams = await params;

      // Previously missing the trademarks:write authorization check that
      // create/list/getOne all have — any authenticated user of any role
      // could modify any trademark.
      const authRes = await AuthorizationMiddleware.authorize({
        token: req.cookies.get("custom_access_token")?.value,
        userId: user.id,
        userRole: user.role,
        requiredPermission: "trademarks:write",
        targetObjectId: resolvedParams.id,
        targetObjectType: "trademark",
        endpoint: `/api/trademarks/${resolvedParams.id}`,
        httpMethod: "PUT",
        clientIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      if (!authRes.authorized) {
        return NextResponse.json({ error: authRes.reason }, { status: 403 });
      }

      const body = await req.json();
      // Allow partial updates
      const data = await service.updateTrademark(resolvedParams.id, body, user.name);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async delete(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role !== "Admin") {
        return NextResponse.json({ error: "Only Admins can delete trademarks" }, { status: 403 });
      }

      const resolvedParams = await params;
      await service.deleteTrademark(resolvedParams.id, user.name);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Not currently wired to any route.ts, but had no auth check at all — fixed
  // here too so this doesn't reproduce the pattern the moment it's wired up.
  static async uploadAttachment(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const parsed = TrademarkFileSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const resolvedParams = await params;
      const file = await service.addAttachment(
        resolvedParams.id,
        parsed.data.name,
        parsed.data.url,
        parsed.data.size,
        parsed.data.type
      );
      return NextResponse.json({ success: true, data: file });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async deleteAttachment(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const resolvedParams = await params;

      // Previously blocked only the "CEO" role and let every other role
      // (including read-only viewers) delete attachments. Gated on the same
      // trademarks:write permission as update/create instead.
      const authRes = await AuthorizationMiddleware.authorize({
        token: req.cookies.get("custom_access_token")?.value,
        userId: user.id,
        userRole: user.role,
        requiredPermission: "trademarks:write",
        targetObjectId: resolvedParams.id,
        targetObjectType: "trademark",
        endpoint: `/api/trademarks/${resolvedParams.id}`,
        httpMethod: "DELETE",
        clientIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      if (!authRes.authorized) {
        return NextResponse.json({ error: authRes.reason }, { status: 403 });
      }
      const { searchParams } = new URL(req.url);
      const fileId = searchParams.get("fileId");
      const fileName = searchParams.get("fileName") || "file";
      if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

      await service.removeAttachment(resolvedParams.id, fileId, fileName);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
