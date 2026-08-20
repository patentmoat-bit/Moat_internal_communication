async function run() {
  try {
    console.log("Hitting localhost:3000/api/auth/login");
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jhaldurai@pinochle.ai", password: "jo1122002@" })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();
