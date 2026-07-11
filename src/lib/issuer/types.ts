// IssuerService — the integration seam.
//
// This interface mirrors the surface area real B2B card issuers expose
// (Miden, Korapay Cards, Fyatu). Today it's backed by a mock; to go live you
// implement this same interface against the provider's SDK and swap it in
// `issuer/index.ts` — no UI or store changes required.

import type { CardBrand } from "@/lib/types";

// KYC/customer context a real issuer needs to create a cardholder. The mock
// ignores everything except the cardholder name.
export interface CustomerContext {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dob?: string; // YYYY-MM-DD
  idNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  // Reuse an existing provider cardholder/account if we've already created one
  // for this Dola user (stored in our DB).
  providerCustomerId?: string;
  providerAccountId?: string;
}

export interface IssueCardParams {
  cardholder: string;
  brand: CardBrand;
  initialLoadUsd: number;
  label?: string;
  customer?: CustomerContext;
}

export interface IssuedCard {
  providerRef: string;
  brand: CardBrand;
  pan: string; // real PAN for mock; masked PAN for live issuers (vault reveal is separate)
  cvv: string; // "•••" for live issuers
  expMonth: number;
  expYear: number;
  last4: string;
  // Present for real issuers so we can persist the mapping and reuse it.
  providerCustomerId?: string;
  providerAccountId?: string;
  masked?: boolean; // true when pan is masked (live issuer)
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
