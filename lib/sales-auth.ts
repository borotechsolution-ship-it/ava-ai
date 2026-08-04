import { cookies } from "next/headers";
import { hmacSha256, safeEqual, verifyPasswordHash } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase";
import type { SalesAccount } from "@/lib/types";

const COOKIE = "sales_account_auth";
const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_FAILURE_LIMIT = 5;

function authSecret() {
  const secret = process.env.SALES_AUTH_SECRET;
  if (!secret) throw new Error("Missing SALES_AUTH_SECRET");
  return secret;
}

function signSalesCookie(account: Pick<SalesAccount, "id" | "password_hash">) {
  return hmacSha256(`${account.id}:${account.password_hash}`, authSecret());
}

function encodeSalesCookie(account: Pick<SalesAccount, "id" | "password_hash">) {
  return `${account.id}.${signSalesCookie(account)}`;
}

async function findSalesAccount(loginSlug: string) {
  const { data, error } = await supabaseAdmin()
    .from("sales_accounts")
    .select("id,login_slug,display_name,password_hash,gemini_key_slot,active")
    .eq("login_slug", loginSlug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return data as SalesAccount | null;
}

async function isLoginLocked(loginSlug: string, ipAddress: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin()
    .from("sales_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("login_slug", loginSlug)
    .eq("ip_address", ipAddress)
    .eq("success", false)
    .gte("created_at", since);

  if (error) {
    console.error("Could not check sales login attempts", error);
    return false;
  }

  return (count || 0) >= LOGIN_FAILURE_LIMIT;
}

async function recordLoginAttempt(loginSlug: string, ipAddress: string, success: boolean) {
  const { error } = await supabaseAdmin()
    .from("sales_login_attempts")
    .insert({ login_slug: loginSlug, ip_address: ipAddress, success });

  if (error) {
    console.error("Could not record sales login attempt", error);
  }
}

export async function authenticateSalesAccount(loginSlug: string, password: string, ipAddress = "unknown") {
  const cleanSlug = loginSlug.trim().toLowerCase();
  if (!cleanSlug) return null;
  if (await isLoginLocked(cleanSlug, ipAddress)) return null;

  const account = cleanSlug ? await findSalesAccount(cleanSlug) : null;
  if (!account) {
    await recordLoginAttempt(cleanSlug, ipAddress, false);
    return null;
  }

  if (!verifyPasswordHash(password, account.password_hash)) {
    await recordLoginAttempt(cleanSlug, ipAddress, false);
    return null;
  }

  await recordLoginAttempt(cleanSlug, ipAddress, true);
  return account;
}

export async function getSalesAccount() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE)?.value || "";
  const [accountId, signature] = cookie.split(".");
  if (!accountId || !signature) return null;

  const { data, error } = await supabaseAdmin()
    .from("sales_accounts")
    .select("id,login_slug,display_name,password_hash,gemini_key_slot,active")
    .eq("id", accountId)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  const account = data as SalesAccount | null;
  if (!account) return null;

  const expected = signSalesCookie(account);
  return safeEqual(signature, expected) ? account : null;
}

export async function isSalesAuthorized() {
  return Boolean(await getSalesAccount());
}

export async function setSalesCookie(account: Pick<SalesAccount, "id" | "password_hash">) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, encodeSalesCookie(account), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/sales"
  });
}
