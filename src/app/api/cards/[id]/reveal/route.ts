import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { revealCard } from "@/lib/server/repo";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await revealCard(userId, id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ pan: res.pan, cvv: res.cvv });
}
