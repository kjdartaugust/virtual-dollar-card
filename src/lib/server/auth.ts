import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const COOKIE = "dola_session";
const secret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || "dev-insecure-secret");

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(
  pw: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

// Sets the web session cookie and returns the token, so native callers (which
// have no cookie jar) can store the same token and send it as a Bearer header.
export async function setSessionCookie(userId: string): Promise<string> {
  const token = await signSession(userId);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

// Returns the authenticated user id, or null if there's no valid session.
// Web clients carry the session in an httpOnly cookie; native clients (the Expo
// app) have no cookie jar and send it as an `Authorization: Bearer` header.
export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const cookieToken = jar.get(COOKIE)?.value;
  if (cookieToken) {
    const uid = await verifyToken(cookieToken);
    if (uid) return uid;
  }
  const auth = (await headers()).get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer) return verifyToken(bearer[1].trim());
  return null;
}
