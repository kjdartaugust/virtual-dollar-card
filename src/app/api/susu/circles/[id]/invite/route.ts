import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { createInvite } from "@/lib/server/susu-repo";

// Owner mints an invite link for one member slot of a circle.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const memberId = String(body.memberId ?? "");
    if (!memberId)
      return NextResponse.json({ error: "Missing member." }, { status: 400 });
    const token = await createInvite(userId, id, memberId);
    return NextResponse.json({ token });
  } catch (e) {
    console.error("susu invite create", e);
    const msg = e instanceof Error ? e.message : "Could not create invite.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
