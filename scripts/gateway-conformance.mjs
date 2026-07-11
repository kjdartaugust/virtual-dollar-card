// Conformance suite for Dola's JIT authorization gateway (/api/issuer/webhook).
//
// Sudo's sandbox simulator (POST /cards/simulator/authorization) returns
// "Simulated successfully." but creates no authorization, no transaction, and
// delivers nothing — so it cannot exercise the gateway. This replays Sudo's
// documented payloads (docs.sudo.africa/docs/webhooks/*) against a running
// endpoint and asserts the ISO 8583 verdicts instead.
//
// Usage:
//   DATABASE_URL=... SUDO_WEBHOOK_TOKEN=... GATEWAY_URL=https://host/api/issuer/webhook \
//     node scripts/gateway-conformance.mjs <card_provider_ref>
//
// It debits the card by $2.50 (the settled-transaction case) and restores the
// balance and status afterwards.

import { neon } from "@neondatabase/serverless";

const DB = process.env.DATABASE_URL;
const TOKEN = process.env.SUDO_WEBHOOK_TOKEN;
const URL = process.env.GATEWAY_URL;
const CARD = process.argv[2];

if (!DB || !TOKEN || !URL || !CARD) {
  console.error(
    "need DATABASE_URL, SUDO_WEBHOOK_TOKEN, GATEWAY_URL and a card provider_ref argument"
  );
  process.exit(1);
}

const sql = neon(DB.replace(/&?channel_binding=require/, ""));

async function post(body, token = TOKEN) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: token },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { http: res.status, code: json?.data?.responseCode, balance: json?.data?.balance };
}

const authRequest = (cardId, cents) => ({
  type: "authorization.request",
  environment: "development",
  createdAt: Math.floor(Date.now() / 1000),
  data: {
    object: {
      _id: `auth_${Date.now()}`,
      card: { _id: cardId, status: "active" },
      amount: 0,
      currency: "USD",
      status: "pending",
      merchant: { name: "Spotify", merchantId: "SUDOSIMULATOR01", category: "5815" },
      transactionMetadata: { channel: "web", type: "purchase", reference: `ref_${Date.now()}` },
      pendingRequest: { amount: cents, currency: "USD", merchantAmount: cents },
    },
  },
});

const balanceEnquiry = (cardId) => ({
  type: "card.balance",
  data: { object: { _id: cardId, currency: "USD" } },
});

// `card` is a bare id string on settled transactions, and the amount is in
// dollars (negative for a debit) — not cents like the authorization.
const txnCreated = (cardId, usd, reference) => ({
  type: "transaction.created",
  data: {
    object: {
      _id: `txn_${Date.now()}`,
      card: cardId,
      amount: -usd,
      currency: "USD",
      merchant: { name: "Spotify" },
      transactionMetadata: { reference },
    },
  },
});

const results = [];
function check(name, pass, detail) {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

const [card] = await sql`select balance, status from cards where provider_ref=${CARD}`;
if (!card) {
  console.error(`no card with provider_ref ${CARD}`);
  process.exit(1);
}
const bal = Number(card.balance);
console.log(`card ${CARD}: $${bal}, ${card.status}\n`);

let r = await post(authRequest(CARD, 250));
check("authorization within balance → approve", r.http === 200 && r.code === "00", `http=${r.http} code=${r.code}`);

r = await post(authRequest(CARD, Math.round((bal + 10) * 100)));
check("authorization over balance → 51", r.http === 400 && r.code === "51", `http=${r.http} code=${r.code}`);

r = await post(authRequest("ffffffffffffffffffffffff", 100));
check("authorization on unknown card → 14", r.http === 400 && r.code === "14", `http=${r.http} code=${r.code}`);

await sql`update cards set status='frozen' where provider_ref=${CARD}`;
r = await post(authRequest(CARD, 100));
check("authorization on frozen card → 62", r.http === 400 && r.code === "62", `http=${r.http} code=${r.code}`);
await sql`update cards set status='active' where provider_ref=${CARD}`;

r = await post({ type: "authorization.request", data: { object: { card: { _id: CARD } } } });
check("authorization with no amount → 96 (never approve what we can't read)", r.http === 400 && r.code === "96", `http=${r.http} code=${r.code}`);

r = await post(balanceEnquiry(CARD));
check("card.balance → cents", r.code === "00" && r.balance === Math.round(bal * 100), `code=${r.code} balance=${r.balance}`);

r = await post(authRequest(CARD, 100), "wrong-token");
check("bad authorization header → 401", r.http === 401, `http=${r.http}`);

const reference = `ref_settle_${Date.now()}`;
await post(txnCreated(CARD, 2.5, reference));
await post(txnCreated(CARD, 2.5, reference)); // duplicate delivery
const [after] = await sql`select balance from cards where provider_ref=${CARD}`;
const rows = await sql`select amount_usd from transactions where reference=${reference}`;
check(
  "transaction.created debits once (idempotent on reference)",
  rows.length === 1 && Number(after.balance) === bal - 2.5,
  `rows=${rows.length}, $${bal} → $${after.balance}`
);

// restore
await sql`delete from transactions where reference=${reference}`;
await sql`update cards set balance=${bal}, status=${card.status} where provider_ref=${CARD}`;
console.log(`\nrestored card to $${bal} / ${card.status}`);

const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
