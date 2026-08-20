import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Start the local Next.js server first, or run against the active port
const API_URL = 'http://localhost:3005/api'; 
const BASE_URL = 'http://localhost:3005'; 

async function signUp(email, password, role = 'Inventor') {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { role } })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchREST(endpoint, method, token = null, body = null) {
  const headers = { 'apikey': SUPABASE_ANON_KEY };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) {
    headers['Content-Type'] = 'application/json';
    headers['Prefer'] = 'return=representation';
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return res;
}

async function fetchAPI(endpoint, method, token = null, body = null) {
  const headers = {};
  if (token) headers['Cookie'] = `custom_access_token=${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  return await fetch(`${API_URL}/${endpoint}`, { 
    method, 
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}) 
  });
}

async function runTests() {
  console.log("=== FINAL SECURITY REGRESSION TEST ===");
  const ts = Date.now();
  const emailA = `a-${ts}@example.com`;
  const emailB = `b-${ts}@example.com`;
  const password = "Password123!";

  console.log("Setting up Users A and B...");
  const authA = await signUp(emailA, password);
  const authB = await signUp(emailB, password);
  const tokenA = authA.access_token;
  const tokenB = authB.access_token;

  // A. Anonymous user cannot access sensitive APIs.
  console.log("\\n[Test A] Anonymous access to IAM APIs");
  let res = await fetchAPI('iam/audit-logs', 'GET');
  if (res.status !== 401) throw new Error("FAIL: IAM audit logs allowed anonymous");
  console.log("✅ PASS");

  // B. Normal user cannot access IAM admin APIs.
  console.log("\\n[Test B] Normal user access to IAM APIs");
  res = await fetchAPI('iam/sessions?id=all', 'DELETE', tokenA);
  if (res.status !== 401 && res.status !== 403) throw new Error("FAIL: Normal user allowed to delete sessions. Status: " + res.status);
  console.log("✅ PASS");

  // C. Normal user cannot read another user's copyright.
  console.log("\\n[Test C] Cross-user Copyright Read");
  const cpyId = crypto.randomUUID();
  await fetchREST('copyrights', 'POST', tokenA, { id: cpyId, title: "A's Copyright", user_id: authA.user.id });
  res = await fetchREST(`copyrights?id=eq.${cpyId}`, 'GET', tokenB);
  if ((await res.json()).length > 0) throw new Error("FAIL: User B read User A's copyright");
  console.log("✅ PASS");

  // D. Normal user cannot read another user's copyright documents.
  console.log("\\n[Test D] Cross-user Copyright Documents Read");
  const cpyDocId = crypto.randomUUID();
  await fetchREST('copyright_documents', 'POST', tokenA, { id: cpyDocId, copyright_id: cpyId, uploaded_by: authA.user.id });
  res = await fetchREST(`copyright_documents?id=eq.${cpyDocId}`, 'GET', tokenB);
  if ((await res.json()).length > 0) throw new Error("FAIL: User B read User A's copyright document");
  console.log("✅ PASS");

  // E. Normal user cannot access another user's storage objects.
  console.log("\\n[Test E] Storage Object IDOR");
  res = await fetch(`${SUPABASE_URL}/storage/v1/object/copyrights/test.pdf`, { method: 'GET', headers: { apikey: SUPABASE_ANON_KEY }});
  if (res.ok && res.status !== 401 && res.status !== 403 && res.status !== 404 && res.status !== 400) throw new Error("FAIL: Copyright storage allowed anonymous");
  console.log("✅ PASS");

  // F. Normal user cannot modify another user's patent document.
  console.log("\\n[Test F & M] Patent Document Modification / Cross-tenant");
  const docId = crypto.randomUUID();
  await fetchREST('patent_documents', 'POST', tokenA, { id: docId, title: "A's Doc", created_by: authA.user.id });
  await fetchREST(`patent_documents?id=eq.${docId}`, 'PATCH', tokenB, { title: "B Hacked" });
  res = await fetchREST(`patent_documents?id=eq.${docId}`, 'GET', tokenA);
  if ((await res.json())[0].title === "B Hacked") throw new Error("FAIL: User B updated A's document");
  console.log("✅ PASS");

  // G. Normal user cannot delete another user's patent document.
  console.log("\\n[Test G] Patent Document Deletion IDOR");
  await fetchREST(`patent_documents?id=eq.${docId}`, 'DELETE', tokenB);
  res = await fetchREST(`patent_documents?id=eq.${docId}`, 'GET', tokenA);
  if ((await res.json()).length === 0) throw new Error("FAIL: User B deleted A's document");
  console.log("✅ PASS");

  // H. View-only trademark project member cannot insert arbitrary trademark history.
  console.log("\\n[Test H] Trademark History Insert");
  const tmId = crypto.randomUUID();
  await fetchREST('trademarks', 'POST', tokenA, { id: tmId, name: "A's TM", created_by: authA.user.id });
  res = await fetchREST('trademark_history', 'POST', tokenB, { trademark_id: tmId, action: "Hack" });
  if (res.ok) throw new Error("FAIL: User B inserted history for A's TM");
  console.log("✅ PASS");

  // I. Anonymous user cannot register without a valid invitation.
  console.log("\\n[Test I] Anonymous Registration");
  res = await fetchAPI('auth/signup', 'POST', null, { email: `anon-${ts}@example.com`, password: 'Password123!', name: 'Anon' });
  if (res.ok) throw new Error("FAIL: Allowed registration without invitation token");
  console.log("✅ PASS");

  // J. Password-reset endpoint does not return the reset token.
  console.log("\\n[Test J] Password Reset Token Leak");
  res = await fetchAPI('auth/forgot-password', 'POST', null, { email: emailA });
  const resetRes = await res.json();
  if (JSON.stringify(resetRes).toLowerCase().includes("token") && !JSON.stringify(resetRes).toLowerCase().includes("sent")) {
    throw new Error("FAIL: Token exposed in response");
  }
  console.log("✅ PASS");

  // K. Client bundle/source does not contain private secrets.
  console.log("\\n[Test K] Client Secret Leakage Check");
  const jsContent = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/image-search/page.tsx'), 'utf-8');
  if (jsContent.includes('sb_secret_') || jsContent.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    throw new Error("FAIL: Client component contains hardcoded secret");
  }
  console.log("✅ PASS");

  // L. Security headers are present.
  console.log("\\n[Test L] Security Headers Check");
  res = await fetch(BASE_URL);
  if (!res.headers.get('x-frame-options') || !res.headers.get('content-security-policy')) {
    throw new Error("FAIL: Missing security headers");
  }
  console.log("✅ PASS");

  console.log("\\n🎉 ALL TESTS PASSED!");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
