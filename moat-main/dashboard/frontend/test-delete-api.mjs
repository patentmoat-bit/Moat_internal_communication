async function run() {
  console.log("Testing DELETE /api/users/[id]...");
  const res = await fetch("http://localhost:3000/api/users/00000000-0000-0000-0000-000000000000", {
    method: "DELETE"
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text);
}
run();
