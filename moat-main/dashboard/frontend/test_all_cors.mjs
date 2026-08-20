const endpoints = [
  '/api/auth/login',
  '/api/search',
  '/api/patents',
  '/api/trademarks',
  '/api/copyrights',
  '/api/projects',
  '/api/documents',
  '/api/upload',
  '/api/notifications',
  '/api/admin',
  '/api/workflow',
  '/api/ai',
  '/api/reports'
];

const BASE_URL = 'http://localhost:3004';

async function runTests() {
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(BASE_URL + endpoint, {
        method: 'POST',
        headers: {
          'Origin': 'https://malicious-example.com',
          'Cookie': 'custom_access_token=faketoken'
        }
      });
      
      const corsHeader = res.headers.get('Access-Control-Allow-Origin');
      const status = res.status;
      const body = await res.text();
      
      console.log(`[${endpoint}] Status: ${status} | CORS: ${corsHeader} | Body: ${body.substring(0, 50)}`);
    } catch (e) {
      console.log(`[${endpoint}] Error: ${e.message}`);
    }
  }
}

runTests();
