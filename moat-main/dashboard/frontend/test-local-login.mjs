async function run() {
  const res = await fetch("http://localhost:3002/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nmahalingam@pinochle.ai",
      password: "Financemoat123@"
    })
  });
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}
run();
