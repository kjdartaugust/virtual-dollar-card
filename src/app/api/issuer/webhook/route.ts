import { NextResponse } from "next/server";

// Issuer webhook (SCAFFOLD) — where real card authorizations/transactions land.
//
// With a live issuer, a cardholder spending at a merchant triggers the network
// to authorize; the provider then POSTs the event here. We verify the signature,
// then record a `card_spend` transaction and debit the card balance — the same
// end state the mock's spend() produces, just driven externally.
//
// TODO(miden): once sandbox is live —
//   1. verify the provider signature header against MIDEN_WEBHOOK_SECRET
//   2. map the event to our card (by provider_ref) and amount
//   3. within a transaction: insert card_spend txn + decrement card balance
//      (approve/decline based on balance + card status; idempotent by event id)
export async function POST(req: Request) {
  const raw = await req.text();

  // TODO(miden): verify signature, e.g.:
  // const sig = req.headers.get("miden-signature") ?? "";
  // if (!verify(raw, sig, process.env.MIDEN_WEBHOOK_SECRET)) return 401;

  try {
    const event = JSON.parse(raw);
    // TODO(miden): switch on event.type — e.g. "card.transaction" —
    // and call a repo.recordCardSpend(providerRef, amountUsd, merchant, eventId).
    void event;
  } catch {
    // ignore malformed bodies
  }

  // Always 200 so the provider stops retrying once received.
  return NextResponse.json({ received: true });
}
