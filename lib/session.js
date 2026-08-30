import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "reelroom_session";
const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

if (process.env.NODE_ENV === "production" && SECRET === "dev-secret-change-me") {
  console.warn(
    "[reelroom] SESSION_SECRET is not set. Set a long random value in production."
  );
}

// Call only from a Server Action or Route Handler.
export async function createSessionCookie(user) {
  const token = jwt.sign({ email: user.email, role: user.role }, SECRET, {
    expiresIn: "30d",
  });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

// Call only from a Server Action or Route Handler.
export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

// Safe to call from any Server Component, Server Action, or Route Handler.
export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
