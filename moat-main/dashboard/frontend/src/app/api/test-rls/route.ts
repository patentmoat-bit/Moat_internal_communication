import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: adminSearches, error: adminError } = await adminClient.from('recent_searches').select('*').limit(5);
  const { data: userSearches, error: userError } = await supabase.from('recent_searches').select('*').limit(5);
  
  return NextResponse.json({
    user,
    adminSearches,
    adminError,
    userSearches,
    userError
  });
}
