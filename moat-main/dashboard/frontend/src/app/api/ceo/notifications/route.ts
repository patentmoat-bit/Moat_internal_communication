import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    return await verifyToken(token);
  } catch (err) {
    return null;
  }
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const role = ((authUser as any).role || "").toUpperCase();
    if (!role.includes("CEO") && !role.includes("ADMIN") && !role.includes("PATENT ANALYST") && !role.includes("PATENT DRAFTER") && !role.includes("DESIGN TEAM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Fetch ALL activity logs (project events, CEO decisions, status changes, emails)
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, user_id, actor_id, entity_type, entity_id, action, message, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const role = ((authUser as any).role || "").toUpperCase();
    if (!role.includes("CEO") && !role.includes("ADMIN") && !role.includes("PATENT ANALYST") && !role.includes("PATENT DRAFTER") && !role.includes("DESIGN TEAM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const supabase = createAdminClient();

    if (id) {
      const { error } = await supabase
        .from("activity_logs")
        .update({ action: "read" })
        .eq("id", id);
      if (error) throw error;
    } else {
      // Mark all as read
      const { error } = await supabase
        .from("activity_logs")
        .update({ action: "read" })
        .neq("action", "read");
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
