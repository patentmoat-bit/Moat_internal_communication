import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withSessionValidation } from "@/lib/security";

export const GET = withSessionValidation(async (request: NextRequest, sessionUser: any) => {
  try {
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role_id, department, designation, created_at, last_login, roles(role_name)")
      .eq("id", sessionUser.sub)
      .single();

    if (error || !user) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: Array.isArray(user.roles) ? user.roles[0]?.role_name : (user.roles as any)?.role_name || "Viewer",
      department: user.department,
      designation: user.designation,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
});
