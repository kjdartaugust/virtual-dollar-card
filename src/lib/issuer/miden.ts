import type {
  AuthorizationRequest,
  AuthorizationResult,
  IssueCardParams,
  IssuedCard,
  IssuerService,
} from "./types";

// MidenIssuer — real card-issuer adapter (SCAFFOLD).
//
// Implements the same IssuerService contract as MockIssuer, so flipping to it
// requires no UI/store/repo changes — only ISSUER_PROVIDER=miden plus keys.
//
// The exact endpoint paths/payloads below are marked TODO: fill them from the
// Miden sandbox reference once approved (docs are gated behind sandbox access).
// The lifecycle they follow is the standard issuer flow:
//   1. create/lookup a cardholder (customer) for the Dola user
//   2. create a virtual USD card for that cardholder
//   3. fund / freeze / unfreeze / terminate the card via card operations
//   4. real spend authorizations arrive via webhook (see api/issuer/webhook),
//      NOT through a synchronous authorize() call.
export class MidenIssuer implements IssuerService {
  readonly name = "Miden";
  readonly live = true;

  private readonly baseUrl =
    process.env.MIDEN_BASE_URL ?? "https://api.sandbox.miden.co";
  private readonly apiKey = process.env.MIDEN_API_KEY ?? "";

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    if (!this.apiKey) throw new Error("MIDEN_API_KEY not set");
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (json as { message?: string })?.message ??
          `Miden ${method} ${path} failed (${res.status})`
      );
    }
    return json as T;
  }

  async issueCard(params: IssueCardParams): Promise<IssuedCard> {
    // TODO(miden): create/lookup cardholder, then create the card.
    // const holder = await this.request("POST", "/cardholders", {...KYC});
    // const card = await this.request("POST", "/cards", {
    //   cardholder_id: holder.id, currency: "USD", brand: params.brand,
    //   amount: params.initialLoadUsd,
    // });
    // return { providerRef: card.id, brand: params.brand, pan: card.pan,
    //   cvv: card.cvv, expMonth: card.exp_month, expYear: card.exp_year,
    //   last4: card.last4 };
    void params;
    throw new Error(
      "MidenIssuer.issueCard not yet wired — add sandbox endpoints."
    );
  }

  async freezeCard(providerRef: string): Promise<void> {
    // TODO(miden): await this.request("POST", `/cards/${providerRef}/freeze`);
    void providerRef;
    throw new Error("MidenIssuer.freezeCard not yet wired.");
  }

  async unfreezeCard(providerRef: string): Promise<void> {
    // TODO(miden): await this.request("POST", `/cards/${providerRef}/unfreeze`);
    void providerRef;
    throw new Error("MidenIssuer.unfreezeCard not yet wired.");
  }

  async terminateCard(providerRef: string): Promise<void> {
    // TODO(miden): await this.request("POST", `/cards/${providerRef}/terminate`);
    void providerRef;
    throw new Error("MidenIssuer.terminateCard not yet wired.");
  }

  // With a real issuer, authorizations are network-driven and delivered to our
  // webhook — we never synchronously "authorize" a spend ourselves. The demo
  // "Test purchase" button is therefore mock-only and not exposed in live mode.
  async authorize(req: AuthorizationRequest): Promise<AuthorizationResult> {
    void req;
    return {
      approved: false,
      reason: "Live spends are authorized by the network via webhook.",
    };
  }

  async revealCard(): Promise<{ pan: string; cvv: string } | null> {
    // TODO(miden): fetch via Miden's secure card-details endpoint.
    return null;
  }
}
