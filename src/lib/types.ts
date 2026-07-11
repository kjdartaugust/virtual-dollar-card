// Domain model for the Dola virtual dollar card platform.
// These types mirror what a real card-issuing provider (Miden / Korapay / Fyatu)
// exposes, so the mock issuer can later be swapped for a live API with the same shapes.

import type { SpendingControls } from "./spending-controls";
export type { SpendingControls };

export type KycStatus = "unverified" | "pending" | "verified" | "rejected";

export type IdType = "ghana_card" | "passport" | "drivers_license" | "voter_id";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  country: string;
  createdAt: string;
}

export interface Kyc {
  status: KycStatus;
  idType?: IdType;
  idNumber?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface Wallet {
  // Balance is held in USD (the float you keep with the card provider).
  usdBalance: number;
  currency: "USD";
}

export type CardStatus = "active" | "frozen" | "terminated";
export type CardBrand = "visa" | "mastercard";

export interface Card {
  id: string;
  // Provider reference (what the issuer API returns).
  providerRef: string;
  brand: CardBrand;
  label: string;
  pan: string; // 16-digit number (test data only)
  cvv: string;
  expMonth: number;
  expYear: number;
  cardholder: string;
  balance: number; // USD loaded onto the card
  status: CardStatus;
  color: string; // gradient key for the UI
  createdAt: string;
  last4: string;
  // Policy the authorization gateway enforces on every spend.
  controls: SpendingControls;
  // Settled spend in the current calendar month, for the limit UI.
  spentThisMonth: number;
}

export type TxnType =
  | "fund_wallet" // GHS -> USD into wallet
  | "card_issue" // issuance fee
  | "card_fund" // wallet -> card
  | "card_spend" // online purchase
  | "card_refund"
  | "fee";

export type TxnStatus = "success" | "pending" | "failed" | "declined";

export interface Transaction {
  id: string;
  type: TxnType;
  status: TxnStatus;
  amountUsd: number; // signed: negative = money out
  amountGhs?: number; // for funding events
  rate?: number; // GHS per USD used
  fee?: number; // USD fee component
  merchant?: string;
  cardId?: string;
  cardLast4?: string;
  reference: string;
  note?: string;
  createdAt: string;
}

export interface AppState {
  profile: Profile;
  kyc: Kyc;
  wallet: Wallet;
  cards: Card[];
  transactions: Transaction[];
}
