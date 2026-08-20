import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

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

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const supabase = createAdminClient();
    
    // Fetch organizations and their domains
    const { data: domains, error } = await supabase
      .from("organization_domains")
      .select(`
        id,
        domain,
        is_enabled,
        is_verified,
        created_at,
        organizations (
          id,
          name,
          is_enabled
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching domains:", error);
      return NextResponse.json({ detail: "Database error" }, { status: 500 });
    }

    // Get user counts for domains
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("email");
    
    let userCounts: Record<string, number> = {};
    if (!usersError && users) {
        users.forEach(u => {
            if (u.email) {
                const dom = u.email.split('@')[1]?.toLowerCase();
                if (dom) {
                    userCounts[dom] = (userCounts[dom] || 0) + 1;
                }
            }
        });
    }

    const formatted = domains.map(d => ({
        id: d.id,
        domain: d.domain,
        organizationId: Array.isArray(d.organizations) ? d.organizations[0]?.id : (d.organizations as any)?.id,
        organizationName: Array.isArray(d.organizations) ? d.organizations[0]?.name : (d.organizations as any)?.name,
        isEnabled: d.is_enabled,
        isVerified: d.is_verified,
        createdAt: d.created_at,
        userCount: userCounts[d.domain] || 0
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    console.error("GET domains error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { domain, organizationName } = body;

    if (!domain || !organizationName) {
      return NextResponse.json({ detail: "Domain and Organization Name are required." }, { status: 400 });
    }

    const cleanDomain = domain.toLowerCase().trim();

    const supabase = createAdminClient();

    // 1. Check if organization exists, if not create it
    let orgId;
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .ilike("name", organizationName.trim())
      .single();

    if (existingOrg) {
        orgId = existingOrg.id;
    } else {
        const { data: newOrg, error: orgError } = await supabase
          .from("organizations")
          .insert({ name: organizationName.trim(), is_enabled: true })
          .select("id")
          .single();
        if (orgError) return NextResponse.json({ detail: orgError.message }, { status: 500 });
        orgId = newOrg.id;
    }

    // 2. Insert Domain
    const { data: newDomain, error: domainError } = await supabase
      .from("organization_domains")
      .insert({
          organization_id: orgId,
          domain: cleanDomain,
          is_enabled: true,
          is_verified: true,
          created_by: authUser.sub
      })
      .select()
      .single();

    if (domainError) {
        if (domainError.code === '23505') { // Unique violation
            return NextResponse.json({ detail: "Domain already exists." }, { status: 400 });
        }
        return NextResponse.json({ detail: domainError.message }, { status: 500 });
    }

    // 3. Audit Log
    await supabase.from("audit_logs").insert({
        user_id: authUser.sub,
        action: `DOMAIN_ADDED`,
        module: "Security",
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown",
        metadata: { domain: cleanDomain, organization: organizationName }
    });

    return NextResponse.json({ success: true, data: newDomain });
  } catch (err: any) {
    console.error("POST domain error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
