import { NextRequest, NextResponse } from "next/server";
import { NotificationsService } from "./service";
import { CreateNotificationSchema } from "./validation";
import { createAdminClient } from "@/lib/supabase/admin";

const service = new NotificationsService();

export class NotificationsController {
  static async list(req: NextRequest) {
    try {
      const supabase = createAdminClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const data = await service.getUserNotifications(user.id);
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async send(req: NextRequest) {
    try {
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

  static async markRead(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const resolvedParams = await params;
      await service.markRead(resolvedParams.id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
