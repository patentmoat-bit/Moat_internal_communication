import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = body?.project_id;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const actorId = user?.id || "system";

    // 1. Mark Novelty Search as Completed
    const { error: searchError } = await supabase
      .from("project_searches")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("search_type", "NOVELTY");

    if (searchError) throw searchError;

    // 2. Update Project Status / Tracker (Active Research -> Review)
    const { error: projectError } = await supabase
      .from("inventions")
      .update({ status: "Pending CEO Review" }) // Advance status
      .eq("id", projectId);

    if (projectError) throw projectError;

    // 3. Store Audit Log (Activity History & Timeline)
    await supabase.from("audit_logs").insert({
      event_type: "NOVELTY_REPORT_SUBMITTED",
      entity_type: "inventions",
      entity_id: projectId,
      actor_id: actorId,
      metadata: { message: "Novelty report completed and submitted for review." },
      project_id: projectId,
      new_status: "Pending CEO Review"
    });

    // 4. Notifications (Admin/CEO) - typically dispatched via trigger or event bus, 
    // but we can manually insert an email task or notification record.
    await supabase.from("emails").insert({
      event_type: "NOVELTY_REVIEW_REQUIRED",
      project_id: projectId,
      to_recipients: ["ceo@moat.ai", "admin@moat.ai"]
    });

    return NextResponse.json({ success: true, message: "Novelty report successfully submitted to project context." });
  } catch (error: any) {
    console.error("Novelty Submission Error:", error);
    return await GlobalExceptionHandler.handle(error);
  }
}
