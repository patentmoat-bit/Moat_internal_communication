import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EventBus } from "@/lib/events/eventBus";
import { GlobalExceptionHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // F-03: Prevent cross-user update
    if (body.user_id && body.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: Cannot forge ownership" }, { status: 403 });
    }

    // Prevent overwriting id or dates accidentally unless specified
    delete body.id;
    delete body.created_at;

    const { data, error } = await supabase
      .from("copyrights")
      .update(body)
      .eq("id", id)
      .eq("user_id", user.id) // Enforce ownership
      .select()
      .single();

    if (error) throw error;

    // Trigger Notification/Audit Workflow via EventBus
    // If status was changed in this update, trigger STATUS_UPDATED, otherwise PROJECT_UPDATED
    const isStatusUpdate = !!body.status;
    const eventType = isStatusUpdate ? "STATUS_UPDATED" : "PROJECT_UPDATED";

    EventBus.publishEvent({
      type: eventType as any,
      resourceId: id,
      resourceType: "copyright",
      notificationTitle: `Copyright ${isStatusUpdate ? "Status" : "Project"} Updated`,
      notificationMessage: `Copyright project "${data.product_name}" has been updated.`,
      actionUrl: "/dashboard/patent-analyst/copyrights",
      projectData: { ...data, title: data.product_name }
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
