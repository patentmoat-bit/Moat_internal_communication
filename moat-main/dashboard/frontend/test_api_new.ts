import { POST } from "./src/app/api/ceo/projects/route";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Mock getAuthUser by patching the cookies module
jest.mock("next/headers", () => ({
  cookies: () => ({
    get: () => ({ value: "mock-token" })
  })
}));

jest.mock("@/lib/jwt", () => ({
  verifyToken: async () => ({
    sub: "8b9caff9-b91e-43c0-854c-58cdd8ede223",
    role: "CEO"
  })
}));

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
  
  const res = await POST(req);
  console.log("Status:", res.status);
  const json = await res.json();
  console.log("Response:", json);
}

test().catch(console.error);
