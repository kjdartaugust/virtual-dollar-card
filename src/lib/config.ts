// Pricing & FX configuration — the levers a real issuer business tunes to make margin.

export const CONFIG = {
  // Base interbank rate GHS per 1 USD (demo value).
  baseRate: 12.4,
  // Your markup on the FX rate — this is a core profit source.
  fxSpread: 0.035, // 3.5%
  // One-time fee to create a virtual card (USD).
  cardIssueFee: 1.5,
  // Minimum first load when creating a card (USD).
  minCardLoad: 3,
  // Wallet funding limits (GHS).
  minFundGhs: 20,
  maxFundGhs: 50000,
  // Paystack charges ~1.95% on local transactions; surfaced for transparency.
  paystackFeePct: 0.0195,
  supportEmail: "support@dola.africa",
  brandName: "Dola",
};

// Customer-facing sell rate (includes your spread).
export function sellRate(): number {
  return +(CONFIG.baseRate * (1 + CONFIG.fxSpread)).toFixed(2);
}

// Convert a GHS amount the customer pays into the USD they receive in-wallet.
export function ghsToUsd(ghs: number): { usd: number; rate: number } {
  const rate = sellRate();
  return { usd: +(ghs / rate).toFixed(2), rate };
}

export function usdToGhs(usd: number): { ghs: number; rate: number } {
  const rate = sellRate();
  return { ghs: +(usd * rate).toFixed(2), rate };
}
