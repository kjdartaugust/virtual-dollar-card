import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { addGoalTxn } from "@/lib/server/susu-repo";

// Records a deposit (positive) or withdrawal (negative) against a savings goal.
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
    const amount = Number(body.amount);
    const note = String(body.note ?? "");
    if (!Number.isFinite(amount) || amount === 0)
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });

    const state = await addGoalTxn(userId, id, { amount, note });
    return NextResponse.json({ state });
  } catch (e) {
    console.error("susu add goal txn", e);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
}
