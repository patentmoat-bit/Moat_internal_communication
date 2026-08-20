import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GlobalExceptionHandler, ErrorResponseBuilder } from '@/lib/errors';
import { RepositoryLayer } from '@/lib/repository/RepositoryLayer';
import crypto from 'crypto';
import { AuditLogService } from '@/lib/security/auditLogService';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    const { data, error } = await repo.execute(
      supabase
        .from('saved_queries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
    );

    return ErrorResponseBuilder.success(data || [], "Saved queries retrieved successfully.");
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Unable to retrieve saved queries.");
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    const body = await request.json();
    const { name, description, search_configuration, normalized_query, project_id } = body;

    if (!name || !search_configuration) {
      return ErrorResponseBuilder.error('Query name and configuration are required.', GlobalExceptionHandler.generateErrorId(), 400);
    }

    // Generate deterministic fingerprint from normalized search configuration
    const fingerprintString = JSON.stringify(search_configuration, Object.keys(search_configuration).sort());
    const fingerprint = crypto.createHash('sha256').update(fingerprintString).digest('hex');

    // 1. Insert saved query
    const { data: savedQuery, error: sqError } = await repo.execute(
      supabase.from('saved_queries').insert({
        user_id: user.id,
        name,
        description,
        search_configuration,
        normalized_query,
        search_fingerprint: fingerprint,
        last_run_at: new Date().toISOString()
      }).select().single()
    );

    // 2. Link to Research Project if provided
    if (project_id) {
      // Verify project ownership implicitly via RLS
      await repo.execute(
        supabase.from('research_project_saved_queries').insert({
          project_id: project_id,
          saved_query_id: savedQuery.id,
          created_by: user.id
        })
      );
    }

    // 3. Audit Log
    const auditLogger = new AuditLogService(supabase);
    await auditLogger.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "SAVED_QUERY_CREATED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
      endpoint: "/api/searches/saved",
      status: "SUCCESS",
      category: "DOCUMENTS",
      action: "CREATE",
      metadata: { saved_query_id: savedQuery.id, project_id }
    }).catch(console.error);

    return ErrorResponseBuilder.success(savedQuery, 'Query saved successfully.', 201);
  } catch (err: any) {
    console.error("API Save Query Error:", err);
    return await GlobalExceptionHandler.handle(err, request, 'Unable to save query at this time.');
  }
}
