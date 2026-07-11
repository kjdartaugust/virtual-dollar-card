import type {
  AuthorizationRequest,
  AuthorizationResult,
  CustomerContext,
  IssueCardParams,
  IssuedCard,
  IssuerService,
} from "./types";

// SudoIssuer — real virtual-USD-card adapter for Sudo (sudo.africa).
// Verified end-to-end against the sandbox: funding source → customer (with
// identity) → USD wallet account → (sandbox) simulator-fund → issue card →
// freeze/unfreeze/cancel. Full PAN/CVV reveal is a separate PCI vault flow;
// this returns the masked PAN from the card object.
//
// Env: SUDO_API_KEY (required), SUDO_ENV = "sandbox" | "production".
export class SudoIssuer implements IssuerService {
  readonly name = "Sudo";
  readonly live = true;

  private readonly sandbox = (process.env.SUDO_ENV ?? "sandbox") !== "production";
  private readonly apiBase = this.sandbox
    ? "https://api.sandbox.sudo.cards"
    : "https://api.sudo.cards";
  private readonly apiKey = process.env.SUDO_API_KEY ?? "";

  // Sudo returns HTTP 201 with a business-level `statusCode` in the body, so we
  // key off that rather than the HTTP status.
  private async request<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    if (!this.apiKey) throw new Error("SUDO_API_KEY not set");
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    const code = (json as { statusCode?: number }).statusCode ?? res.status;
    if (code >= 400) {
      const m = (json as { message?: unknown }).message;
      throw new Error(typeof m === "string" ? m : JSON.stringify(m));
    }
    return ((json as { data?: T }).data ?? json) as T;
  }

  private brandName(brand: string): string {
    return brand === "mastercard" ? "MasterCard" : "Visa";
  }

  private async ensureFundingSource(): Promise<string> {
    const list = await this.request<Array<{ _id: string; isDefault?: boolean }>>(
      "GET",
      "/fundingsources"
    );
    const existing = Array.isArray(list)
      ? list.find((f) => f.isDefault) ?? list[0]
      : undefined;
    if (existing?._id) return existing._id;
    const created = await this.request<{ _id: string }>("POST", "/fundingsources", {
      type: "default",
      status: "active",
    });
    return created._id;
  }

  private async createCustomer(ctx: CustomerContext): Promise<string> {
    const c = await this.request<{ _id: string }>("POST", "/customers", {
      type: "individual",
      name: `${ctx.firstName} ${ctx.lastName}`.trim(),
      phoneNumber: ctx.phone || "+2340000000000",
      emailAddress: ctx.email,
      status: "active",
      individual: {
        firstName: ctx.firstName,
        lastName: ctx.lastName,
        dob: ctx.dob ? ctx.dob.replace(/-/g, "/") : "1990/01/01",
        // Sandbox accepts a test BVN; live would map the real national ID type.
        identity: {
          type: "BVN",
          number: (ctx.idNumber || "12345678901").replace(/\D/g, "").padEnd(11, "0").slice(0, 11),
        },
      },
      billingAddress: {
        line1: ctx.address || "1 Main St",
        city: ctx.city || "Accra",
        state: ctx.city || "Accra",
        country: ctx.country || "Ghana",
        postalCode: "00233",
      },
    });
    return c._id;
  }

  private async createAccount(customerId: string): Promise<string> {
    const a = await this.request<{ _id: string }>("POST", "/accounts", {
      type: "wallet",
      currency: "USD",
      accountType: "Current",
      customerId,
    });
    return a._id;
  }

  async issueCard(params: IssueCardParams): Promise<IssuedCard> {
    const ctx = params.customer;
    if (!ctx) throw new Error("SudoIssuer requires customer context.");

    const fundingSourceId = await this.ensureFundingSource();
    const customerId = ctx.providerCustomerId ?? (await this.createCustomer(ctx));
    const accountId = ctx.providerAccountId ?? (await this.createAccount(customerId));

    const load = Math.max(params.initialLoadUsd, 3);
    // In sandbox, top up the wallet so the card has backing. In production the
    // account is funded from your real USD float instead.
    if (this.sandbox) {
      await this.request("POST", "/accounts/simulator/fund", {
        accountId,
        amount: Math.ceil(load) + 5,
      });
    }

    const card = await this.request<{
      _id: string;
      maskedPan?: string;
      last4?: string;
      expiryMonth?: string;
      expiryYear?: string;
    }>("POST", "/cards", {
      customerId,
      fundingSourceId,
      type: "virtual",
      currency: "USD",
      status: "active",
      issuerCountry: "USA",
      debitAccountId: accountId,
      brand: this.brandName(params.brand),
      amount: load,
      enable2FA: false,
    });

    // Card object carries masked presentation fields.
    const full = card.maskedPan
      ? card
      : await this.request<typeof card>("GET", `/cards/${card._id}`);
    const last4 = full.last4 ?? full.maskedPan?.slice(-4) ?? "0000";

    return {
      providerRef: card._id,
      brand: params.brand,
      pan: full.maskedPan ?? `•••• •••• •••• ${last4}`,
      cvv: "•••",
      expMonth: Number(full.expiryMonth ?? 1),
      expYear: 2000 + Number(full.expiryYear ?? 30),
      last4,
      providerCustomerId: customerId,
      providerAccountId: accountId,
      masked: true,
    };
  }

  async freezeCard(providerRef: string): Promise<void> {
    await this.request("PUT", `/cards/${providerRef}`, { status: "inactive" });
  }

  async unfreezeCard(providerRef: string): Promise<void> {
    await this.request("PUT", `/cards/${providerRef}`, { status: "active" });
  }

  async terminateCard(providerRef: string): Promise<void> {
    // Cancel requires a creditAccountId to return any balance to.
    const card = await this.request<{ account?: { _id: string } }>(
      "GET",
      `/cards/${providerRef}`
    );
    await this.request("PUT", `/cards/${providerRef}`, {
      status: "canceled",
      cancellationReason: "lost",
      creditAccountId: card.account?._id,
    });
  }

  // Live card spends are authorized by the network and delivered to our webhook
  // (/api/issuer/webhook), not through a synchronous call. The mock's "Test
  // purchase" affordance is not used in live mode.
  async authorize(req: AuthorizationRequest): Promise<AuthorizationResult> {
    void req;
    return {
      approved: false,
      reason: "Live spends are authorized by the network via webhook.",
    };
  }
}
