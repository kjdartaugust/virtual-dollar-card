import { MockIssuer } from "./mock";
import type { IssuerService } from "./types";

// Single place to swap the issuer implementation.
// To go live: implement IssuerService against your provider (Miden/Korapay/Fyatu)
// and return it here when the relevant env keys are present.
let instance: IssuerService | null = null;

export function getIssuer(): IssuerService {
  if (!instance) {
    instance = new MockIssuer();
  }
  return instance;
}

export type { IssuerService } from "./types";
