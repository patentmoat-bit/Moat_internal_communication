import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  console.log("=== F-03 MULTI-TENANT ISOLATION REGRESSION TEST ===\\n");
  
  const ts = Date.now();
  const emailA = `a-${ts}@example.com`;
  const emailB = `b-${ts}@example.com`;
  const emailC = `c-${ts}@example.com`;
  const password = "Password123!";

  console.log("Setting up Users A, B, and C...");
  const authA = await signUp(emailA, password);
  const authB = await signUp(emailB, password);
  const authC = await signUp(emailC, password);

  const tokenA = authA.access_token;
  const tokenB = authB.access_token;
  const tokenC = authC.access_token;
  const userA = authA.user.id;
  const userB = authB.user.id;

  const inventionId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const trademarkId = crypto.randomUUID();

  // Test A
  console.log("\\n[Test A] User A can create/read own invention");
  await fetchREST('inventions', 'POST', tokenA, { id: inventionId, user_id: userA, title: "Secret A" });
  await fetchREST('patent_projects', 'POST', tokenA, { id: projectId, name: "Proj A", created_by: userA });
  await fetchREST('trademarks', 'POST', tokenA, { id: trademarkId, name: "Mark A", type: "word", created_by: userA, project_id: projectId });
  
  const getARes = await fetchREST(`inventions?id=eq.${inventionId}`, 'GET', tokenA);
  const dataA = await getARes.json();
  if (dataA.length === 0) throw new Error("A cannot read own invention");
  console.log("✅ PASS");

  // Test B & C
  console.log("\\n[Test B & C] User B cannot read User A invention (Direct REST)");
  const getBRes = await fetchREST(`inventions?select=*`, 'GET', tokenB);
  const dataB = await getBRes.json();
  if (dataB.some(i => i.id === inventionId)) throw new Error("❌ FAIL: User B read User A's data!");
  console.log("✅ PASS");

  // Test D
  console.log("\\n[Test D] User B cannot update User A invention");
  await fetchREST(`inventions?id=eq.${inventionId}`, 'PATCH', tokenB, { title: "Hacked" });
  const getA2 = await fetchREST(`inventions?id=eq.${inventionId}`, 'GET', tokenA);
  if ((await getA2.json())[0].title === "Hacked") throw new Error("❌ FAIL: User B updated User A's data!");
  console.log("✅ PASS");

  // Test E
  console.log("\\n[Test E] User B cannot delete User A invention");
  await fetchREST(`inventions?id=eq.${inventionId}`, 'DELETE', tokenB);
  const getA3 = await fetchREST(`inventions?id=eq.${inventionId}`, 'GET', tokenA);
  if ((await getA3.json()).length === 0) throw new Error("❌ FAIL: User B deleted User A's data!");
  console.log("✅ PASS");

  // Test F
  console.log("\\n[Test F] Non-member cannot access project documents");
  const getCRes = await fetchREST(`patent_projects?id=eq.${projectId}`, 'GET', tokenC);
  if ((await getCRes.json()).length > 0) throw new Error("❌ FAIL: C (non-member) read project!");
  console.log("✅ PASS");

  // Test G
  console.log("\\n[Test G] Legitimate project member can access allowed project resources");
  await fetchREST('project_members', 'POST', SERVICE_KEY, { project_id: projectId.toString(), user_id: userB, role: 'member' });
  const getBProj = await fetchREST(`patent_projects?id=eq.${projectId}`, 'GET', tokenB);
  if ((await getBProj.json()).length === 0) {
    console.error("❌ FAIL: User B cannot access project after being added! (Assuming migration applied)");
    process.exit(1); // Fails here until deployed
  }
  console.log("✅ PASS");

  // Test H
  console.log("\\n[Test H] Cross-user storage download is blocked");
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/patent_documents/test.pdf`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${tokenA}` }, body: "dummy"
  });
  const getHRes = await fetch(`${SUPABASE_URL}/storage/v1/object/patent_documents/test.pdf`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  if (getHRes.ok) throw new Error("❌ FAIL: B downloaded A's file!");
  console.log("✅ PASS");

  // Test I
  console.log("\\n[Test I] Authenticated user cannot read another user's trademarks");
  const getTRes = await fetchREST(`trademarks?id=eq.${trademarkId}`, 'GET', tokenC); // token C (non-member)
  if ((await getTRes.json()).length > 0) throw new Error("❌ FAIL: C read A's trademark!");
  console.log("✅ PASS");

  // Test J
  console.log("\\n[Test J] Ownership/project_id hijacking is blocked");
  const hijackRes = await fetchREST('inventions', 'POST', tokenB, { id: crypto.randomUUID(), user_id: userA, title: "Hijack" });
  if (hijackRes.ok) throw new Error("❌ FAIL: B inserted with A's ID!");
  console.log("✅ PASS");

  console.log("\\n🎉 ALL TESTS PASSED!");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
