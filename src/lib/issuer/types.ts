// IssuerService — the integration seam.
//
// This interface mirrors the surface area real B2B card issuers expose
// (Miden, Korapay Cards, Fyatu). Today it's backed by a mock; to go live you
// implement this same interface against the provider's SDK and swap it in
// `issuer/index.ts` — no UI or store changes required.

import type { CardBrand } from "@/lib/types";

export interface IssueCardParams {
  cardholder: string;
  brand: CardBrand;
  initialLoadUsd: number;
  label?: string;
}

export interface IssuedCard {
  providerRef: string;
  brand: CardBrand;
  pan: string;
  cvv: string;
  expMonth: number;
  expYear: number;
  last4: string;
}

export interface AuthorizationRequest {
  providerRef: string;
  amountUsd: number;
  merchant: string;
}

export interface AuthorizationResult {
  approved: boolean;
  reason?: string;
  authCode?: string;
}

export interface IssuerService {
  readonly name: string;
  readonly live: boolean;
  issueCard(params: IssueCardParams): Promise<IssuedCard>;
  freezeCard(providerRef: string): Promise<void>;
  unfreezeCard(providerRef: string): Promise<void>;
  terminateCard(providerRef: string): Promise<void>;
  // Simulates a merchant authorization (an online purchase hitting the card).
  authorize(req: AuthorizationRequest): Promise<AuthorizationResult>;
}
