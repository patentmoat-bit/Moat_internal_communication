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

export const PUT = withSessionValidation(async (request: NextRequest, sessionUser: any) => {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { name } = body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ detail: "Name is required and must be a valid string" }, { status: 400 });
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("id", sessionUser.sub)
      .select("id, name, email, role_id, department, designation, created_at, last_login, roles(role_name)")
      .single();

    if (error || !updatedUser) {
      console.error("[Profile Update Error]", error);
      return NextResponse.json({ detail: "Failed to update user profile" }, { status: 400 });
    }

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: Array.isArray(updatedUser.roles) ? updatedUser.roles[0]?.role_name : (updatedUser.roles as any)?.role_name || "Viewer",
      department: updatedUser.department,
      designation: updatedUser.designation,
      createdAt: updatedUser.created_at,
      lastLogin: updatedUser.last_login,
    });
  } catch (err: any) {
    console.error("[Profile Update Server Error]", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
});
