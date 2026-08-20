

const API_URL = 'http://localhost:3001';

async function runTests() {
  console.log("--- STARTING LOGIN RATE LIMIT TESTS (F-07) ---\n");

  const email = `test-${Date.now()}@example.com`;
  const password = "password123";

  console.log("1. Testing Normal Login (1st attempt)...");
  let res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.1' // simulate an IP
    },
    body: JSON.stringify({ email, password })
  });
  
  let data = await res.json();
  console.log(`Status: ${res.status}, Response:`, data);
  if (res.status !== 429) {
    console.log("✅ Passed: Normal login not rate limited.");
  } else {
    console.log("❌ Failed: Normal login was rate limited.");
    return;
  }

  console.log("\n2. Testing Repeated Failed Logins (IP limit = 10)...");
  // We already did 1 attempt. We will do 10 more to guarantee we cross the threshold of 10.
  let hit429 = false;
  let retryAfter = null;
  
  for (let i = 2; i <= 11; i++) {
    process.stdout.write(`Attempt ${i}... `);
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.1'
      },
      body: JSON.stringify({ email: `different${i}@example.com`, password }) // vary email to test IP limit
    });
    
    if (res.status === 429) {
      hit429 = true;
      retryAfter = res.headers.get('retry-after');
      console.log(`Blocked! (429). Retry-After: ${retryAfter}`);
      break;
    } else {
      console.log(`Status ${res.status}`);
    }
  }

  if (hit429) {
    console.log("✅ Passed: IP rate limit working.");
  } else {
    console.log("❌ Failed: IP rate limit not triggered.");
    return;
  }

  console.log("\n3. Testing Email-Based Protection (Email limit = 5)...");
  // We will use a single email but vary the IP to avoid triggering IP limits.
  const targetEmail = `target-${Date.now()}@example.com`;
  hit429 = false;

  for (let i = 1; i <= 6; i++) {
    process.stdout.write(`Attempt ${i}... `);
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': `10.0.0.${i + 10}` // vary IP
      },
      body: JSON.stringify({ email: targetEmail, password })
    });
    
    if (res.status === 429) {
      hit429 = true;
      retryAfter = res.headers.get('retry-after');
      console.log(`Blocked! (429). Retry-After: ${retryAfter}`);
      break;
    } else {
      console.log(`Status ${res.status}`);
    }
  }

  if (hit429) {
    console.log("✅ Passed: Email rate limit working.");
  } else {
    console.log("❌ Failed: Email rate limit not triggered.");
    return;
  }
  
  console.log("\n4. Verifying No Sensitive Info in Response");
  data = await res.json();
  const dataStr = JSON.stringify(data);
  if (dataStr.includes(password) || dataStr.includes("token")) {
    console.log("❌ Failed: Sensitive info in rate limit response.");
  } else {
    console.log("✅ Passed: No sensitive info exposed.");
  }

  console.log("\n🎉 ALL TESTS PASSED!");
}

runTests().catch(console.error);
