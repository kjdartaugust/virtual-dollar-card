import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { createGoal } from "@/lib/server/susu-repo";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const target = Number(body.target);
    if (!name || !Number.isFinite(target) || target <= 0)
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });

    const state = await createGoal(userId, { name, target });
    return NextResponse.json({ state });
  } catch (e) {
    console.error("susu create goal", e);
    return NextResponse.json({ error: "Could not create goal." }, { status: 500 });
  }
}
