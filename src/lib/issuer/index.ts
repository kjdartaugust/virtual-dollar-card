import { MockIssuer } from "./mock";
import { MidenIssuer } from "./miden";
import { SudoIssuer } from "./sudo";
import type { IssuerService } from "./types";

// Single place to swap the issuer implementation. Selected by the server-only
// ISSUER_PROVIDER env var (not NEXT_PUBLIC), so the client always resolves to
// the mock — real provider adapters only ever run server-side.
let instance: IssuerService | null = null;

export function getIssuer(): IssuerService {
  if (instance) return instance;
  const provider = process.env.ISSUER_PROVIDER ?? "mock";
  switch (provider) {
    case "sudo":
      instance = new SudoIssuer();
      break;
    case "miden":
      instance = new MidenIssuer();
      break;
    case "mock":
    default:
      instance = new MockIssuer();
      break;
  }
  return instance;
}

export type { IssuerService } from "./types";
