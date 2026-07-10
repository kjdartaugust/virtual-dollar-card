import "server-only";
import crypto from "node:crypto";

const SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE = "https://api.paystack.co";

export const paystackEnabled = !!SECRET;

export interface InitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

// Initialize a checkout. Amount is in GHS (we convert to pesewas).
export async function initTransaction(p: {
  email: string;
  amountGhs: number;
  reference: string;
  callbackUrl: string;
}): Promise<InitResult> {
  if (!SECRET) throw new Error("PAYSTACK_SECRET_KEY not set");
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: p.email,
      amount: Math.round(p.amountGhs * 100), // pesewas
      currency: "GHS",
      reference: p.reference,
      callback_url: p.callbackUrl,
      channels: ["card", "mobile_money", "bank"],
    }),
  });
  const json = await res.json();
  if (!json.status)
    throw new Error(json.message || "Paystack initialize failed");
  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

export async function verifyTransaction(
  reference: string
): Promise<{ success: boolean; amountGhs?: number }> {
  if (!SECRET) throw new Error("PAYSTACK_SECRET_KEY not set");
  const res = await fetch(`${BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  const json = await res.json();
  const ok = json.status && json.data?.status === "success";
  return {
    success: !!ok,
    amountGhs: json.data?.amount ? json.data.amount / 100 : undefined,
  };
}

// Verify the x-paystack-signature header against the raw request body.
export function verifyWebhook(rawBody: string, signature: string): boolean {
  if (!SECRET) return false;
  const hash = crypto
    .createHmac("sha512", SECRET)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}
