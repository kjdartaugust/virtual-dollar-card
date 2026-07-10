import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { creditPayment, createPayment, getFullState } from "@/lib/server/repo";
import { queryOne } from "@/lib/db";
import { initTransaction, paystackEnabled } from "@/lib/server/paystack";
import { appOrigin } from "@/lib/server/http";
import { CONFIG } from "@/lib/config";

function newReference() {
  const r =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `dola_${r}`;
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { ghs, method } = await req.json();
    const amount = Number(ghs);
    if (!amount || amount < CONFIG.minFundGhs)
      return NextResponse.json(
        { error: `Minimum is GHS ${CONFIG.minFundGhs}.` },
        { status: 400 }
      );
    if (amount > CONFIG.maxFundGhs)
      return NextResponse.json(
        { error: `Maximum is GHS ${CONFIG.maxFundGhs}.` },
        { status: 400 }
      );

    const reference = newReference();
    await createPayment(userId, amount, method ?? "card", reference);

    // Real Paystack checkout when keys are configured.
    if (paystackEnabled) {
      const user = await queryOne(`select email from users where id=$1`, [
        userId,
      ]);
      const init = await initTransaction({
        email: user.email,
        amountGhs: amount,
        reference,
        callbackUrl: `${appOrigin(req)}/dashboard/funding`,
      });
      return NextResponse.json({
        mode: "paystack",
        authorizationUrl: init.authorizationUrl,
        reference,
      });
    }

    // Fallback: no Paystack keys yet — auto-credit so the backend is usable.
    await creditPayment(reference);
    const state = await getFullState(userId);
    return NextResponse.json({ mode: "simulated", state });
  } catch (e) {
    console.error("fund", e);
    return NextResponse.json({ error: "Funding failed." }, { status: 500 });
  }
}
