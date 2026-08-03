import { NextResponse } from "next/server";
import { dispatchAvaForCurrentSession } from "@/lib/session-events";

export async function POST() {
  const dispatched = await dispatchAvaForCurrentSession().catch((error) => {
    console.error("Failed to dispatch Ava after browser join", error);
    return false;
  });

  if (!dispatched) {
    return NextResponse.json({ error: "Ava is temporarily busy. Please try again in about one minute." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
