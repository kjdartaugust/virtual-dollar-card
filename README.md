# Dola — Virtual Dollar Cards for Africa 💳

Fund a wallet in **cedis**, spend in **dollars**. Dola is a full virtual-card
platform: users verify their identity, top up with mobile money, and instantly
issue virtual USD cards to pay any online merchant — subscriptions, ads,
shopping, cloud bills and APIs.

This is a **portfolio / sandbox build**. It demonstrates the complete flow of a
real card-issuing business (Miden / Korapay / Fyatu-style) using test data and a
mock issuer — **no real money moves and no business registration is needed**.
It runs entirely on free tiers with **zero configuration**.

## ✨ What it does

- **Landing page** — marketing site explaining the product, rates and FAQ.
- **Auth** — email/password sign-up + a one-click funded demo account.
- **KYC** — collect ID details (Ghana Card, passport…) with instant sandbox approval.
- **Wallet** — fund in GHS via a simulated Paystack checkout; credited in USD at a transparent rate.
- **Card issuance** — mint a virtual Visa/Mastercard, choose a colour, load it from the wallet.
- **Card management** — reveal number/CVV, copy details, freeze/unfreeze, move money to/from wallet, terminate.
- **Simulated spending** — send test authorizations to a card (approved/declined) through the mock issuer.
- **Transactions** — grouped, filterable history of every top-up, load and purchase.
- **Light/dark theme**, fully responsive, mobile-first.

## 🏗️ Architecture

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4, custom theme tokens, dark mode |
| State | Client store (React context) persisted to `localStorage` |
| Issuer | `IssuerService` interface with a `MockIssuer` — swappable for a live provider |

The key design decision is the **`IssuerService` seam** (`src/lib/issuer/`). Its
interface mirrors what real B2B card issuers expose (`issueCard`, `freezeCard`,
`authorize`…). Today it's backed by a mock that generates Luhn-valid test PANs in
standard test BIN ranges. To go live you implement the same interface against the
provider's SDK and swap it in `src/lib/issuer/index.ts` — **no UI or store changes
required.**

Pricing/FX levers (rate, spread, fees) live in `src/lib/config.ts`.

## 🚀 Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Click **“Try the live demo”** on the login page for a
pre-funded account, or sign up to start from scratch. No `.env` needed.

## 🔌 Taking it to production

1. **Collect money** — wire real Paystack test keys for GHS checkout (`.env.example`).
2. **Issue cards** — get sandbox approval from a card issuer and implement `IssuerService`.
3. **Persist data** — apply `supabase/schema.sql` (RLS-scoped tables) and back the store with Supabase instead of `localStorage`.
4. **Compliance** — KYC and PCI-DSS are handled with the issuer; full PAN/CVV are never stored in your own DB (see the note in `schema.sql`).

## 📁 Structure

```
src/
  app/                 # routes: landing, auth, dashboard/*
  components/
    ui/                # button, input, card, modal, toast
    dashboard/         # shell, modals, transaction item
    marketing/         # landing nav
    virtual-card.tsx   # the card visual
  lib/
    config.ts          # rates & fees
    types.ts           # domain model
    issuer/            # IssuerService interface + mock (the integration seam)
    store/             # client store, auth, seed/demo data
supabase/schema.sql    # production data model
```

> ⚠️ Educational sandbox only. Card numbers are non-routable test data; no real
> financial transactions occur.
