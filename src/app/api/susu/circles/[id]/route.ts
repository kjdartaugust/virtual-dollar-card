import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { deleteCircle } from "@/lib/server/susu-repo";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const state = await deleteCircle(userId, id);
    return NextResponse.json({ state });
  } catch (e) {
    console.error("susu delete circle", e);
    return NextResponse.json({ error: "Could not delete circle." }, { status: 500 });
  }
}
