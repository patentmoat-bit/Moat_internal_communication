import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EventBus } from "@/lib/events/eventBus";
import { GlobalExceptionHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // F-03: Enforce strict server-side tenant isolation
    const { data, error } = await supabase
      .from("copyrights")
      .select("id, product_name, authors, status, registration_number, filing_date, created_at, workflow_state") // Phase 8 Optimization
      .eq("user_id", user.id) // Enforce ownership
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, return empty array gracefully
        return NextResponse.json({ data: [] });
      }
      throw error;
    }
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // F-03: Prevent forged ownership
    if (body.user_id && body.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: Cannot forge ownership" }, { status: 403 });
    }
    body.user_id = user.id;

    const { data, error } = await supabase
      .from("copyrights")
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    // Trigger Notification/Audit Workflow via EventBus
    EventBus.publishEvent({
      type: "PROJECT_CREATED",
      resourceId: data.id,
      resourceType: "copyright",
      notificationTitle: "New Copyright Project Created",
      notificationMessage: `A new Copyright project "${data.product_name}" has been created.`,
      actionUrl: "/dashboard/patent-analyst/copyrights",
      projectData: { ...data, title: data.product_name } // Map product_name to title for email template
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
