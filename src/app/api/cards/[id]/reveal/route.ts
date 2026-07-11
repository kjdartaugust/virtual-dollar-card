import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { revealCard } from "@/lib/server/repo";
import { rateLimit } from "@/lib/server/rate-limit";

// Reveal hits the issuer's PCI vault, so it's the most sensitive endpoint here
// and the easiest to abuse — a logged-in user could otherwise pull card secrets
// as fast as they can click. Ten per minute is far above real use (you reveal a
// card to copy it once) and far below anything worth scraping.
const LIMIT = 10;
const WINDOW_MS = 60_000;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = rateLimit(`reveal:${userId}`, LIMIT, WINDOW_MS);
  if (!gate.ok)
    return NextResponse.json(
      { error: "Too many reveal attempts. Try again shortly." },
      { status: 429, headers: { "retry-after": String(gate.retryAfterSec) } }
    );

  const { id } = await params;
  const res = await revealCard(userId, id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ pan: res.pan, cvv: res.cvv });
}
