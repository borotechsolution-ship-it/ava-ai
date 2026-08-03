import { cookies } from "next/headers";
import { config } from "@/lib/config";

export const DEMO_COOKIE = "demo_session";

export async function setDemoCookie(value: string) {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: config.reconnectGraceSeconds,
    path: "/"
  });
}

export async function getDemoCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_COOKIE)?.value || "";
}
