import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { getFullState, issueCard } from "@/lib/server/repo";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { label, brand, color, initialLoadUsd } = await req.json();
    const res = await issueCard(userId, {
      label: label || "Virtual card",
      brand: brand === "mastercard" ? "mastercard" : "visa",
      color: color || "aurora",
      initialLoadUsd: Number(initialLoadUsd),
    });
    if (!res.ok)
      return NextResponse.json({ error: res.error }, { status: 400 });
    const state = await getFullState(userId);
    return NextResponse.json({ state, cardId: res.cardId });
  } catch (e) {
    console.error("issueCard", e);
    return NextResponse.json(
      { error: "Could not create card." },
      { status: 500 }
    );
  }
}
