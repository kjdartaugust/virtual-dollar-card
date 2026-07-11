# Dola — Virtual Dollar Cards for Africa 💳

**[virtual-dollar-card.vercel.app](https://virtual-dollar-card.vercel.app)**

Fund a wallet in **cedis**, spend in **dollars**. Users verify their identity, top
up with mobile money, and issue a virtual USD card to pay any online merchant —
subscriptions, ads, cloud bills, APIs.

The cards are **real**. Dola issues virtual USD Visa/Mastercards through
[Sudo](https://sudo.africa), reveals the true PAN and CVV from Sudo's PCI vault,
and — the part that matters — **authorizes its own card spends**. When the card is
charged, the network doesn't decide whether the money moves. Dola does.

> Runs against Sudo's **sandbox** and Paystack's **test mode**. The architecture is
> the production one; only the keys are test keys.

## The interesting part: Dola is the authorizer

Most card-API integrations stop at `POST /cards`. The issuer holds the money, the
issuer approves the spend, and your app is a dashboard over someone else's ledger.

Dola inverts that. Cards are issued against a Sudo **gateway funding source** with
a JIT (just-in-time) endpoint pointing at `/api/issuer/webhook`. So when the card
is swiped, the card network calls **us** and waits up to 4 seconds for a verdict:

```
merchant → card network → Sudo → POST /api/issuer/webhook
                                   │
                                   │  authorization.request  ($2.50 at Spotify?)
                                   ▼
                          check the card's balance in Neon
                                   │
                     approve "00"  │  decline "51" (insufficient funds)
                                   │          "62" (frozen card)
                                   ▼          "14" (unknown card)
                                 Sudo → network → merchant
                                   │
                                   │  transaction.created (settled)
                                   ▼
                          debit the ledger, idempotent on reference
```

Those are **ISO 8583 response codes** — the language card networks have spoken
since the 1980s. Your Postgres row is the source of truth for whether a real card
works at a real merchant.

Three details that make it safe:

- **`authorizeByDefault: false`** — if we time out, the spend is declined, not waved through.
- **An unreadable payload declines with `96`.** A missing amount once parsed as `$0`, and `$0 ≤ balance` *approved*. Fail closed, always.
- **Settlement is idempotent** on the provider's reference, so a duplicate delivery can't double-charge.

> **Gotcha that cost an hour:** an *account-type* funding source never calls your
> gateway — Sudo settles against its own wallet and you're never asked. It must be
> `type: "gateway"` with a `jitGateway`. Sudo's sandbox authorization simulator
> also returns `"Simulated successfully."` while dispatching nothing at all, which
> is why the gateway is verified by replaying Sudo's documented payloads instead
> (`scripts/gateway-conformance.mjs`, 8/8).

## What it does

- **Auth** — email/password, bcrypt + JWT in an httpOnly cookie.
- **KYC** — collect ID details; passed to the issuer as the cardholder identity.
- **Wallet** — fund in GHS through real Paystack checkout, credited in USD at a transparent rate. Idempotent crediting via webhook + return-page verification.
- **Card issuance** — a real virtual USD card from Sudo, funded from the wallet.
- **Reveal** — true PAN and CVV fetched from Sudo's PCI vault on demand, never stored.
- **Card controls** — freeze, unfreeze, terminate (balance returns to the wallet), all pushed to the issuer.
- **Spending** — authorized in real time by our own gateway, approvals and declines both written to the ledger.
- **Demo mode** — with no configuration at all, the whole app runs on `localStorage` with a mock issuer. Clone and `npm run dev`.

## Architecture

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| Styling | Tailwind CSS v4, custom theme tokens, light/dark |
| Database | Neon serverless Postgres — atomic `withTransaction` + `FOR UPDATE` row locks |
| Auth | `bcryptjs` + `jose` JWT, httpOnly cookie |
| Payments in | Paystack (GHS checkout → USD wallet credit) |
| Card issuing | Sudo — real virtual USD cards, PCI vault reveal, JIT authorization |
| Hosting | Vercel, auto-deploy from `main` |

**The `IssuerService` seam** (`src/lib/issuer/`) is what keeps this swappable. One
interface — `issueCard`, `freezeCard`, `revealCard`, `authorize` — with three
implementations behind it: `mock` (Luhn-valid test PANs, zero network calls),
`sudo` (live), and `miden` (scaffolded). `ISSUER_PROVIDER` picks one, server-side
only, so the browser can never reach a live issuer.

**Dual-mode store** (`src/lib/store/`). The same store interface talks to the API
when `NEXT_PUBLIC_BACKEND_ENABLED=true`, and to `localStorage` otherwise. That's
why the demo needs no database, and why the UI never learned the difference.

Money never moves outside a transaction. Every debit takes a `FOR UPDATE` lock on
the card row, so a spend racing a withdrawal can't overdraw the card.

## Getting started

```bash
npm install
npm run dev            # demo mode — localStorage + mock issuer, no .env needed
```

For the real backend, copy `.env.example` → `.env.local`, apply `db/schema.sql` to
a Neon database, and set the keys. `ISSUER_PROVIDER=sudo` needs `SUDO_API_KEY`,
`ISSUER_WEBHOOK_URL` and `SUDO_WEBHOOK_TOKEN` — the last two are what wire the JIT
gateway, and the first live card issued provisions the gateway funding source
automatically.

### Verifying the gateway

```bash
DATABASE_URL=... SUDO_WEBHOOK_TOKEN=... GATEWAY_URL=https://host/api/issuer/webhook \
  node scripts/gateway-conformance.mjs <card_provider_ref>
```

Replays Sudo's documented webhook payloads against a running endpoint and asserts
every verdict — approve, `51`, `62`, `14`, `96`, balance enquiry in cents, bad
token, and duplicate settlement — then restores the card.

## Structure

```
src/
  app/
    api/
      issuer/webhook/    # the JIT authorization gateway
      cards/[id]/reveal/ # PCI vault reveal
      paystack/webhook/  # idempotent wallet crediting
    dashboard/           # wallet, cards, transactions
  components/
    virtual-card.tsx     # the 3D card visual
  lib/
    issuer/              # IssuerService: mock | sudo | miden
    server/repo.ts       # all money movement, transactional
    store/               # dual-mode client store
db/schema.sql
scripts/gateway-conformance.mjs
```

## Compliance notes

Full PAN and CVV are **never stored** for live cards — they're fetched from Sudo's
vault per reveal and held only in component state. In production that call should
be proxied straight to the browser so raw digits never touch the server at all;
this build fetches server-side and hands them to the authenticated cardholder.
KYC/PCI-DSS obligations sit with the issuer.

> Sandbox build. Card numbers are issuer test cards and no real money moves.
