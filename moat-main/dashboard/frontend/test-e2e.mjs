async function run() {
  try {
    const loginRes = await fetch("http://localhost:3002/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jhaldurai@pinochle.ai", password: "jo1122002@" })
    });
    
    let cookies = loginRes.headers.get("set-cookie");
    console.log("Cookies:", cookies);
    
    let mfaToken = "";
    if (cookies) {
      const match = cookies.match(/mfa_verification_token=([^;]+)/);
      if (match) mfaToken = match[1];
    }
    
    let token = "";
    if (mfaToken) {
       console.log("MFA required. Sending MFA request...");
       // Using an override code if implemented, or just 123456
       const mfaRes = await fetch("http://localhost:3002/api/auth/mfa/verify", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Cookie": `mfa_verification_token=${mfaToken}`
         },
         body: JSON.stringify({ code: "111111" }) 
       });
       let mfaCookies = mfaRes.headers.get("set-cookie");
       if (mfaCookies) {
          const m = mfaCookies.match(/custom_access_token=([^;]+)/);
          if (m) token = m[1];
       }
    } else {
       if (cookies) {
         const m = cookies.match(/custom_access_token=([^;]+)/);
         if (m) token = m[1];
       }
    }

    if (!token) {
      console.log("Failed to get token!");
      return;
    }
    
    const postRes = await fetch("http://localhost:3002/api/users", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": `custom_access_token=${token}`
      },
      body: JSON.stringify({
        name: "UI E2E Test",
        email: "uie2e_test@pinochle.ai",
        password: "BackendPassword123!",
        role: "Patent Analyst",
        department: "Engineering"
      })
    });
    
    const data = await postRes.json();
    console.log("POST /api/users Status:", postRes.status);
    console.log("POST /api/users Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
run();
