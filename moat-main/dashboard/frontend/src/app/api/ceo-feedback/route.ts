import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";
import { getSessionUser } from "@/lib/security/requireAdmin";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

// Previously had NO auth check on any method — anyone unauthenticated could
// list all CEO feedback or create arbitrary entries. Reads require login;
// writes are CEO/admin-only since this is CEO-authored review feedback.
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase.from('ceo_feedback').select('*, versions:ceo_feedback_versions(*)').order('created_at', { ascending: false });

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = appRoleToEnterpriseRole(user.role);
    if (role !== "ceo" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const body = await req.json();

    // 1. Create the base feedback entry
    const { data: feedback, error: feedbackError } = await supabase
      .from('ceo_feedback')
      .insert({
        title: body.title,
        status: body.status || 'Open',
        target_id: body.target_id,
        target_type: body.target_type,
        created_by: user.id
      })
      .select()
      .single();

    if (feedbackError) throw feedbackError;

    // 2. Create the first version with the content
    const { error: versionError } = await supabase
      .from('ceo_feedback_versions')
      .insert({
        feedback_id: feedback.id,
        content: body.content || '',
        mentions: body.mentions || [],
        attachments: body.attachments || [],
        links: body.links || [],
        version_number: 1,
        created_by: user.id
      });

    if (versionError) throw versionError;

    return NextResponse.json({ success: true, data: feedback });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
