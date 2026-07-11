import { NextResponse } from "next/server";
import {
  authorizeCardSpend,
  cardBalanceUsd,
  recordCardSpend,
} from "@/lib/server/repo";

// Issuer webhook — Dola's JIT (just-in-time) authorization gateway.
//
// Sudo does not decide whether a card spend goes through; we do. The card's
// funding source points at this URL, and when the card is used at a merchant
// the network calls us and waits up to 4 seconds for a verdict:
//
//   authorization.request → approve/decline against the card's balance in Neon
//   card.balance          → the network asking what the card is worth
//   transaction.created   → the spend actually settled; debit the ledger
//
// Verdicts are ISO 8583 response codes ("00" approve, "51" insufficient funds).
// Amount units differ per event: authorizations carry minor units (cents),
// settled transactions carry major units (dollars, negative for a debit).
//
// Sudo sends the funding source's `authorizationHeader` verbatim as the
// Authorization header. Failing closed on a bad token would decline real spends,
// so an unrecognized token is rejected outright rather than silently approved.

const APPROVE = { statusCode: 200, data: { responseCode: "00" } };
const decline = (responseCode: string) => ({
  statusCode: 400,
  data: { responseCode },
});

function tokenOk(headers: Headers): boolean {
  const expected = process.env.SUDO_WEBHOOK_TOKEN;
  if (!expected) return true; // not configured yet — accept (dev)
  const candidates = [
    headers.get("authorization"),
    headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
    headers.get("verificationtoken"),
    headers.get("x-sudo-signature"),
    headers.get("sudo-authorization"),
  ].filter(Boolean);
  return candidates.some((c) => c === expected);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = any;

// `card` is an object on authorization events and a bare id string on settled
// transactions.
function cardRef(obj: Obj): string {
  const c = obj?.card;
  if (typeof c === "string") return c;
  return String(c?._id ?? obj?._id ?? "");
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (!tokenOk(req.headers)) {
    console.error("issuer-webhook: bad token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: Obj;
  try {
    event = JSON.parse(raw);
  } catch {
    console.error("issuer-webhook: unparseable body");
    return NextResponse.json({ received: true });
  }

  const type = String(event?.type ?? "");
  const obj: Obj = event?.data?.object ?? event?.data ?? event;
  console.log(`issuer-webhook ${type}:`, raw.slice(0, 1200));

  try {
    switch (type) {
      case "authorization.request": {
        const ref = cardRef(obj);
        const cents = Number(obj?.pendingRequest?.amount ?? obj?.amount);
        // A payload we can't read is a payload we don't approve — never let a
        // missing amount fall through as $0 and sail past the balance check.
        if (!ref || !Number.isFinite(cents) || cents <= 0) {
          console.error("issuer-webhook: unreadable authorization", raw.slice(0, 500));
          return NextResponse.json(decline("96"), { status: 400 });
        }
        const amountUsd = cents / 100;
        const verdict = await authorizeCardSpend(ref, amountUsd);
        console.log(
          `issuer-webhook authorization ${ref} $${amountUsd} -> ${verdict.responseCode}`
        );
        return NextResponse.json(
          verdict.approved ? APPROVE : decline(verdict.responseCode),
          { status: verdict.approved ? 200 : 400 }
        );
      }

      case "card.balance": {
        const ref = cardRef(obj);
        const usd = await cardBalanceUsd(ref);
        if (usd == null) return NextResponse.json(decline("14"), { status: 400 });
        return NextResponse.json({
          statusCode: 200,
          data: { responseCode: "00", balance: Math.round(usd * 100) },
        });
      }

      case "transaction.created": {
        const ref = cardRef(obj);
        // Settled amounts arrive in dollars, negative for a debit.
        const amountUsd = Math.abs(Number(obj?.amount ?? 0));
        const merchant = obj?.merchant?.name ?? "Card purchase";
        const externalRef = String(
          obj?.transactionMetadata?.reference ?? obj?._id ?? crypto.randomUUID()
        );
        if (ref && amountUsd > 0) {
          const res = await recordCardSpend({
            providerRef: ref,
            amountUsd,
            merchant,
            externalRef,
          });
          console.log("issuer-webhook recorded:", JSON.stringify(res));
        }
        break;
      }
    }
  } catch (e) {
    console.error(`issuer-webhook ${type} error:`, e);
    // Never leave the network hanging on an authorization — decline instead.
    if (type === "authorization.request")
      return NextResponse.json(decline("96"), { status: 400 }); // system error
  }

  return NextResponse.json({ received: true });
}
