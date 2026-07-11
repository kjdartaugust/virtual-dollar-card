// Spending controls — the policy Dola's authorization gateway enforces before a
// card spend is approved.
//
// This is the payoff of being the authorizer: the rules live in our database and
// are applied to the live authorization, so "lock this card to streaming, $20 a
// month, web only" is enforced at the moment the card is charged — not
// reconciled after the fact.
//
// Verdicts are ISO 8583, same as the balance check.

export type Channel = "web" | "pos" | "atm" | "mobile";

export interface SpendingControls {
  // Null = no limit. Applies to settled spends in the current calendar month.
  monthlyLimitUsd: number | null;
  // Merchant category groups the card may NOT be used at.
  blockedCategories: string[];
  // Channels the card may be used on.
  channels: Record<Channel, boolean>;
}

export const DEFAULT_CONTROLS: SpendingControls = {
  monthlyLimitUsd: null,
  blockedCategories: [],
  channels: { web: true, pos: true, atm: true, mobile: true },
};

// Merchant category groups, keyed to the ISO 18245 MCCs the network actually
// sends in the authorization.
export const CATEGORY_GROUPS: Record<
  string,
  { label: string; mccs: string[] }
> = {
  streaming: { label: "Streaming", mccs: ["5815"] },
  games: { label: "Games", mccs: ["5816"] },
  software: { label: "Software & cloud", mccs: ["5817", "7372"] },
  advertising: { label: "Advertising", mccs: ["7311"] },
  shopping: { label: "Shopping", mccs: ["5942", "5999"] },
  gambling: { label: "Gambling", mccs: ["7995"] },
  crypto: { label: "Crypto", mccs: ["6051"] },
};

export function groupForMcc(mcc: string): string | undefined {
  return Object.keys(CATEGORY_GROUPS).find((k) =>
    CATEGORY_GROUPS[k].mccs.includes(mcc)
  );
}

// The merchants offered in the app's test-purchase flow, each with the MCC the
// real merchant carries — so a category rule is exercised exactly as the network
// would exercise it.
export const DEMO_MERCHANTS: Record<string, string> = {
  Netflix: "5815",
  Spotify: "5815",
  Steam: "5816",
  OpenAI: "5817",
  AWS: "7372",
  "Meta Ads": "7311",
  "Google Ads": "7311",
  Amazon: "5999",
  "Bet9ja": "7995",
  Binance: "6051",
};

export function mccForMerchant(name: string): string {
  return DEMO_MERCHANTS[name] ?? "5999";
}

export interface AuthorizationContext {
  amountUsd: number;
  mcc?: string;
  channel?: Channel;
  spentThisMonthUsd: number;
}

export interface ControlVerdict {
  allowed: boolean;
  responseCode: string;
  reason?: string;
}

const ALLOWED: ControlVerdict = { allowed: true, responseCode: "00" };

export function evaluateControls(
  controls: SpendingControls,
  ctx: AuthorizationContext
): ControlVerdict {
  // 58 — transaction not permitted to terminal
  if (ctx.channel && controls.channels[ctx.channel] === false) {
    return {
      allowed: false,
      responseCode: "58",
      reason: `${ctx.channel.toUpperCase()} payments are turned off for this card`,
    };
  }

  // 57 — transaction not permitted to cardholder
  if (ctx.mcc) {
    const group = groupForMcc(ctx.mcc);
    if (group && controls.blockedCategories.includes(group)) {
      return {
        allowed: false,
        responseCode: "57",
        reason: `${CATEGORY_GROUPS[group].label} is blocked on this card`,
      };
    }
  }

  // 61 — exceeds withdrawal amount limit
  if (controls.monthlyLimitUsd != null) {
    const after = ctx.spentThisMonthUsd + ctx.amountUsd;
    if (after > controls.monthlyLimitUsd) {
      return {
        allowed: false,
        responseCode: "61",
        reason: `Monthly limit of $${controls.monthlyLimitUsd.toFixed(
          2
        )} would be exceeded`,
      };
    }
  }

  return ALLOWED;
}

// Sudo enforces its own copy of these rules network-side, so we mirror ours onto
// the card. Defence in depth: if our gateway is ever unreachable, the issuer
// still refuses a blocked spend.
export function toSudoSpendingControls(c: SpendingControls) {
  const blockedMccs = c.blockedCategories.flatMap(
    (g) => CATEGORY_GROUPS[g]?.mccs ?? []
  );
  return {
    blockedCategories: blockedMccs,
    channels: c.channels,
    spendingLimits:
      c.monthlyLimitUsd != null
        ? [{ amount: c.monthlyLimitUsd, interval: "monthly" }]
        : [],
  };
}
