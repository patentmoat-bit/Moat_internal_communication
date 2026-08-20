import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GlobalExceptionHandler, ErrorResponseBuilder } from '@/lib/errors';
import { RepositoryLayer } from '@/lib/repository/RepositoryLayer';
import { AuditLogService } from '@/lib/security/auditLogService';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);
    
    // Rely exclusively on Supabase Server Client cookies
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    const { saved_query_id } = await request.json();

    if (!saved_query_id || !params.id) {
      return ErrorResponseBuilder.error('Missing required parameters.', GlobalExceptionHandler.generateErrorId(), 400);
    }

    // Verify ownership of saved query
    const { data: searchRecord } = await supabase
      .from('saved_queries')
      .select('id, user_id')
      .eq('id', saved_query_id)
      .single();

    if (!searchRecord || searchRecord.user_id !== user.id) {
      return ErrorResponseBuilder.error('Unauthorized. Saved query not found or belongs to another user.', GlobalExceptionHandler.generateErrorId(), 403);
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

    // Save to Research Project
    const { data } = await repo.execute(
      supabase.from('research_project_saved_queries').upsert({
        created_by: user.id,
        project_id: params.id,
        saved_query_id: saved_query_id,
        execution_status: 'IDLE'
      }, { onConflict: 'project_id, saved_query_id' }).select().single()
    );

    const auditLogger = new AuditLogService(supabase);
    await auditLogger.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "PROJECT_QUERY_LINKED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
      endpoint: `/api/research-projects/${params.id}/searches`,
      status: "SUCCESS",
      category: "DOCUMENTS",
      action: "CREATE",
      metadata: { project_id: params.id, saved_query_id }
    }).catch(console.error);

    return ErrorResponseBuilder.success(data, 'Query linked to research project successfully.');
  } catch (err: any) {
    console.error("API Link Search to Project Error:", err);
    return await GlobalExceptionHandler.handle(err, request, 'Unable to link search to project.');
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

    const { data, error } = await repo.execute(
      supabase
        .from('research_project_saved_queries')
        .select(`
          id, project_id, created_at, last_executed_at, execution_status,
          saved_queries ( id, name, description, search_configuration, last_run_at )
        `)
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })
    );

    return ErrorResponseBuilder.success(data || [], 'Project queries retrieved successfully.');
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, 'Unable to retrieve project queries.');
  }
}

