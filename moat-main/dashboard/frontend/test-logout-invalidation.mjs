import * as crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'moat-super-secret-jwt-key-change-me-in-prod-12345';

// Quick base64url encode function for JWT
function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, expiresInMs) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(expiresInMs / 1000);
  const fullPayload = { ...payload, iat: now, exp };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));

  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function runTests() {
  console.log("=== F-09 Regression Test ===");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials for test setup.");
    process.exit(1);
  }

  // 1. Create a fake user and session directly via Supabase REST
  console.log("\n[1] Seeding test session...");
  const fakeUserId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Insert user
  const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      id: fakeUserId,
      email: `test-f09-${Date.now()}@example.com`,
      name: 'F09 Test User',
      is_active: true,
      status: 'Active',
      password_hash: 'dummy' // Not used
    })
  });

  if (!userRes.ok) {
    console.error("Failed to insert fake user:", await userRes.text());
    process.exit(1);
  }

  // Create JWT tokens locally
  const accessToken = signJwt({ sub: fakeUserId, jti, role: "Viewer", email: "test@example.com" }, 15 * 60 * 1000);
  const refreshToken = signJwt({ sub: fakeUserId, jti, type: "refresh" }, 7 * 24 * 60 * 60 * 1000);

  const hashedAccessToken = crypto.createHash('sha256').update(accessToken).digest('hex');
  const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Insert session
  const sessionRes = await fetch(`${SUPABASE_URL}/rest/v1/user_sessions`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      user_id: fakeUserId,
      jwt_token: hashedAccessToken,
      refresh_token: hashedRefreshToken,
      login_time: new Date().toISOString(),
      status: "Active",
      ip_address: '127.0.0.1',
      device: 'F09-Test-Agent'
    })
  });

  console.log("✅ Seeded user and session. Captured Access Token and Refresh Token.");

  // 2. Test protected API before logout
  console.log("\n[2] Testing protected API (/api/auth/me) BEFORE logout...");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!meRes.ok) {
    console.error(`❌ Expected 200 OK before logout, got ${meRes.status}`);
    const errText = await meRes.text();
    console.error("Response:", errText);
    process.exit(1);
  }
  console.log("✅ Protected API accessible with token.");

  // 3. Logout
  console.log("\n[3] Logging out...");
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!logoutRes.ok) {
    console.error(`❌ Logout failed: ${logoutRes.status}`);
    process.exit(1);
  }
  console.log("✅ Logout successful.");

  // 4. Test protected API AFTER logout using EXACT same access token
  console.log("\n[4] Testing protected API (/api/auth/me) AFTER logout with old token...");
  const meAfterRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (meAfterRes.ok) {
    console.error(`❌ F-09 VULNERABILITY FOUND: Old access token is still valid after logout!`);
    process.exit(1);
  }
  console.log(`✅ Server properly rejected old access token. Status: ${meAfterRes.status}`);

  // 5. Test refresh AFTER logout using EXACT same refresh token
  console.log("\n[5] Testing /api/auth/refresh AFTER logout with old refresh token...");
  const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Cookie': `custom_refresh_token=${refreshToken}` }
  });

  if (refreshRes.ok) {
    console.error(`❌ F-09 VULNERABILITY FOUND: Old refresh token is still valid after logout!`);
    process.exit(1);
  }
  console.log(`✅ Server properly rejected old refresh token. Status: ${refreshRes.status}`);

  console.log("\n🎉 ALL F-09 REGRESSION TESTS PASSED! Session is fully invalidated server-side.");

  // Cleanup fake user (cascade will delete session)
  await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${fakeUserId}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
