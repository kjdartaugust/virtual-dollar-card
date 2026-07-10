import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { creditPayment, getFullState } from "@/lib/server/repo";
import { paystackEnabled, verifyTransaction } from "@/lib/server/paystack";

// Called by the /dashboard/funding page after Paystack redirects back.
// Idempotent — safe to call alongside the webhook.
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { reference } = await req.json();
    if (!reference)
      return NextResponse.json(
        { error: "Missing reference." },
        { status: 400 }
      );

    if (paystackEnabled) {
      const result = await verifyTransaction(reference);
      if (!result.success)
        return NextResponse.json(
          { error: "Payment not successful." },
          { status: 402 }
        );
    }
    await creditPayment(reference);
    const state = await getFullState(userId);
    return NextResponse.json({ state });
  } catch (e) {
    console.error("verify", e);
    return NextResponse.json(
      { error: "Verification failed." },
      { status: 500 }
    );
  }
}
