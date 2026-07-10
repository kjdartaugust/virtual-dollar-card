import type { AppState, Profile } from "@/lib/types";
import { uid } from "@/lib/utils";

// Fresh state for a brand-new account: empty wallet, no cards, KYC unverified.
export function emptyState(profile: Profile): AppState {
  return {
    profile,
    kyc: { status: "unverified" },
    wallet: { usdBalance: 0, currency: "USD" },
    cards: [],
    transactions: [],
  };
}

// A rich pre-populated demo account for the "Try the demo" button — shows the
// product with a funded wallet, an active card and realistic history.
export function demoState(): AppState {
  const now = Date.now();
  const iso = (daysAgo: number) =>
    new Date(now - daysAgo * 86400000).toISOString();

  const profile: Profile = {
    id: "demo-user",
    email: "ama@dola.africa",
    fullName: "Ama Mensah",
    phone: "+233 24 555 0134",
    country: "Ghana",
    createdAt: iso(42),
  };

  const pan = "4242424242424242";
  const card = {
    id: "card_demo1",
    providerRef: "iss_demo000001",
    brand: "visa" as const,
    label: "Online Shopping",
    pan,
    cvv: "318",
    expMonth: 8,
    expYear: new Date().getFullYear() + 3,
    cardholder: "AMA MENSAH",
    balance: 84.2,
    status: "active" as const,
    color: "aurora",
    createdAt: iso(30),
    last4: "4242",
  };

  return {
    profile,
    kyc: {
      status: "verified",
      idType: "ghana_card",
      idNumber: "GHA-•••••••-3",
      dateOfBirth: "1997-03-11",
      address: "12 Oxford St, Osu",
      city: "Accra",
      submittedAt: iso(41),
      reviewedAt: iso(41),
    },
    wallet: { usdBalance: 156.73, currency: "USD" },
    cards: [card],
    transactions: [
      {
        id: uid("txn_"),
        type: "card_spend",
        status: "success",
        amountUsd: -12.99,
        merchant: "Spotify",
        cardId: card.id,
        cardLast4: "4242",
        reference: "DOLA-" + uid().toUpperCase(),
        createdAt: iso(1),
      },
      {
        id: uid("txn_"),
        type: "card_spend",
        status: "success",
        amountUsd: -5.49,
        merchant: "OpenAI",
        cardId: card.id,
        cardLast4: "4242",
        reference: "DOLA-" + uid().toUpperCase(),
        createdAt: iso(3),
      },
      {
        id: uid("txn_"),
        type: "card_spend",
        status: "declined",
        amountUsd: -60,
        merchant: "Amazon",
        cardId: card.id,
        cardLast4: "4242",
        reference: "DOLA-" + uid().toUpperCase(),
        note: "Insufficient card balance",
        createdAt: iso(4),
      },
      {
        id: uid("txn_"),
        type: "card_fund",
        status: "success",
        amountUsd: -100,
        cardId: card.id,
        cardLast4: "4242",
        reference: "DOLA-" + uid().toUpperCase(),
        note: "Wallet → card",
        createdAt: iso(6),
      },
      {
        id: uid("txn_"),
        type: "fund_wallet",
        status: "success",
        amountUsd: 200,
        amountGhs: 2568,
        rate: 12.84,
        reference: "DOLA-" + uid().toUpperCase(),
        note: "Paystack · MTN MoMo",
        createdAt: iso(7),
      },
      {
        id: uid("txn_"),
        type: "card_issue",
        status: "success",
        amountUsd: -1.5,
        cardId: card.id,
        cardLast4: "4242",
        reference: "DOLA-" + uid().toUpperCase(),
        note: "Card creation fee",
        createdAt: iso(30),
      },
    ],
  };
}
