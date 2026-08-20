import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GlobalExceptionHandler, ErrorResponseBuilder } from '@/lib/errors';
import { RepositoryLayer } from '@/lib/repository/RepositoryLayer';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);
    const authHeader = request.headers.get('Authorization');
    
    // Rely exclusively on Supabase Server Client cookies to identify the user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    const { query, filters, search_type, name, is_saved } = await request.json();

    if (!query) {
      return ErrorResponseBuilder.error('Invalid request parameters provided.', GlobalExceptionHandler.generateErrorId(), 400);
    }

    const normalizedDefinition = {
      query,
      filters: filters || {},
      search_type: search_type || 'hybrid'
    };
    
    // PHASE 4: SEARCH FINGERPRINT
    // Generate deterministic fingerprint from normalized search definition
    const fingerprintString = JSON.stringify(normalizedDefinition, Object.keys(normalizedDefinition).sort());
    const fingerprint = crypto.createHash('sha256').update(fingerprintString).digest('hex');

    const optionsToSave = {
      ...(filters || {}),
      _fingerprint: fingerprint,
      _is_saved: is_saved || false,
      _name: name || undefined,
      last_run_at: new Date().toISOString()
    };
    
    const finalSearchType = is_saved ? 'saved' : (search_type || 'hybrid');

    // PHASE 16: DUPLICATE SEARCH HANDLING
    // Check if an identical search history record already exists for this user
    if (!is_saved) {
      const { data: existing } = await supabase
        .from('recent_searches')
        .select('id, options')
        .eq('user_id', user.id)
        .eq('search_type', finalSearchType)
        .contains('options', { _fingerprint: fingerprint })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (existing) {
        // Update last_run_at while preserving history
        const { data } = await repo.execute(
          supabase.from('recent_searches').update({
            options: { ...existing.options, last_run_at: new Date().toISOString() }
          }).eq('id', existing.id).select().single()
        );
        return ErrorResponseBuilder.success(data, 'Search history updated successfully.');
      }
    }

    // PHASE 3: SEARCH SNAPSHOT
    const { data, error } = await repo.execute(
      supabase.from('recent_searches').insert({
        user_id: user.id,
        query: query,
        search_type: finalSearchType,
        options: optionsToSave
      }).select().single()
    );

    return ErrorResponseBuilder.success(data, is_saved ? 'Query saved successfully.' : 'Search recorded in history.');
  } catch (err: any) {
    console.error("API Save Search Error:", err);
    return await GlobalExceptionHandler.handle(err, request, 'Unable to save query at this time.');
  }
}
