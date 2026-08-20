import { SignJWT } from "jose";

const secret = new TextEncoder().encode("moat-super-secret-jwt-key-change-me-in-prod-12345");
const token = await new SignJWT({
  sub: "90abf51f-725e-439b-8a8f-741577bd92f5",
  jti: "test-jti-456",
  email: "nmahalingam@pinochle.ai",
  role: "Finance Manager",
  name: "Navaneethakris..."
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(secret);

console.log("Token:", token);

const res = await fetch("http://localhost:3001/api/finance", {
  headers: {
    "Cookie": `custom_access_token=${token}`
  }
});

console.log("Status:", res.status);
const json = await res.json();
console.log("Response:", JSON.stringify(json, null, 2));
