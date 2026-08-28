import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventBus } from "@/lib/events/eventBus";
import { GlobalExceptionHandler } from "@/lib/errors";
import { getSessionUser } from "@/lib/security/requireAdmin";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

async function requireCeoOrAdmin(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = appRoleToEnterpriseRole(user.role);
  if (role !== "ceo" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

// Previously had NO auth check on PUT/DELETE — anyone could edit or delete
// any CEO feedback entry. CEO/admin-only now.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireCeoOrAdmin(req);
    if (gate instanceof NextResponse) return gate;
    const user = gate;

    const resolvedParams = await params;
    const supabase = createAdminClient();
    const body = await req.json();

    // Check if status or title is updated
    if (body.status || body.title) {
      const { error: updateError } = await supabase
        .from('ceo_feedback')
        .update({
          status: body.status,
          title: body.title,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolvedParams.id);
      
      if (updateError) throw updateError;

      EventBus.publishEvent({
        type: body.status === 'Approved' ? 'IDEA_APPROVED' : body.status === 'Rejected' ? 'IDEA_REJECTED' : 'STATUS_UPDATED',
        resourceId: resolvedParams.id,
        notificationTitle: `Feedback ${body.status}`,
        notificationMessage: `CEO has marked the feedback as ${body.status}.`,
        targetRole: 'Patent Analyst',
      });
    }

    // If content is provided, create a new version
    if (body.content !== undefined) {
      // Get current max version
      const { data: maxVersionData, error: maxVersionError } = await supabase
        .from('ceo_feedback_versions')
        .select('version_number')
        .eq('feedback_id', resolvedParams.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      
      const newVersionNum = maxVersionData ? maxVersionData.version_number + 1 : 1;

      const { error: versionError } = await supabase
        .from('ceo_feedback_versions')
        .insert({
          feedback_id: resolvedParams.id,
          content: body.content,
          mentions: body.mentions || [],
          attachments: body.attachments || [],
          links: body.links || [],
          version_number: newVersionNum,
          created_by: user.id
        });

      if (versionError) throw versionError;

      EventBus.publishEvent({
        type: 'COMMENT_ADDED',
        resourceId: resolvedParams.id,
        notificationTitle: `New Revision Requested`,
        notificationMessage: `CEO has provided new feedback requiring revision.`,
        targetRole: 'Patent Analyst',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireCeoOrAdmin(req);
    if (gate instanceof NextResponse) return gate;

    const resolvedParams = await params;
    const supabase = createAdminClient();
    
    // Cascades to versions
    const { error } = await supabase.from('ceo_feedback').delete().eq('id', resolvedParams.id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
