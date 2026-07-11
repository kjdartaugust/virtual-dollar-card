import { sleep } from "@/lib/utils";
import type {
  AuthorizationRequest,
  AuthorizationResult,
  IssueCardParams,
  IssuedCard,
  IssuerService,
} from "./types";

// A deterministic-ish test-card generator. Numbers are non-real Luhn-valid PANs
// in the standard test BIN ranges — safe for demos, never routable.
function luhnComplete(partial: string): string {
  const digits = partial.split("").map(Number);
  let sum = 0;
  let alt = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  const check = (10 - (sum % 10)) % 10;
  return partial + check;
}

function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function generatePan(brand: "visa" | "mastercard"): string {
  // Test BINs: Visa 4242 42, Mastercard 5555 55
  const bin = brand === "visa" ? "424242" : "555555";
  const body = bin + randomDigits(9); // 15 digits
  return luhnComplete(body); // 16 digits, Luhn-valid
}

export class MockIssuer implements IssuerService {
  readonly name = "Dola Sandbox Issuer";
  readonly live = false;
  private frozen = new Set<string>();

  async issueCard(params: IssueCardParams): Promise<IssuedCard> {
    await sleep(650); // emulate network + provider processing
    const pan = generatePan(params.brand);
    const now = new Date();
    return {
      providerRef: "iss_" + randomDigits(12),
      brand: params.brand,
      pan,
      cvv: randomDigits(3),
      expMonth: now.getMonth() + 1,
      expYear: now.getFullYear() + 3,
      last4: pan.slice(-4),
    };
  }

  async freezeCard(ref: string): Promise<void> {
    await sleep(300);
    this.frozen.add(ref);
  }

  async unfreezeCard(ref: string): Promise<void> {
    await sleep(300);
    this.frozen.delete(ref);
  }

  async terminateCard(ref: string): Promise<void> {
    await sleep(300);
    this.frozen.delete(ref);
  }

  async authorize(req: AuthorizationRequest): Promise<AuthorizationResult> {
    await sleep(500);
    if (this.frozen.has(req.providerRef)) {
      return { approved: false, reason: "Card is frozen" };
    }
    if (req.amountUsd <= 0) {
      return { approved: false, reason: "Invalid amount" };
    }
    return { approved: true, authCode: randomDigits(6) };
  }

  // The mock doesn't hold secrets — they live in our own store/DB.
  async revealCard(): Promise<{ pan: string; cvv: string } | null> {
    return null;
  }
}
