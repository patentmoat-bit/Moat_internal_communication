import { NextRequest, NextResponse } from "next/server";
import { UsersService } from "./service";
import { UpdateProfileSchema } from "./validation";
import { createAdminClient } from "@/lib/supabase/admin";

const service = new UsersService();

export class UsersController {
  static async getProfile(req: NextRequest) {
    try {
      const supabase = createAdminClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const profile = await service.getUser(user.id);
      return NextResponse.json({ data: profile });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async updateProfile(req: NextRequest) {
    try {
      const supabase = createAdminClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const parsed = UpdateProfileSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const updated = await service.updateProfile(user.id, parsed.data);
      return NextResponse.json({ success: true, data: updated });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async listAll(req: NextRequest) {
    try {
      const users = await service.listUsers();
      return NextResponse.json({ data: users });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
