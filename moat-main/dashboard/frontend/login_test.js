const res = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@moat.ai", password: "Admin@123!" })
});
const data = await res.json();
console.log("Login Response:", data);
if (data.user) {
  const cookie = res.headers.get("set-cookie");
  const meRes = await fetch("http://localhost:3000/api/auth/me", {
    headers: { "Cookie": cookie || "" }
  });
  const meData = await meRes.json();
  console.log("Me Response:", meData);
}
