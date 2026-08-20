import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";
import { AuditLogService } from "@/lib/security/auditLogService";

// Authentication Helper
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { name, email, role, department, status } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json({ detail: "Name, email, and role are required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get the role_id for the given role string
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("role_name", role)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ detail: `Role '${role}' not found in database.` }, { status: 400 });
    }

    // Update User
    const { error: updateError } = await supabase
      .from("users")
      .update({
        name,
        email,
        role_id: roleData.id,
        department: department || "General",
        status: status || "Active",
        is_active: status === "Active"
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json({ detail: `Failed to update user in database: ${updateError.message}` }, { status: 500 });
    }

    // Audit Log
    const auditService = new AuditLogService(supabase);
    await auditService.logEvent({
      userId: authUser.sub,
      email: (authUser as any).email,
      eventType: "USER_UPDATED",
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
      userAgent: request.headers.get("user-agent") || "Unknown",
      endpoint: request.nextUrl.pathname,
      status: "SUCCESS",
      actorRole: authUser.role as string,
      category: "USER_MANAGEMENT",
      resourceType: "User",
      resourceId: id,
      resourceName: email,
      oldValue: { id },
      newValue: { name, email, role, department, status },
    });

    return NextResponse.json({ detail: "User updated successfully." });
  } catch (err: any) {
    console.error("PUT user error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = createAdminClient();

    // Get user email for audit log
    const { data: userData } = await supabase.from("users").select("email").eq("id", id).single();

    // Delete User from Auth System
    // This will usually cascade to public.users if the DB is configured with ON DELETE CASCADE,
    // but we'll also explicitly delete from public.users to be safe.
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.error("Error deleting user from auth:", authDeleteError);
      // We log but continue, in case the auth user is already gone but public user remains
    }

    // Delete User from public.users
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return NextResponse.json({ detail: `Failed to delete user: ${deleteError.message}` }, { status: 500 });
    }

    // Audit Log
    const auditService = new AuditLogService(supabase);
    await auditService.logEvent({
      userId: authUser.sub,
      email: (authUser as any).email,
      eventType: "USER_DELETED",
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
      userAgent: request.headers.get("user-agent") || "Unknown",
      endpoint: request.nextUrl.pathname,
      status: "SUCCESS",
      actorRole: authUser.role as string,
      category: "USER_MANAGEMENT",
      resourceType: "User",
      resourceId: id,
      resourceName: userData?.email || id,
      oldValue: userData || undefined,
      newValue: undefined,
    });

    return NextResponse.json({ detail: "User deleted successfully." });
  } catch (err: any) {
    console.error("DELETE user error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
