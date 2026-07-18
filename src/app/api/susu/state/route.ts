import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { getSusuState } from "@/lib/server/susu-repo";

// The native app bootstraps its store from here. Returns { state: null } when
// there's no valid session so the client can show the logged-out screen.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ state: null });
  const state = await getSusuState(userId);
  return NextResponse.json({ state });
}
