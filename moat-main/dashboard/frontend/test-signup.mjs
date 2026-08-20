import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'http://localhost:3001';

async function runTests() {
  console.log("--- STARTING TESTS ---\n");

  // 1. Test No-Token Signup
  console.log("1. Testing No-Token Signup...");
  const res1 = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: "Test", password: "password123" })
  });
  const data1 = await res1.json();
  console.log(`Status: ${res1.status}`);
  console.log(`Response:`, data1);
  if (res1.status === 403 && data1.error === "Self-registration is not available.") {
    console.log("✅ Passed: No-token signup correctly rejected.\n");
  } else {
    console.log("❌ Failed: No-token signup was not correctly rejected.\n");
  }

  // 2. Test Invalid Token
  console.log("2. Testing Invalid Token Signup...");
  const res2 = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: "Test", password: "password123", token: "invalid_token" })
  });
  const data2 = await res2.json();
  console.log(`Status: ${res2.status}`);
  console.log(`Response:`, data2);
  if (res2.status === 403 && data2.error === "Invitation is invalid or expired.") {
    console.log("✅ Passed: Invalid token correctly rejected.\n");
  } else {
    console.log("❌ Failed: Invalid token was not correctly rejected.\n");
  }

  // 3. Test Valid Token
  console.log("3. Creating a valid invitation...");
  const email = `test-${Date.now()}@example.com`;
  
  // Get a role ID for Patent Analyst using fetch
  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/roles?role_name=eq.Patent%20Analyst&select=id`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const roleDataList = await roleRes.json();
  const roleData = roleDataList[0];
  if (!roleData) {
    console.log("❌ Failed to get role ID.");
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/user_invitations`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      email,
      role_id: roleData.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      invited_by: "00000000-0000-0000-0000-000000000000" // Mock admin ID
    })
  });

  if (!insertRes.ok) {
    console.log("❌ Failed to insert invitation:", await insertRes.text());
    return;
  }
  console.log(`✅ Invitation created for ${email}`);

  // Test GET /api/auth/invitation
  console.log("\n4. Testing GET /api/auth/invitation (simulate page load)...");
  const res3 = await fetch(`${API_URL}/api/auth/invitation?token=${rawToken}`);
  const data3 = await res3.json();
  console.log(`Status: ${res3.status}`);
  console.log(`Response:`, data3);
  if (res3.status === 200 && data3.email === email) {
    console.log("✅ Passed: Invitation successfully validated.\n");
  } else {
    console.log("❌ Failed to validate invitation.\n");
  }

  // Complete Signup with valid token
  console.log("5. Testing valid signup (consuming token)...");
  const res4 = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: "Valid User", password: "password123!", token: rawToken })
  });
  const data4 = await res4.json();
  console.log(`Status: ${res4.status}`);
  console.log(`Response:`, data4);
  if (res4.status === 200 && data4.success) {
    console.log("✅ Passed: Signup succeeded.\n");
  } else {
    console.log("❌ Failed: Signup did not succeed.\n");
  }

  // 6. Test Reuse Prevention
  console.log("6. Testing token reuse prevention...");
  const res5 = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: "Hacker User", password: "password123!", token: rawToken })
  });
  const data5 = await res5.json();
  console.log(`Status: ${res5.status}`);
  console.log(`Response:`, data5);
  if (res5.status === 403 && data5.error === "Invitation is invalid or expired.") {
    console.log("✅ Passed: Token reuse correctly blocked.\n");
  } else {
    console.log("❌ Failed: Token reuse was not blocked.\n");
  }

  console.log("--- TESTS COMPLETED ---");
}

runTests();
