import { SignJWT } from "jose";
const secret = new TextEncoder().encode("moat-super-secret-jwt-key-change-me-in-prod-12345");
const token = await new SignJWT({
  sub: "00000000-0000-0000-0000-000000000002",
  jti: "test-jti-123",
  email: "admin@moat.ai",
  role: "Admin",
  name: "System Admin"
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(secret);
console.log(token);
