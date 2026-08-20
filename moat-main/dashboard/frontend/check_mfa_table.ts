import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTable() {
  const { data, error } = await supabase.from('mfa_settings').select('count', { count: 'exact' }).limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}

checkTable();
