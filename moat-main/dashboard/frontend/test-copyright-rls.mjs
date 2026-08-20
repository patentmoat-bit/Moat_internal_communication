import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function signUp(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchREST(endpoint, method, token, body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json', 'Prefer': 'return=representation' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return res;
}

async function runTests() {
  console.log("=== COPYRIGHT RLS SECURITY REGRESSION TEST ===\\n");
  
  const ts = Date.now();
  const emailA = `a-${ts}@example.com`;
  const emailB = `b-${ts}@example.com`;
  const password = "Password123!";

  console.log("Setting up Users A and B...");
  const authA = await signUp(emailA, password);
  const authB = await signUp(emailB, password);

  const tokenA = authA.access_token;
  const tokenB = authB.access_token;
  const userA = authA.user.id;
  const userB = authB.user.id;

  const copyrightId = crypto.randomUUID();
  const documentId = crypto.randomUUID();

  // Test A: User A creates and reads own data
  console.log("\\n[Test A] User A can create/read own copyright and document");
  await fetchREST('copyrights', 'POST', tokenA, { id: copyrightId, user_id: userA, product_name: "Copy A" });
  await fetchREST('copyright_documents', 'POST', tokenA, { id: documentId, copyright_id: copyrightId, file_name: "doc A", storage_path: "/path", uploaded_by: userA });
  
  const getARes = await fetchREST(`copyrights?id=eq.${copyrightId}`, 'GET', tokenA);
  if ((await getARes.json()).length === 0) throw new Error("A cannot read own copyright");

  const getDocARes = await fetchREST(`copyright_documents?id=eq.${documentId}`, 'GET', tokenA);
  if ((await getDocARes.json()).length === 0) throw new Error("A cannot read own document");
  console.log("✅ PASS");

  // Test B: User B cannot read User A's data
  console.log("\\n[Test B] User B cannot read User A's copyright/document");
  const getBRes = await fetchREST(`copyrights?id=eq.${copyrightId}`, 'GET', tokenB);
  if ((await getBRes.json()).length > 0) throw new Error("❌ FAIL: User B read User A's copyright!");
  
  const getDocBRes = await fetchREST(`copyright_documents?id=eq.${documentId}`, 'GET', tokenB);
  if ((await getDocBRes.json()).length > 0) throw new Error("❌ FAIL: User B read User A's document!");
  console.log("✅ PASS");

  // Test C: User B cannot hijack/update User A's data
  console.log("\\n[Test C] User B cannot update User A's data");
  await fetchREST(`copyrights?id=eq.${copyrightId}`, 'PATCH', tokenB, { product_name: "Hacked" });
  const getA2 = await fetchREST(`copyrights?id=eq.${copyrightId}`, 'GET', tokenA);
  if ((await getA2.json())[0].product_name === "Hacked") throw new Error("❌ FAIL: User B updated User A's data!");
  console.log("✅ PASS");

  // Test D: IDOR - User B cannot create document referencing User A's copyright
  console.log("\\n[Test D] User B cannot insert document linking to A's copyright");
  const hackDocRes = await fetchREST('copyright_documents', 'POST', tokenB, { id: crypto.randomUUID(), copyright_id: copyrightId, file_name: "Hack", storage_path: "/hack", uploaded_by: userB });
  if (hackDocRes.ok) throw new Error("❌ FAIL: User B attached a document to User A's copyright!");
  console.log("✅ PASS");

  console.log("\\n🎉 ALL TESTS PASSED!");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
