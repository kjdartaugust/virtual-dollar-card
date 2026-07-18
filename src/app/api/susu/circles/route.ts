import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { createCircle, type Frequency } from "@/lib/server/susu-repo";

const FREQUENCIES: Frequency[] = ["weekly", "biweekly", "monthly"];

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const contribution = Number(body.contribution);
    const frequency = FREQUENCIES.includes(body.frequency)
      ? (body.frequency as Frequency)
      : "monthly";
    const startDate = String(body.startDate ?? "").slice(0, 10);
    const members = Array.isArray(body.members)
      ? body.members.map((m: unknown) => String(m).trim()).filter(Boolean)
      : [];
    if (!name || !Number.isFinite(contribution) || contribution <= 0 || !startDate)
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });

    const state = await createCircle(userId, {
      name,
      contribution,
      frequency,
      startDate,
      members,
    });
    return NextResponse.json({ state });
  } catch (e) {
    console.error("susu create circle", e);
    return NextResponse.json({ error: "Could not create circle." }, { status: 500 });
  }
}
