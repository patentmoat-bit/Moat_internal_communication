import { SignJWT } from "jose";
const secret = new TextEncoder().encode("moat-super-secret-jwt-key-change-me-in-prod-12345");
const token = await new SignJWT({
  sub: "123",
  email: "a.jothika@moat.ai",
  role: "admin",
  jti: "mock-jti"
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("2h")
  .sign(secret);
console.log(token);
