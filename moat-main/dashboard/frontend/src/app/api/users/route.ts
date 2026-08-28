import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import crypto from "crypto";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";
import { dispatchEmails } from "@/lib/events/handlers";
import { validatePasswordPolicy } from "@/lib/security/passwordPolicy";

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
    console.log("Auth user in GET /api/users:", user);
    if (!user || appRoleToEnterpriseRole(user.role as any) !== "admin") {
      console.log("Unauthorized user:", user);
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const supabase = createAdminClient();
    
    // Fetch all users with their roles
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        id, 
        name, 
        email, 
        department, 
        designation, 
        status, 
        is_active, 
        last_login, 
        roles (
          role_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json({ detail: "Database error" }, { status: 500 });
    }

    // Format the response
    const formattedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department || "N/A",
      designation: u.designation || "N/A",
      status: u.is_active ? "Active" : "Inactive",
      role: Array.isArray(u.roles) ? u.roles[0]?.role_name : (u.roles as any)?.role_name || "Unknown",
      lastLogin: u.last_login
    }));

    return NextResponse.json(formattedUsers);
  } catch (err: any) {
    console.error("GET users error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const { email, role, name, password, department } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ detail: "Email and role are required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 0. Strict Email Validation & Corporate Domain Enforcement
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ detail: "Invalid email format." }, { status: 400 });
    }
    const domain = email.split('@')[1].toLowerCase();

    // Check if domain is allowed in organization_domains
    const { data: orgDomain } = await supabase
      .from("organization_domains")
      .select("id, is_enabled, organizations(id, is_enabled)")
      .eq("domain", domain)
      .single();

    if (!orgDomain || !orgDomain.is_enabled || !(orgDomain.organizations as any)?.is_enabled) {
      // Audit log the rejection
      await supabase.from("audit_logs").insert({
        user_id: authUser.sub,
        event_type: "USER_DOMAIN_REJECTED",
        entity_type: "/api/users",
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
        metadata: { email, domain, reason: "Unapproved or disabled domain", module: "User Management" }
      });
      return NextResponse.json({ detail: "User domain is not permitted." }, { status: 400 });
    }

    // 1. Check if email exists
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single();
    if (existingUser) {
      return NextResponse.json({ detail: "User with this email already exists." }, { status: 400 });
    }

    // 2. Get the role_id for the given role string
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("role_name", role)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ detail: `Role '${role}' not found in database.` }, { status: 400 });
    }

    // Direct Provisioning
    if (name && password) {
      const policyCheck = validatePasswordPolicy(password);
      if (!policyCheck.valid) {
        return NextResponse.json({ detail: policyCheck.errors.join(" ") }, { status: 400 });
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          role: role,
        },
      });

      if (authError || !authData.user) {
        return NextResponse.json({ detail: authError?.message ?? "Failed to create user in Auth system." }, { status: 400 });
      }

      // The admin-issued password lives only in Supabase Auth (set via
      // admin.createUser above) — password_change_required forces the user to
      // set their own password on first login before they get a session
      // (enforced once the login route checks this flag).
      const { error: upsertError } = await supabase.from("users").upsert({
        id: authData.user.id,
        email: authData.user.email!,
        name: name.trim(),
        role: role,
        department: department || null,
        role_id: roleData.id,
        is_active: true,
        status: "Active",
        password_change_required: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (upsertError) {
        console.error("Error upserting user:", upsertError);
        return NextResponse.json({ detail: "User created in Auth but failed to sync to Database." }, { status: 500 });
      }

      // Audit Log
      await supabase.from("audit_logs").insert({
        user_id: authUser.sub,
        event_type: "USER_PROVISIONED",
        entity_type: "/api/users",
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
        metadata: { email, role, action: `Provisioned User: ${email} to role ${role}` }
      });

      // Send Welcome Email for Direct Provisioning
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      const host = request.headers.get("host") || "localhost:3000";
      const loginLink = `${protocol}://${host}/login?email=${encodeURIComponent(email)}`;
      
      const htmlBody = `
        <h2>Welcome to MOAT Patent Intelligence Platform</h2>
        <p>An administrator has created an account for you with the role of <b>${role}</b>.</p>
        <p>You can now log in using this email address and the password provided to you by your administrator.</p>
        <a href="${loginLink}" style="display:inline-block;padding:10px 20px;background:#c9a84c;color:#000;text-decoration:none;border-radius:5px;font-weight:bold;">Log In to MOAT</a>
      `;

      try {
        await dispatchEmails([email], [], "Welcome to MOAT Platform", htmlBody);
      } catch (emailError: any) {
        console.error("Failed to send welcome email:", emailError);
      }

      return NextResponse.json({ 
        detail: "User provisioned successfully.", 
        user: { email, role, name, id: authData.user.id } 
      });
    }

    // 3. Generate secure invitation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    // Configurable expiration: 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 4. Insert Invitation
    const { error: insertError } = await supabase
      .from("user_invitations")
      .insert({
        email,
        role_id: roleData.id,
        invited_by: authUser.sub,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error creating invitation:", insertError);
      return NextResponse.json({ detail: `Failed to create invitation: ${insertError.message}` }, { status: 500 });
    }

    // 5. Send Invitation Email
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const inviteLink = `${protocol}://${host}/accept-invitation?token=${rawToken}`;
    
    const htmlBody = `
      <h2>You've been invited to MOAT Patent Intelligence Platform</h2>
      <p>An administrator has invited you to join MOAT with the role of <b>${role}</b>.</p>
      <p>Click the link below to accept your invitation and set up your account. This link will expire in 24 hours.</p>
      <a href="${inviteLink}" style="display:inline-block;padding:10px 20px;background:#c9a84c;color:#000;text-decoration:none;border-radius:5px;font-weight:bold;">Accept Invitation</a>
      <p>If you did not expect this invitation, please ignore this email.</p>
    `;

    try {
      await dispatchEmails([email], [], "MOAT Platform Invitation", htmlBody);
    } catch (emailError: any) {
      console.error("Failed to send invitation email:", emailError);
      // We don't fail the request if email fails, but we should log it
    }

    // 6. Audit Log
    await supabase.from("audit_logs").insert({
      user_id: authUser.sub,
      event_type: "USER_INVITED",
      entity_type: "/api/users",
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown",
      metadata: { email, role, action: `Invited User: ${email} to role ${role}`, module: "User Management" }
    });

    return NextResponse.json({ 
      detail: "Invitation sent successfully.", 
      invited: { email, role } 
    });

  } catch (err: any) {
    console.error("POST user error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
