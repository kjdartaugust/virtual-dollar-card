import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { setPaid } from "@/lib/server/susu-repo";

// Marks (or unmarks) a member as having paid a given cycle of a circle.
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
    const cycleIndex = Number(body.cycleIndex);
    const paid = Boolean(body.paid);
    if (!memberId || !Number.isInteger(cycleIndex) || cycleIndex < 0)
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });

    const state = await setPaid(userId, id, memberId, cycleIndex, paid);
    return NextResponse.json({ state });
  } catch (e) {
    console.error("susu set paid", e);
    return NextResponse.json({ error: "Could not update." }, { status: 400 });
  }
}
