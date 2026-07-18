import { NextResponse } from "next/server";
import { getInvitePreview } from "@/lib/server/susu-repo";

// Public preview of an invite so the invitee sees what they're joining before
// signing in. No auth required — the token is the capability.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const preview = await getInvitePreview(token);
  if (!preview)
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  return NextResponse.json({ invite: preview });
}
