async function test() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@moat.ai", password: "password123" }) // standard mock login
  });
  const loginData = await loginRes.json().catch(()=>({}));
  const token = loginData.session?.access_token || loginData.data?.session?.access_token;
  
  if (!token) {
    console.log("Failed to login:", loginData);
    return;
  }

  const res = await fetch("http://localhost:3000/api/patents/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    body: JSON.stringify({ patent: { patent_number: "US1234567B2", title: "Test", assignee: "Test", filing_date: "2020-01-01", status: "Active" } })
  });
  console.log("Save Patent:", await res.text());

  const searchRes = await fetch("http://localhost:3000/api/searches/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    body: JSON.stringify({ query: "Test", search_type: "hybrid" })
  });
  console.log("Save Search:", await searchRes.text());
}
test();
