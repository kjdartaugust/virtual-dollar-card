import { NextResponse } from "next/server";
import { creditPayment } from "@/lib/server/repo";
import { verifyWebhook } from "@/lib/server/paystack";

// Paystack server-to-server confirmation. This is the source of truth for
// crediting — it fires even if the user closes the browser after paying.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  if (!verifyWebhook(raw, signature))
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  try {
    const event = JSON.parse(raw);
    if (event?.event === "charge.success" && event.data?.reference) {
      await creditPayment(event.data.reference);
    }
  } catch (e) {
    console.error("webhook", e);
  }
  // Always 200 so Paystack stops retrying once received.
  return NextResponse.json({ received: true });
}
