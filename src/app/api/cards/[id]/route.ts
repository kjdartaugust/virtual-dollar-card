import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { cardAction, getFullState } from "@/lib/server/repo";

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
    const action = body.action as string;
    const amount = Number(body.amount);
    let res: { ok: boolean; error?: string };

    switch (action) {
      case "fund":
        res = await cardAction(userId, id, { kind: "fund", amount });
        break;
      case "withdraw":
        res = await cardAction(userId, id, { kind: "withdraw", amount });
        break;
      case "spend":
        res = await cardAction(userId, id, {
          kind: "spend",
          amount,
          merchant: body.merchant ?? "Merchant",
        });
        break;
      case "freeze":
        res = await cardAction(userId, id, { kind: "freeze" });
        break;
      case "unfreeze":
        res = await cardAction(userId, id, { kind: "unfreeze" });
        break;
      case "terminate":
        res = await cardAction(userId, id, { kind: "terminate" });
        break;
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const state = await getFullState(userId);
    if (!res.ok)
      return NextResponse.json({ error: res.error, state }, { status: 400 });
    return NextResponse.json({ state });
  } catch (e) {
    console.error("cardAction", e);
    return NextResponse.json({ error: "Action failed." }, { status: 500 });
  }
}
