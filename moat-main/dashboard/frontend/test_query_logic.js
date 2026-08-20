const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Mock the route handler environment
const mockSupabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function testQuery() {
  const query = 'Title, Abstract, Claims (TAC): "battery"';
  let dbQuery = mockSupabase.from("patent_search").select("id", { count: "exact" });
  
  const searchString = query;
  const cleanString = searchString.replace(/[^\w\s-]/g, " ");
  console.log("cleanString:", cleanString);
  const terms = cleanString
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => `'${t}'`)
    .join(" | ");
    
  console.log("terms:", terms);
  if (terms) {
    dbQuery = dbQuery.textSearch("fts", terms);
  }
  
  const { data, error, count } = await dbQuery.limit(5);
  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log("Success! Found records:", count);
  }
}
testQuery();
