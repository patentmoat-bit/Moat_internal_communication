import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GlobalExceptionHandler, ErrorResponseBuilder } from '@/lib/errors';
import { RepositoryLayer } from '@/lib/repository/RepositoryLayer';
import crypto from 'crypto';
import { AuditLogService } from '@/lib/security/auditLogService';

export async function GET(request: Request, { params }: { params: { id: string } }) {
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
        .eq('id', params.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
    );

    if (!data) {
      return ErrorResponseBuilder.error('Saved query not found.', GlobalExceptionHandler.generateErrorId(), 404);
    }

    return ErrorResponseBuilder.success(data, "Saved query retrieved successfully.");
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Unable to retrieve saved query.");
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    const body = await request.json();
    const { name, description, search_configuration, normalized_query } = body;

    let fingerprint = undefined;
    if (search_configuration) {
      const fingerprintString = JSON.stringify(search_configuration, Object.keys(search_configuration).sort());
      fingerprint = crypto.createHash('sha256').update(fingerprintString).digest('hex');
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (search_configuration !== undefined) updates.search_configuration = search_configuration;
    if (normalized_query !== undefined) updates.normalized_query = normalized_query;
    if (fingerprint !== undefined) updates.search_fingerprint = fingerprint;

    const { data, error } = await repo.execute(
      supabase
        .from('saved_queries')
        .update(updates)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()
    );

    const auditLogger = new AuditLogService(supabase);
    await auditLogger.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "SAVED_QUERY_UPDATED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
      endpoint: `/api/searches/saved/${params.id}`,
      status: "SUCCESS",
      category: "DOCUMENTS",
      action: "UPDATE",
      metadata: { saved_query_id: params.id, updates_keys: Object.keys(updates) }
    }).catch(console.error);

    return ErrorResponseBuilder.success(data, "Saved query updated successfully.");
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Unable to update saved query.");
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    // Soft delete
    await repo.execute(
      supabase
        .from('saved_queries')
        .update({ is_active: false })
        .eq('id', params.id)
        .eq('user_id', user.id)
    );

    const auditLogger = new AuditLogService(supabase);
    await auditLogger.logEvent({
      userId: user.id,
      email: user.email,
      eventType: "SAVED_QUERY_DELETED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
      endpoint: `/api/searches/saved/${params.id}`,
      status: "SUCCESS",
      category: "DOCUMENTS",
      action: "DELETE",
      metadata: { saved_query_id: params.id }
    }).catch(console.error);

    return ErrorResponseBuilder.success(null, "Saved query deleted successfully.");
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Unable to delete saved query.");
  }
}
