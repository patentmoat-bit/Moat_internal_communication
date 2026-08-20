import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GlobalExceptionHandler, ErrorResponseBuilder } from '@/lib/errors'
import { RepositoryLayer } from '@/lib/repository/RepositoryLayer'
import { AuditLogService } from '@/lib/security/auditLogService'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const repo = new RepositoryLayer(supabase)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) return ErrorResponseBuilder.error('Authentication required or credentials invalid.', GlobalExceptionHandler.generateErrorId(), 401)

    const { patent } = await request.json()
    if (!patent || typeof patent !== 'object') {
      return ErrorResponseBuilder.error('Invalid request parameters provided.', GlobalExceptionHandler.generateErrorId(), 400)
    }

    const { data } = await repo.execute(
      supabase.from('saved_patents').upsert({
        user_id: user.id,
        patent_number: patent.patent_number || patent.patentNumber || patent.id || 'UNKNOWN',
        title: patent.title || 'Untitled Patent',
        assignee: patent.assignee || patent.assignees?.[0] || 'Unknown Assignee',
        inventors: patent.inventors || [],
        filing_date: patent.filing_date || patent.filingDate || patent.date || new Date().toISOString(),
        publication_date: patent.publication_date || patent.publicationDate || new Date().toISOString(),
        status: patent.status || 'Unknown',
        abstract: patent.abstract || 'No abstract available.',
        ipc_codes: patent.ipc_codes || patent.ipc || [],
        cpc_codes: patent.cpc_codes || patent.cpc || [],
        jurisdiction: patent.jurisdiction || 'US',
        citations: patent.citations || 0,
        ai_match_score: patent.ai_match_score || patent.aiMatchScore || patent.semanticScore || 0,
        raw_data: patent
      }, { onConflict: 'user_id,patent_number' }).select().single()
    )
    if (!data) {
      console.error("Save Patent DB execution returned no data");
    }

    const auditLogger = new AuditLogService(supabase);
    await auditLogger.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "PATENT_DOCUMENT_SAVED",
      ipAddress: request.headers?.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers?.get("user-agent") || "Unknown",
      endpoint: "/api/patents/save",
      status: "SUCCESS",
      category: "DOCUMENTS",
      action: "PATENT_SAVE",
      metadata: { patentId: data.id, patentNumber: data.patent_number }
    }).catch(err => console.error("Failed to log event:", err));

    return ErrorResponseBuilder.success(data, 'Patent saved successfully.')
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, 'Unable to save patent at this time.')
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const repo = new RepositoryLayer(supabase)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return ErrorResponseBuilder.error('Authentication required or credentials invalid.', GlobalExceptionHandler.generateErrorId(), 401)

    const { patentId } = await request.json()
    if (!patentId) {
      return ErrorResponseBuilder.error('Invalid identifier or format provided.', GlobalExceptionHandler.generateErrorId(), 400)
    }

    await repo.execute(
      supabase.from('saved_patents').delete().eq('id', patentId).eq('user_id', user.id).select()
    )

    const auditLogger = new AuditLogService(supabase);
    await auditLogger.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "PATENT_DOCUMENT_REMOVED",
      ipAddress: request.headers?.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers?.get("user-agent") || "Unknown",
      endpoint: "/api/patents/save",
      status: "SUCCESS",
      category: "DOCUMENTS",
      action: "PATENT_REMOVE",
      metadata: { patentId }
    }).catch(err => console.error("Failed to log event:", err));

    return ErrorResponseBuilder.success({ success: true }, 'Patent removed successfully.')
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, 'Unable to remove patent at this time.')
  }
}
