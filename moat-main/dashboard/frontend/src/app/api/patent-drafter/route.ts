import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { createAdminClient } = require("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const { verifyToken } = require("@/lib/jwt");
    const token = req.cookies.get("custom_access_token")?.value;
    let authUser = null;
    if (token) {
      try { authUser = await verifyToken(token); } catch (e) {}
    }
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", authUser.userId).single();
    if (!profile || (profile.role !== "Patent Drafter" && profile.role !== "Admin" && profile.role !== "Super Admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Since RLS is enabled, we can just query inventions where we are a project_member
    // RLS policy on inventions should allow us to SELECT if we are in project_members.
    // However, we want to specifically fetch projects in "Drafting", "Design Review", "CEO Review" status.
    const { data, error } = await supabase
      .from("inventions")
      .select("id, title, status, created_at, project_members!inner(role)")
      .eq("project_members.user_id", authUser.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
