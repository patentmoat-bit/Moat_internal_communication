import { POST } from "./src/app/api/ceo/projects/route";

async function test() {
  const req = new Request("http://localhost:3002/api/ceo/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "sample test",
      description: "verification based on moat",
      technical_field: "Ai",
      due_date: "2026-09-13T00:00:00.000Z",
      assigned_to: "",
      status: "NEW",
      metadata: {
        business_objective: "",
        priority: "High"
      }
    })
  });
  
  // Mock getAuthUser
  const res = await POST(req);
  console.log("Status:", res.status);
  const json = await res.json();
  console.log("Response:", json);
}
test();
