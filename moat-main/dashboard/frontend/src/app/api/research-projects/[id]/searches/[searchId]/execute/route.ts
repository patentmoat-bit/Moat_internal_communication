import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GlobalExceptionHandler, ErrorResponseBuilder } from '@/lib/errors';
import { RepositoryLayer } from '@/lib/repository/RepositoryLayer';
import { AuditLogService } from '@/lib/security/auditLogService';

export async function POST(request: Request, { params }: { params: { id: string, searchId: string } }) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    const { results, execution_metadata } = await request.json();

    if (!results || !Array.isArray(results)) {
      return ErrorResponseBuilder.error('Search results are required to record execution.', GlobalExceptionHandler.generateErrorId(), 400);
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

    // Insert Execution Record
    const { data: execution } = await repo.execute(
      supabase.from('search_executions').insert({
        saved_query_id: params.searchId,
        project_id: params.id,
        user_id: user.id,
        status: 'COMPLETED',
        result_count: results.length,
        execution_metadata: execution_metadata || {}
      }).select().single()
    );

    // Insert Result Snapshots
    if (results.length > 0) {
      const snapshots = results.slice(0, 500).map((r: any, idx: number) => ({
        execution_id: execution.id,
        patent_id: r.id || r.patent_number,
        rank: idx + 1,
        relevance_score: r.relevance_score || r.ai_match_score || 0
      }));

      await repo.execute(
        supabase.from('search_execution_results').insert(snapshots)
      );
    }

    // Update last_executed_at in linking table
    await repo.execute(
      supabase.from('research_project_saved_queries').update({
        last_executed_at: new Date().toISOString(),
        execution_status: 'COMPLETED'
      })
      .eq('project_id', params.id)
      .eq('saved_query_id', params.searchId)
      .eq('created_by', user.id)
    );

    const auditLogger = new AuditLogService(supabase);
    await auditLogger.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "QUERY_EXECUTED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
      endpoint: `/api/research-projects/${params.id}/searches/${params.searchId}/execute`,
      status: "SUCCESS",
      category: "DOCUMENTS",
      action: "EXECUTE",
      metadata: { project_id: params.id, saved_query_id: params.searchId, result_count: results.length }
    }).catch(console.error);

    return ErrorResponseBuilder.success(execution, "Search execution recorded successfully.");
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Unable to record search execution.");
  }
}
