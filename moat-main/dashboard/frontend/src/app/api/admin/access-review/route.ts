import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AccessReviewService } from "@/lib/security/access/AccessReviewService";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
             cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    );

    const token = cookieStore.get("custom_access_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = await verifyToken(token);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Admin authorization
    if (!authUser || (authUser.role !== "Admin" && authUser.role !== "super_admin" && authUser.role !== "Super Admin")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Create a service client for the admin operations
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Used securely on backend to read all users
      { cookies: { getAll() { return [] }, setAll() {} } }
    );

    const service = new AccessReviewService(adminSupabase);
    const users = await service.getAllUsersAccess();
    const stats = await service.getDashboardStats();

    return NextResponse.json({ success: true, data: { users, stats } });
  } catch (err: any) {
    console.error("Access Review API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
