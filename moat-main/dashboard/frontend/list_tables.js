require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('recent_searches').select('*').limit(1);
  console.log("recent_searches columns:", data ? Object.keys(data[0] || {}) : error);
  
  const { data: ps, error: psErr } = await supabase.from('project_searches').select('*').limit(1);
  console.log("project_searches columns:", ps ? Object.keys(ps[0] || {}) : psErr);
  
  const { data: rps, error: rpsErr } = await supabase.from('research_project_searches').select('*').limit(1);
  console.log("research_project_searches columns:", rps ? Object.keys(rps[0] || {}) : rpsErr);
}

test();
