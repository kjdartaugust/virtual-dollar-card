import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { getSusuState } from "@/lib/server/susu-repo";

// The native app bootstraps its store from here.
//
// This used to answer 200 with { state: null } for a rejected session, which
// the client could not distinguish from "an account with nothing in it": an
// expired token showed people an empty app and never asked them to sign in
// again, so it looked like their circles had vanished. Answer 401 like every
// other route here, and the client signs out properly.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = await getSusuState(userId);
  return NextResponse.json({ state });
}
