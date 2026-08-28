import { NextRequest, NextResponse } from "next/server";
import { NotificationsService } from "./service";
import { CreateNotificationSchema } from "./validation";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

const service = new NotificationsService();

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export class NotificationsController {
  // Previously called supabase.auth.getUser() on the ADMIN (service-role)
  // client, which has no request session context and would always resolve
  // to a null user — silently broken rather than insecure, fixed to the
  // cookie+JWT pattern used everywhere else in this codebase.
  static async list(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const data = await service.getUserNotifications(user.sub as string);
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Previously had NO auth check — anyone who could reach it could send an
  // arbitrary notification (including impersonating a system alert) to any
  // receiver. Admin-only now.
  static async send(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (appRoleToEnterpriseRole(user.role as string) !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body = await req.json();
      const parsed = CreateNotificationSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const data = await service.sendNotification(parsed.data);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Previously had NO auth check — anyone could mark any other user's
  // notification as read by id. Requires authentication now; the underlying
  // repository doesn't currently support looking a notification up by id to
  // verify its receiver, so this doesn't yet enforce ownership on TOP of
  // authentication — worth tightening if this is ever wired up for real.
  static async markRead(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const resolvedParams = await params;
      await service.markRead(resolvedParams.id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
