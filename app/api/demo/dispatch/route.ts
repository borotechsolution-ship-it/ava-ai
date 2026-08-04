import { NextResponse } from "next/server";
import { dispatchAvaForCurrentSession } from "@/lib/session-events";

export async function POST() {
  const dispatched = await dispatchAvaForCurrentSession().catch((error) => {
    console.error("Failed to dispatch Ava after browser join", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  });

  if (!dispatched) {
    console.error("Ava dispatch returned false for current demo session");
    return NextResponse.json({ error: "Ava is temporarily busy. Please try again in about one minute." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
