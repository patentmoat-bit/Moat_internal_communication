const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6ImEuam90aGlrYUBtb2F0LmFpIiwicm9sZSI6ImFkbWluIiwianRpIjoibW9jay1qdGkiLCJleHAiOjE3ODY2MDc2Mzd9.AQb4LRzdHxzNje9lhJCp_bJnC3JGyWHR4tjaYxGdR1Q";
async function run() {
  try {
    const res = await fetch("http://localhost:3002/api/users", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": `custom_access_token=${token}`
      },
      body: JSON.stringify({
        name: "Backend Test",
        email: "backend_test@pinochle.ai",
        password: "BackendPassword123!",
        role: "Patent Analyst",
        department: "Engineering"
      })
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
