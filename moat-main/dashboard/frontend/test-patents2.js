async function test() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@moat.ai", password: "password123!" }) // Correct password?? What is the default mock? wait, it uses Supabase auth. 
  });
  const loginData = await loginRes.json().catch(()=>({}));
  console.log("Login res:", loginData);
}
test();
