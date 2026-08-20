const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function verifyHeaders(url) {
  console.log(`\nVerifying F-08 Headers for ${url}`);
  
  let res;
  try {
    res = await fetch(url);
  } catch (error) {
    console.error(`❌ FAIL: Could not connect to ${url}`);
    process.exit(1);
  }

  const headers = res.headers;

  const requiredHeaders = {
    'content-security-policy': 'Content-Security-Policy',
    'x-frame-options': 'X-Frame-Options',
    'x-content-type-options': 'X-Content-Type-Options',
    'strict-transport-security': 'Strict-Transport-Security',
    'referrer-policy': 'Referrer-Policy',
    'permissions-policy': 'Permissions-Policy'
  };

  let allPassed = true;

  for (const [lower, display] of Object.entries(requiredHeaders)) {
    const value = headers.get(lower);
    if (!value) {
      console.error(`❌ FAIL: Missing ${display}`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: ${display} = ${value.substring(0, 70)}${value.length > 70 ? '...' : ''}`);
    }
  }

  // Exact checks
  const xFrame = headers.get('x-frame-options');
  if (xFrame !== 'DENY') {
    console.error(`❌ FAIL: X-Frame-Options should be DENY, got ${xFrame}`);
    allPassed = false;
  }

  const xContentType = headers.get('x-content-type-options');
  if (xContentType !== 'nosniff') {
    console.error(`❌ FAIL: X-Content-Type-Options should be nosniff, got ${xContentType}`);
    allPassed = false;
  }

  const csp = headers.get('content-security-policy') || '';
  if (!csp.includes("object-src 'none'")) {
    console.error(`❌ FAIL: CSP missing object-src 'none'`);
    allPassed = false;
  }
  if (!csp.includes("frame-ancestors 'none'")) {
    console.error(`❌ FAIL: CSP missing frame-ancestors 'none'`);
    allPassed = false;
  }
  if (!csp.includes("base-uri 'self'")) {
    console.error(`❌ FAIL: CSP missing base-uri 'self'`);
    allPassed = false;
  }
  if (csp.includes("'unsafe-eval'")) {
    console.error(`❌ FAIL: CSP contains 'unsafe-eval' in production`);
    allPassed = false;
  }

  // Check for duplicates
  const cspHeaders = res.raw ? res.raw.headers['content-security-policy'] : null;
  if (Array.isArray(cspHeaders) && cspHeaders.length > 1) {
    console.error(`❌ FAIL: Duplicate Content-Security-Policy headers found`);
    allPassed = false;
  }

  if (allPassed) {
    console.log(`🎉 ALL HEADER TESTS PASSED for ${url}`);
  } else {
    console.error(`⚠️ SOME HEADER TESTS FAILED for ${url}`);
    process.exit(1);
  }
}

async function runTests() {
  await verifyHeaders(`${baseUrl}/login`);
  await verifyHeaders(`${baseUrl}/api/auth/login`);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e.message);
  process.exit(1);
});
