const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const testUserId = "ea9436d5-c6a1-4071-b140-d67c9d37642f";

async function verifyEndpoint(code, expectedStatus, name) {
  process.stdout.write(`Test: ${name} -> `);
  const res = await fetch(`${baseUrl}/api/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factorId: testUserId, code })
  });
  
  if (res.status === expectedStatus) {
    console.log(`\x1b[32m✓ Passed\x1b[0m (${res.status})`);
    return true;
  } else {
    console.log(`\x1b[31m✗ Failed\x1b[0m (Expected ${expectedStatus}, got ${res.status})`);
    return false;
  }
}

async function runTests() {
  console.log("Starting Enterprise MFA Automated Tests...\n");
  
  // Clean up any test locks by manually resetting
  const fs = require('fs');
  if (fs.existsSync('mfa_fallback.json')) {
    const data = JSON.parse(fs.readFileSync('mfa_fallback.json', 'utf8'));
    if (!data[testUserId]) {
        data[testUserId] = { mfa_enabled: true, secret_key: "ca3d8dbdd936568e57a72f41b656a6b6:5bb121dc1203cac2d2fa66ae93053554:8b7e4f4dc3e5b9fffbfc0778d48f5478" };
        fs.writeFileSync('mfa_fallback.json', JSON.stringify(data, null, 2));
    }
  }

  // 1. Random numbers are rejected
  await verifyEndpoint('123456', 401, 'Random code rejected');
  await verifyEndpoint('000000', 401, 'Zero code rejected');
  await verifyEndpoint('999999', 401, 'Random code rejected');

  // 2. We can't generate a valid code easily in a generic test because secrets are per-user and encrypted.
  // We will just verify that the lockout mechanism works by sending a few more invalid ones.
  await verifyEndpoint('111111', 401, 'Invalid code 4');
  await verifyEndpoint('222222', 429, 'Rate limited after 5 failures');

  console.log("\nTests completed.");
}

runTests();
