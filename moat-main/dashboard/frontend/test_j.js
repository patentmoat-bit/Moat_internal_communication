import { SignJWT } from "jose";
const secret = new TextEncoder().encode("moat-super-secret-jwt-key-change-me-in-prod-12345");
const token = await new SignJWT({
  sub: "501e17a4-191c-47f0-8cef-a1c076c0dcd7",
  jti: "test-jti-12345",
  email: "jhaldurai@pinochle.ai",
  role: "Super Admin",
  name: "Admin"
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(secret);
console.log(token);
