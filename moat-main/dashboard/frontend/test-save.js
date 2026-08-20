async function test() {
  const res = await fetch("http://localhost:3000/api/searches/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "Test", search_type: "hybrid" })
  });
  console.log(await res.text());
}
test();
