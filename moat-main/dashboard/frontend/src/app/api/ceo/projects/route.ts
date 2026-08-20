import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventBus } from "@/lib/events/eventBus";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return payload;
  } catch (err) {
    return null;
  }
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const userRoleStr = (authUser.role || "").toUpperCase();
    if (!userRoleStr.includes("CEO") && !userRoleStr.includes("ADMIN") && !userRoleStr.includes("PATENT ANALYST") && !userRoleStr.includes("PATENT DRAFTER") && !userRoleStr.includes("DESIGN TEAM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("inventions")
      .select("id, title, description, status, tags, metadata, created_at, updated_at, user_id, assigned_to, patent_number, due_date, technical_field")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const projects = data || [];

    // Bypass broken Postgres trigger `log_invention_activity` by using activity_logs as the source of truth for status
    if (projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      const { data: historyData } = await supabase
        .from("activity_logs")
        .select("entity_id, metadata, created_at")
        .eq("action", "MANUAL_STATUS_UPDATE")
        .in("entity_id", projectIds)
        .order("created_at", { ascending: false });

      if (historyData && historyData.length > 0) {
        // Group by entity_id to find the latest status
        const latestStatusMap = new Map<string, string>();
        for (const record of historyData) {
          if (!latestStatusMap.has(record.entity_id) && record.metadata?.new_status) {
            latestStatusMap.set(record.entity_id, record.metadata.new_status);
          }
        }

        // Apply latest status to projects
        for (const project of projects) {
          if (latestStatusMap.has(project.id)) {
            project.status = latestStatusMap.get(project.id)!;
          }
        }
      }
    }

    return NextResponse.json(projects);
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();
    
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const userRoleStr = (authUser.role || "").toUpperCase();
    if (!userRoleStr.includes("CEO") && !userRoleStr.includes("ADMIN") && !userRoleStr.includes("PATENT ANALYST") && !userRoleStr.includes("PATENT DRAFTER") && !userRoleStr.includes("DESIGN TEAM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // We must use the authenticated user's ID
    const finalUserId = authUser.sub;

    const { user_id, ...insertData } = body;

    const isCEO = userRoleStr.includes("CEO") || userRoleStr.includes("ADMIN");
    const creatorRole = isCEO ? "CEO" : "Patent Analyst";

    // Sanitize UUID fields to prevent Postgres casting errors
    if (insertData.assigned_to === "") {
      insertData.assigned_to = null;
    }

    // Ensure the user exists in public.users to prevent FOREIGN_KEY_VIOLATION
    const { data: existingUser } = await supabase.from('users').select('id').eq('id', finalUserId).single();
    if (!existingUser) {
      console.log(`[CEO Projects API] User ${finalUserId} missing from public.users. Creating...`);
      const { error: insertUserError } = await supabase.from('users').upsert({
        id: finalUserId,
        email: authUser.email || `${finalUserId}@moat.ai`,
        name: authUser.user_metadata?.full_name || authUser.name || 'Unknown User',
        role: 'CEO', // Hardcode CEO to ensure enum match
        account_status: 'ACTIVE',
        status: 'Active',
        is_active: true
      });
      if (insertUserError) {
        console.error("[CEO Projects API] User auto-provisioning failed:", insertUserError);
        const fs = require('fs');
        fs.writeFileSync('/home/jothikahaldurai/Downloads/moat-mainnew/moat-main/dashboard/frontend/provision_error.json', JSON.stringify({ insertUserError, finalUserId, email: authUser.email }, null, 2));
        throw new Error(`Failed to auto-provision user: ${insertUserError.message}`);
      }
    }

    const { data, error } = await supabase
      .from("inventions")
      .insert({
        ...insertData,
        user_id: finalUserId,
        metadata: { created_via: "MOAT Dashboard", creator_role: creatorRole }
      })
      .select()
      .single();

    if (error) {
      console.error("[CEO Projects API] Insert Failed:", JSON.stringify(error, null, 2), { insertData, finalUserId });
      const fs = require('fs');
      fs.writeFileSync('/home/jothikahaldurai/Downloads/moat-mainnew/moat-main/dashboard/frontend/insert_error.json', JSON.stringify({ error, insertData, finalUserId }, null, 2));
      throw error;
    }
    
    // Publish workflow event
    EventBus.publishEvent({
      type: 'PROJECT_CREATED',
      actorId: finalUserId,
      actorRole: isCEO ? "CEO" : "Patent Analyst",
      resourceId: data.id,
      resourceType: 'invention',
      notificationTitle: 'New Project Created',
      notificationMessage: `Project "${data.title}" has been created.`,
      actionUrl: `/dashboard/inventions/${data.id}`,
      metadata: { title: data.title },
      projectData: data
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
