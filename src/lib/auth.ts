import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-change-this-secret");
export type Session = { userId: string; role: "CUSTOMER" | "ADMIN"; profileComplete: boolean };

export async function createSession(value: Session) {
  const token = await new SignJWT(value).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  (await cookies()).set("nova_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 604800 });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get("nova_session")?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret())).payload as unknown as Session; } catch { return null; }
}

export async function requireUser(requireProfile = true) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (requireProfile && !session.profileComplete) redirect("/complete-profile");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}
