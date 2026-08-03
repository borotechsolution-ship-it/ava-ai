import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/api\/invite\/([^/]+)\/redeem\/?$/);
  if (!match) return NextResponse.next();

  const inviteUrl = request.nextUrl.clone();
  inviteUrl.pathname = `/invite/${match[1]}`;
  inviteUrl.search = "";
  return NextResponse.redirect(inviteUrl, 303);
}

export const config = {
  matcher: "/api/invite/:token/redeem"
};
