import { NextRequest, NextResponse } from "next/server";
import { FeedbackService } from "./service";
import { FeedbackSchema, ApprovalSchema } from "./validation";
import { createAdminClient } from "@/lib/supabase/admin";

const service = new FeedbackService();

export class FeedbackController {
  static async list(req: NextRequest) {
    try {
      const data = await service.getFeedbackList();
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async submit(req: NextRequest) {
    try {
      const body = await req.json();
      const parsed = FeedbackSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const supabase = createAdminClient();
      const { data: { user } } = await supabase.auth.getUser();

      const data = await service.submitFeedback({
        ...parsed.data,
        created_by: user?.id || null
      });
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async createApproval(req: NextRequest) {
    try {
      const body = await req.json();
      const parsed = ApprovalSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const supabase = createAdminClient();
      const { data: { user } } = await supabase.auth.getUser();

      const data = await service.createApproval({
        ...parsed.data,
        approved_by: user?.id || null
      });
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async listApprovals(req: NextRequest) {
    try {
      const data = await service.getApprovals();
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
