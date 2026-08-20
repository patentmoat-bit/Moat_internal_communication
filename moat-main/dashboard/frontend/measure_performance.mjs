const BASE_URL = 'http://localhost:3004';

async function measureLatency(url, method = 'GET', body = null, headers = {}) {
  const start = performance.now();
  const res = await fetch(BASE_URL + url, {
    method,
    body: body ? JSON.stringify(body) : null,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
  await res.text();
  const end = performance.now();
  return end - start;
}

async function run() {
  console.log('Measuring /api/auth/login latency...');
  const loginLatencies = [];
  for (let i = 0; i < 5; i++) {
    const lat = await measureLatency('/api/auth/login', 'POST', { email: 'admin@moat.com', password: 'wrong' });
    loginLatencies.push(lat);
  }
  const avgLogin = loginLatencies.reduce((a, b) => a + b) / loginLatencies.length;
  console.log(`Avg Login (Failed): ${avgLogin.toFixed(2)}ms`);
}

run();
