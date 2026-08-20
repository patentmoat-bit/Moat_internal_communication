import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import crypto from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function signJwt(payload, expiresInMs) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    exp: now + Math.floor(expiresInMs / 1000),
    iat: now,
    nbf: now
  };

  const encodeB64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url').replace(/=/g, '');
  const unsignedToken = `${encodeB64Url(header)}.${encodeB64Url(jwtPayload)}`;
  
  const jwtSecret = process.env.JWT_SECRET_KEY || 'moat-super-secret-jwt-key-change-me-in-prod-12345';
  const signature = crypto.createHmac('sha256', jwtSecret).update(unsignedToken).digest('base64url').replace(/=/g, '');
  
  return `${unsignedToken}.${signature}`;
}

async function runTests() {
  console.log("=== F-10 INFORMATION DISCLOSURE REGRESSION TEST ===");
  
  const fakeUserId = crypto.randomUUID();
  const jti = crypto.randomUUID();

  await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: fakeUserId,
      email: `test-f10-${Date.now()}@example.com`,
      name: 'F10 Test User',
      is_active: true,
      status: 'Active',
      password_hash: 'dummy'
    })
  });

  const accessToken = signJwt({ sub: fakeUserId, jti, role: "Viewer", email: "test@example.com" }, 15 * 60 * 1000);
  const refreshToken = signJwt({ sub: fakeUserId, jti, type: "refresh" }, 7 * 24 * 60 * 60 * 1000);

  const hashedAccessToken = crypto.createHash('sha256').update(accessToken).digest('hex');
  const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await fetch(`${SUPABASE_URL}/rest/v1/user_sessions`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: fakeUserId,
      jwt_token: hashedAccessToken,
      refresh_token: hashedRefreshToken,
      login_time: new Date().toISOString(),
      status: "Active",
      ip_address: '127.0.0.1',
      device: 'F10-Test-Agent'
    })
  });

  console.log("\\n[1] Testing /api/search with invalid sort column...");
  
  const payload = {
    query: "test",
    searchType: "keyword",
    options: {
      sortBy: "column_that_does_not_exist",
      sortOrder: "asc"
    }
  };

  const res = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const responseText = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${responseText}`);

  const sensitiveTerms = [
    "postgres", "postgresql", "supabase", "relation", "table", "column", 
    "schema", "constraint", "sql", "syntax error", "database", "stack", 
    "/home/", "node_modules", "src/"
  ];

  const lowerResp = responseText.toLowerCase();
  const leaked = sensitiveTerms.filter(term => lowerResp.includes(term.toLowerCase()));

  if (leaked.length > 0) {
    console.error(`❌ F-10 VULNERABILITY FOUND: Leaked terms: ${leaked.join(', ')}`);
    process.exit(1);
  }

  console.log("✅ Success: No sensitive information leaked in response.");
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
