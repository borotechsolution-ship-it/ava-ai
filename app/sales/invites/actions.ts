"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createInvite, replaceInvite, revokeInvite } from "@/lib/invites";
import { getSalesAccount } from "@/lib/sales-auth";
import { config } from "@/lib/config";
import { LATEST_INVITE_COOKIE } from "@/lib/sales-flash";
import type { SalesAccount } from "@/lib/types";

async function requireSales(): Promise<SalesAccount> {
  const account = await getSalesAccount();
  if (!account) redirect("/sales/login");
  return account;
}

async function setLatestInviteUrl(url: string) {
  const cookieStore = await cookies();
  cookieStore.set(LATEST_INVITE_COOKIE, url, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 3,
    path: "/sales/invites"
  });
}

export async function createInviteAction(formData: FormData) {
  const account = await requireSales();

  const result = await createInvite({
    prospectName: String(formData.get("prospectName") || ""),
    companyName: String(formData.get("companyName") || ""),
    industry: String(formData.get("industry") || ""),
    prospectEmail: String(formData.get("prospectEmail") || "") || undefined,
    expiryHours: Number(formData.get("expiryHours") || config.defaultExpiryHours),
    maxSessions: Number(formData.get("maxSessions") || config.defaultMaxSessions),
    salesAccountId: account.id,
    createdBy: account.display_name
  });

  await setLatestInviteUrl(result.url);
  redirect("/sales/invites");
}

export async function revokeInviteAction(formData: FormData) {
  const account = await requireSales();
  await revokeInvite(String(formData.get("id") || ""), account.id);
  revalidatePath("/sales/invites");
}

export async function replaceInviteAction(formData: FormData) {
  const account = await requireSales();
  const result = await replaceInvite(String(formData.get("id") || ""), account.id);
  await setLatestInviteUrl(result.url);
  redirect("/sales/invites");
}
