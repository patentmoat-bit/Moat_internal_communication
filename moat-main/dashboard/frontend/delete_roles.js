require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  
  const res = await fetch(`${url}/rest/v1/roles?select=id,role_name`, { headers });
  const data = await res.json();
  console.log("Current Roles:", data);
  
  const rolesToDelete = ["CTO", "CIO", "Viewer", "R&D Manager", "Legal Counsel"];
  const idsToDelete = data.filter(r => rolesToDelete.includes(r.role_name)).map(r => r.id);
  
  console.log("Deleting IDs:", idsToDelete);
  
  if (idsToDelete.length > 0) {
    const delRes = await fetch(`${url}/rest/v1/roles?id=in.(${idsToDelete.join(',')})`, { 
      method: 'DELETE', 
      headers 
    });
    console.log("Delete status:", delRes.status, delRes.statusText);
  }
}

main();
