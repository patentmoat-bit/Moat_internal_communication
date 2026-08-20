import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GlobalExceptionHandler, ErrorResponseBuilder } from '@/lib/errors';
import { RepositoryLayer } from '@/lib/repository/RepositoryLayer';
import { AuditLogService } from '@/lib/security/auditLogService';

export async function DELETE(request: Request, { params }: { params: { id: string, searchId: string } }) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    // Verify ownership of research project
    const { data: projectRecord } = await supabase
      .from('moat_ideas')
      .select('id, created_by')
      .eq('id', params.id)
      .single();

    if (!projectRecord || projectRecord.created_by !== user.id) {
      return ErrorResponseBuilder.error('Unauthorized. Project not found or belongs to another user.', GlobalExceptionHandler.generateErrorId(), 403);
    }

    await repo.execute(
      supabase
        .from('research_project_saved_queries')
        .delete()
        .eq('project_id', params.id)
        .eq('saved_query_id', params.searchId)
        .eq('created_by', user.id)
    );

    const auditLogger = new AuditLogService(supabase);
    await auditLogger.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "PROJECT_QUERY_UNLINKED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
      endpoint: `/api/research-projects/${params.id}/searches/${params.searchId}`,
      status: "SUCCESS",
      category: "DOCUMENTS",
      action: "DELETE",
      metadata: { project_id: params.id, saved_query_id: params.searchId }
    }).catch(console.error);

    return ErrorResponseBuilder.success(null, "Saved query removed from research project.");
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Unable to remove query from project.");
  }
}
