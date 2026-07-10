import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { getFullState } from "@/lib/server/repo";

// Bootstraps the client store in backend mode. Returns { state: null } when
// there's no valid session so the client can show the logged-out experience.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ state: null });
  const state = await getFullState(userId);
  return NextResponse.json({ state });
}
