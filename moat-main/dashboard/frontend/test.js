require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: user } = await supabase.from('users').select('id').limit(1).single();
  const userId = user ? user.id : 'b0000000-0000-0000-0000-000000000000'; // fallback
  
  const patent = {
    patent_number: 'TEST_MANUAL',
    title: 'Test',
    assignee: 'Unknown',
    inventors: [],
    filing_date: new Date().toISOString(),
    publication_date: new Date().toISOString(),
    status: 'Unknown',
    abstract: 'Test',
    ipc_codes: [],
    cpc_codes: [],
    jurisdiction: 'US',
    citations: 0,
    ai_match_score: 80,
    raw_data: {}
  };

  const { data, error } = await supabase.from('saved_patents').upsert({
    user_id: userId,
    ...patent
  }, { onConflict: 'user_id,patent_number' }).select().single();

  console.log("Error:", error);
  console.log("Data:", data);
}

test();
