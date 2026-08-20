import { NextRequest, NextResponse } from "next/server";
import { EventBus, EventType } from "@/lib/events/eventBus";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch (err) {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, resourceId, resourceType, metadata, notificationTitle, notificationMessage, actionUrl } = body;

    if (!type || !resourceId) {
      return NextResponse.json({ error: "Missing type or resourceId" }, { status: 400 });
    }

    const authUser = await getAuthUser();
    
    // For testing, fallback to a known actor or "System"
    const actorId = (authUser as any)?.userId || "ba7452ce-02b4-498d-9459-44ca41ed3c95";
    const actorRole = (authUser as any)?.role || "Patent Analyst";

    // Fetch the project data to pass into the EventBus for routing rules
    const supabase = createAdminClient();
    let table = "inventions";
    if (resourceType === "trademark") table = "trademarks";
    else if (resourceType === "copyright") table = "copyrights";

    const { data: projectData } = await supabase
      .from(table)
      .select("*")
      .eq("id", resourceId)
      .single();

    if (!projectData) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Publish event
    EventBus.publishEvent({
      type: type as EventType,
      actorId,
      actorRole,
      resourceId,
      resourceType: resourceType || "invention",
      metadata,
      notificationTitle,
      notificationMessage,
      actionUrl,
      projectData
    });

    return NextResponse.json({ success: true, message: `Event ${type} published.` });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
