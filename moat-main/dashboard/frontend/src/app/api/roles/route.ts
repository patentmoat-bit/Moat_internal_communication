import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || appRoleToEnterpriseRole(user.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const supabase = createAdminClient();
    
    // Fetch all roles, also fetch count of users per role (we can just fetch roles and count separately)
    const { data: roles, error } = await supabase
      .from("roles")
      .select(`id, role_name, description, is_system_role, created_at`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json({ detail: "Database error" }, { status: 500 });
    }

    // Now let's fetch user counts for each role
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(`role_id`);

    let userCounts: Record<string, number> = {};
    if (users) {
      users.forEach(u => {
        if (u.role_id) {
          userCounts[u.role_id] = (userCounts[u.role_id] || 0) + 1;
        }
      });
    }

    const formattedRoles = roles.map(r => ({
      id: r.id,
      name: r.role_name,
      description: r.description,
      type: r.is_system_role ? "System" : "Custom",
      users: userCounts[r.id] || 0
    }));

    return NextResponse.json(formattedRoles, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300"
      }
    });
  } catch (err: any) {
    console.error("GET roles error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const { role_name, description } = await request.json();

    if (!role_name) {
      return NextResponse.json({ detail: "Role name is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if role exists
    const { data: existingRole } = await supabase.from("roles").select("id").eq("role_name", role_name).single();
    if (existingRole) {
      return NextResponse.json({ detail: "Role with this name already exists." }, { status: 400 });
    }

    const { data: newRole, error: insertError } = await supabase
      .from("roles")
      .insert({
        role_name,
        description: description || null,
        is_system_role: false
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating role:", insertError);
      return NextResponse.json({ detail: `Failed to create role in database: ${insertError.message}` }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      user_id: authUser.sub,
      action: `Created Custom Role: ${role_name}`,
      module: "Role Management",
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
    });

    return NextResponse.json({ 
      detail: "Role created successfully.", 
      role: {
        id: newRole.id,
        name: newRole.role_name,
        description: newRole.description,
        type: newRole.is_system_role ? "System" : "Custom",
        users: 0
      }
    });

  } catch (err: any) {
    console.error("POST role error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
