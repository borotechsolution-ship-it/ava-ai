import { cookies } from "next/headers";
import { hmacSha256, safeEqual, sha256 } from "@/lib/crypto";
import { config } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase";
import type { SalesAccount } from "@/lib/types";

const COOKIE = "sales_account_auth";

function authSecret() {
  const secret = process.env.SALES_AUTH_SECRET || process.env.INVITE_TOKEN_ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || config.salesPassword;
  if (!secret) throw new Error("Missing SALES_AUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY");
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

export async function authenticateSalesAccount(loginSlug: string, password: string) {
  const cleanSlug = loginSlug.trim().toLowerCase();
  const account = cleanSlug ? await findSalesAccount(cleanSlug) : null;
  if (!account) return null;

  const passwordHash = sha256(password);
  if (!safeEqual(passwordHash, account.password_hash)) return null;

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
