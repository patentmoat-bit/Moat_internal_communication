import { SignJWT, jwtVerify } from "jose";

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret.length === 0) {
    // For development fallback. In production, this should throw an error.
    return new TextEncoder().encode("moat-super-secret-jwt-key-change-me-in-prod-12345");
  }
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: any, expiresIn: string) {
  const iat = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresIn)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as any;
  } catch (error) {
    return null;
  }
}
