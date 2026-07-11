import type { SpendingControls } from "@/lib/spending-controls";

// The issuer is down, unreachable, or too slow — as opposed to us having sent it
// something invalid. Worth distinguishing: one is "try again in a minute", the
// other is a bug. Callers surface the message to the user.
export class IssuerUnavailableError extends Error {
  constructor(message = "The card issuer is unavailable.") {
    super(message);
    this.name = "IssuerUnavailableError";
  }
}

// IssuerService — the integration seam.
//
// This interface mirrors the surface area B2B card issuers expose. It's backed
// by SudoIssuer (real virtual USD cards) and MockIssuer (Luhn-valid test cards,
// no network). Adding a provider means implementing this interface and adding a
// case in `issuer/index.ts` — no UI or store changes required.

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
  // Returns full card secrets (PAN/CVV). Null when the issuer can't reveal
  // server-side (the mock returns null; secrets then come from our own store).
  revealCard(
    providerRef: string
  ): Promise<{ pan: string; cvv: string } | null>;
  // Mirrors the cardholder's spending policy onto the issuer. Optional: our
  // gateway is the enforcing copy, this is a network-side backstop for issuers
  // that support it.
  setSpendingControls?(
    providerRef: string,
    controls: SpendingControls
  ): Promise<void>;
}
