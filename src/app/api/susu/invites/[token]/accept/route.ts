import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { acceptInvite } from "@/lib/server/susu-repo";

// The signed-in invitee claims their slot. Returns their fresh state, which now
// includes the circle they just joined.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = await params;
  try {
    const state = await acceptInvite(userId, token);
    return NextResponse.json({ state });
  } catch (e) {
    console.error("susu invite accept", e);
    const msg = e instanceof Error ? e.message : "Could not accept invite.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
