import { NextRequest, NextResponse } from "next/server";
import { UsersService } from "./service";
import { UpdateProfileSchema } from "./validation";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

const service = new UsersService();

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export class UsersController {
  // getProfile/updateProfile previously called supabase.auth.getUser() on the
  // ADMIN (service-role) client, which has no request session context and
  // would always resolve to a null user — these were silently broken (always
  // 401) rather than actually insecure, but fixed here to the same
  // cookie+JWT pattern every other controller in this codebase uses, since a
  // route wiring this up would otherwise never work at all.
  static async getProfile(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const profile = await service.getUser(user.sub as string);
      return NextResponse.json({ data: profile });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async updateProfile(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const parsed = UpdateProfileSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const updated = await service.updateProfile(user.sub as string, parsed.data);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Previously had NO auth check at all — dumped every user's profile to
  // anyone who could reach it. Admin-only now.
  static async listAll(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (appRoleToEnterpriseRole(user.role as string) !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const users = await service.listUsers();
      return NextResponse.json({ data: users });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
