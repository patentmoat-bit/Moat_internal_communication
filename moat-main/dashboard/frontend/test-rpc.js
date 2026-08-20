const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(url);
  const data = await res.json();
  const paths = Object.keys(data.paths);
  const rpcs = paths.filter(p => p.startsWith('/rpc/'));
  console.log("RPC endpoints:", rpcs);
}
run();
