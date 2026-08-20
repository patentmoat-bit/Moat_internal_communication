import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "./service";
import { LoginSchema, SignupSchema } from "./validation";
import { createAdminClient } from "@/lib/supabase/admin";

const service = new AuthService();

export class AuthController {
  static async getCurrentUser(req: NextRequest) {
    try {
      const supabase = createAdminClient();
      
      // Sync cookie/auth state
      const {
        data: { user: authUser },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const profile = await service.getUserProfile(authUser.id);
      await service.recordLogin(authUser.id);

      return NextResponse.json({ data: profile });
    } catch (err: any) {
      console.error("[AuthController.getCurrentUser] Error:", err);
      return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
  }

  static async syncProfile(req: NextRequest) {
    try {
      const body = await req.json();
      const parsed = SignupSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const supabase = createAdminClient();
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser();

      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const profile = await service.syncUserProfile(authUser.id, authUser.email!, parsed.data);
      return NextResponse.json({ success: true, data: profile });
    } catch (err: any) {
      console.error("[AuthController.syncProfile] Error:", err);
      return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
  }
}
