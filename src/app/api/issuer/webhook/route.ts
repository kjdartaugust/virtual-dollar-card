import { NextResponse } from "next/server";
import { recordCardSpend } from "@/lib/server/repo";

// Issuer webhook — where real card authorizations/transactions land.
//
// Sudo posts here with an authorization token you set when creating the webhook
// (Dashboard → Developers → Webhooks). We verify that token, then record the
// spend against the matching card. The exact payload shape isn't documented, so
// we parse defensively and log the raw event to refine mapping from a real
// delivery. Always returns 200 so the provider stops retrying.

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
function pick(obj: any, ...paths: string[]): any {
  for (const p of paths) {
    const val = p.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
    if (val != null) return val;
  }
  return undefined;
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (!tokenOk(req.headers)) {
    console.error("issuer-webhook: bad token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const event = JSON.parse(raw);
    console.log("issuer-webhook event:", raw.slice(0, 1500));

    const data = event.data ?? event;
    const type = String(pick(event, "type", "event") ?? pick(data, "type") ?? "");
    const providerRef = String(
      pick(data, "card._id", "card.id", "card", "cardId") ?? ""
    );
    // Amount may be dollars or minor units depending on the event; treat >= 1000
    // integer as minor units. (Refined after inspecting a real delivery.)
    const rawAmount = Number(pick(data, "amount", "amountUsd", "billingAmount") ?? 0);
    const amountUsd = rawAmount > 1000 ? rawAmount / 100 : rawAmount;
    const merchant =
      pick(data, "merchant.name", "merchant", "merchantName") ?? "Card purchase";
    const externalRef = String(
      pick(data, "_id", "transactionId", "id", "reference") ??
        pick(event, "_id", "id") ??
        crypto.randomUUID()
    );

    const isDebit =
      /purchase|payment|withdrawal|transaction|authorization|debit/i.test(type) ||
      /purchase|payment|withdrawal/i.test(String(pick(data, "type") ?? ""));

    if (providerRef && amountUsd > 0 && isDebit) {
      const res = await recordCardSpend({
        providerRef,
        amountUsd,
        merchant: typeof merchant === "string" ? merchant : "Card purchase",
        externalRef,
      });
      console.log("issuer-webhook recorded:", JSON.stringify(res));
    }
  } catch (e) {
    console.error("issuer-webhook parse error:", e);
  }

  return NextResponse.json({ received: true });
}
