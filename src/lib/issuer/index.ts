import { MockIssuer } from "./mock";
import { SudoIssuer } from "./sudo";
import type { IssuerService } from "./types";

// Single place to swap the issuer implementation. Selected by the server-only
// ISSUER_PROVIDER env var (not NEXT_PUBLIC), so the client always resolves to
// the mock — real provider adapters only ever run server-side.
//
// Adding a provider is one file implementing IssuerService plus a case here.
// Note that Dola authorizes its own spends (see /api/issuer/webhook), so a new
// provider must support real-time/JIT authorization to preserve that — issuers
// that only settle against their own wallet would need a different design.
let instance: IssuerService | null = null;

export function getIssuer(): IssuerService {
  if (instance) return instance;
  const provider = process.env.ISSUER_PROVIDER ?? "mock";
  switch (provider) {
    case "sudo":
      instance = new SudoIssuer();
      break;
    case "mock":
    default:
      instance = new MockIssuer();
      break;
  }
  return instance;
}

export type { IssuerService } from "./types";
