"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type {
  AppState,
  Card,
  CardBrand,
  IdType,
  Profile,
  Transaction,
} from "@/lib/types";
import { CONFIG, ghsToUsd } from "@/lib/config";
import { getIssuer } from "@/lib/issuer";
import { uid } from "@/lib/utils";
import { demoState, emptyState } from "./seed";

interface Account {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

const ACCOUNTS_KEY = "dola:accounts";
const SESSION_KEY = "dola:session";
const stateKey = (id: string) => `dola:state:${id}`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function newReference() {
  return "DOLA-" + uid().toUpperCase() + uid().slice(0, 2).toUpperCase();
}

interface StoreContextValue {
  ready: boolean;
  state: AppState | null;
  isDemo: boolean;
  // auth
  signUp: (p: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginDemo: () => void;
  logout: () => void;
  // app actions
  submitKyc: (p: {
    idType: IdType;
    idNumber: string;
    dateOfBirth: string;
    address: string;
    city: string;
  }) => void;
  fundWallet: (
    ghs: number,
    method: string
  ) => Promise<{ ok: boolean; usd?: number; error?: string }>;
  issueCard: (p: {
    label: string;
    brand: CardBrand;
    color: string;
    initialLoadUsd: number;
  }) => Promise<{ ok: boolean; card?: Card; error?: string }>;
  fundCard: (
    cardId: string,
    usd: number
  ) => Promise<{ ok: boolean; error?: string }>;
  withdrawCard: (
    cardId: string,
    usd: number
  ) => Promise<{ ok: boolean; error?: string }>;
  setCardFrozen: (cardId: string, frozen: boolean) => Promise<void>;
  terminateCard: (cardId: string) => Promise<void>;
  spend: (
    cardId: string,
    usd: number,
    merchant: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const issuer = getIssuer();

  const isDemo = sessionId === "demo";

  // Load session on mount.
  useEffect(() => {
    const sid = read<string | null>(SESSION_KEY, null);
    if (sid) {
      const loaded = read<AppState | null>(stateKey(sid), null);
      if (loaded) {
        setSessionId(sid);
        setState(loaded);
      }
    }
    setReady(true);
  }, []);

  // Persist state whenever it changes.
  useEffect(() => {
    if (sessionId && state) write(stateKey(sessionId), state);
  }, [sessionId, state]);

  const pushTxn = (s: AppState, txn: Transaction): AppState => ({
    ...s,
    transactions: [txn, ...s.transactions],
  });

  const signUp: StoreContextValue["signUp"] = (p) => {
    const accounts = read<Account[]>(ACCOUNTS_KEY, []);
    if (accounts.some((a) => a.email.toLowerCase() === p.email.toLowerCase())) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const account: Account = {
      id: uid("usr_"),
      email: p.email,
      password: p.password,
      fullName: p.fullName,
      phone: p.phone,
    };
    write(ACCOUNTS_KEY, [...accounts, account]);
    const profile: Profile = {
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      phone: account.phone,
      country: "Ghana",
      createdAt: new Date().toISOString(),
    };
    const fresh = emptyState(profile);
    write(stateKey(account.id), fresh);
    write(SESSION_KEY, account.id);
    setSessionId(account.id);
    setState(fresh);
    return { ok: true };
  };

  const login: StoreContextValue["login"] = (email, password) => {
    const accounts = read<Account[]>(ACCOUNTS_KEY, []);
    const acct = accounts.find(
      (a) => a.email.toLowerCase() === email.toLowerCase()
    );
    if (!acct || acct.password !== password) {
      return { ok: false, error: "Invalid email or password." };
    }
    const loaded =
      read<AppState | null>(stateKey(acct.id), null) ??
      emptyState({
        id: acct.id,
        email: acct.email,
        fullName: acct.fullName,
        phone: acct.phone,
        country: "Ghana",
        createdAt: new Date().toISOString(),
      });
    write(SESSION_KEY, acct.id);
    setSessionId(acct.id);
    setState(loaded);
    return { ok: true };
  };

  const loginDemo = () => {
    const existing = read<AppState | null>(stateKey("demo"), null);
    const fresh = existing ?? demoState();
    write(stateKey("demo"), fresh);
    write(SESSION_KEY, "demo");
    setSessionId("demo");
    setState(fresh);
  };

  const logout = () => {
    write(SESSION_KEY, "");
    if (typeof window !== "undefined")
      window.localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setState(null);
  };

  const submitKyc: StoreContextValue["submitKyc"] = (p) => {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        kyc: {
          status: "verified", // sandbox: auto-approve
          idType: p.idType,
          idNumber: p.idNumber,
          dateOfBirth: p.dateOfBirth,
          address: p.address,
          city: p.city,
          submittedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        },
      };
    });
  };

  const fundWallet: StoreContextValue["fundWallet"] = async (ghs, method) => {
    if (ghs < CONFIG.minFundGhs)
      return { ok: false, error: `Minimum is GHS ${CONFIG.minFundGhs}.` };
    if (ghs > CONFIG.maxFundGhs)
      return { ok: false, error: `Maximum is GHS ${CONFIG.maxFundGhs}.` };
    const { usd, rate } = ghsToUsd(ghs);
    setState((s) => {
      if (!s) return s;
      const txn: Transaction = {
        id: uid("txn_"),
        type: "fund_wallet",
        status: "success",
        amountUsd: usd,
        amountGhs: ghs,
        rate,
        reference: newReference(),
        note: `Paystack · ${method}`,
        createdAt: new Date().toISOString(),
      };
      return pushTxn(
        { ...s, wallet: { ...s.wallet, usdBalance: +(s.wallet.usdBalance + usd).toFixed(2) } },
        txn
      );
    });
    return { ok: true, usd };
  };

  const issueCard: StoreContextValue["issueCard"] = async (p) => {
    if (!state) return { ok: false, error: "Not signed in." };
    if (state.kyc.status !== "verified")
      return { ok: false, error: "Complete identity verification first." };
    const totalNeeded = p.initialLoadUsd + CONFIG.cardIssueFee;
    if (p.initialLoadUsd < CONFIG.minCardLoad)
      return {
        ok: false,
        error: `Load at least $${CONFIG.minCardLoad} onto a new card.`,
      };
    if (state.wallet.usdBalance < totalNeeded)
      return {
        ok: false,
        error: `You need ${totalNeeded.toFixed(2)} USD (load + $${CONFIG.cardIssueFee} fee). Top up your wallet.`,
      };

    const issued = await issuer.issueCard({
      cardholder: state.profile.fullName,
      brand: p.brand,
      initialLoadUsd: p.initialLoadUsd,
      label: p.label,
    });

    const card: Card = {
      id: uid("card_"),
      providerRef: issued.providerRef,
      brand: issued.brand,
      label: p.label,
      pan: issued.pan,
      cvv: issued.cvv,
      expMonth: issued.expMonth,
      expYear: issued.expYear,
      cardholder: state.profile.fullName.toUpperCase(),
      balance: p.initialLoadUsd,
      status: "active",
      color: p.color,
      createdAt: new Date().toISOString(),
      last4: issued.last4,
    };

    setState((s) => {
      if (!s) return s;
      const now = new Date().toISOString();
      const feeTxn: Transaction = {
        id: uid("txn_"),
        type: "card_issue",
        status: "success",
        amountUsd: -CONFIG.cardIssueFee,
        cardId: card.id,
        cardLast4: card.last4,
        reference: newReference(),
        note: "Card creation fee",
        createdAt: now,
      };
      const loadTxn: Transaction = {
        id: uid("txn_"),
        type: "card_fund",
        status: "success",
        amountUsd: -p.initialLoadUsd,
        cardId: card.id,
        cardLast4: card.last4,
        reference: newReference(),
        note: "Initial load · wallet → card",
        createdAt: now,
      };
      return {
        ...s,
        wallet: {
          ...s.wallet,
          usdBalance: +(s.wallet.usdBalance - totalNeeded).toFixed(2),
        },
        cards: [card, ...s.cards],
        transactions: [loadTxn, feeTxn, ...s.transactions],
      };
    });
    return { ok: true, card };
  };

  const fundCard: StoreContextValue["fundCard"] = async (cardId, usd) => {
    if (!state) return { ok: false, error: "Not signed in." };
    if (usd <= 0) return { ok: false, error: "Enter an amount." };
    if (state.wallet.usdBalance < usd)
      return { ok: false, error: "Insufficient wallet balance." };
    setState((s) => {
      if (!s) return s;
      const card = s.cards.find((c) => c.id === cardId);
      if (!card) return s;
      const txn: Transaction = {
        id: uid("txn_"),
        type: "card_fund",
        status: "success",
        amountUsd: -usd,
        cardId,
        cardLast4: card.last4,
        reference: newReference(),
        note: "Wallet → card",
        createdAt: new Date().toISOString(),
      };
      return pushTxn(
        {
          ...s,
          wallet: {
            ...s.wallet,
            usdBalance: +(s.wallet.usdBalance - usd).toFixed(2),
          },
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, balance: +(c.balance + usd).toFixed(2) } : c
          ),
        },
        txn
      );
    });
    return { ok: true };
  };

  const withdrawCard: StoreContextValue["withdrawCard"] = async (cardId, usd) => {
    if (!state) return { ok: false, error: "Not signed in." };
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return { ok: false, error: "Card not found." };
    if (usd <= 0) return { ok: false, error: "Enter an amount." };
    if (card.balance < usd)
      return { ok: false, error: "Amount exceeds card balance." };
    setState((s) => {
      if (!s) return s;
      const txn: Transaction = {
        id: uid("txn_"),
        type: "card_refund",
        status: "success",
        amountUsd: usd,
        cardId,
        cardLast4: card.last4,
        reference: newReference(),
        note: "Card → wallet",
        createdAt: new Date().toISOString(),
      };
      return pushTxn(
        {
          ...s,
          wallet: {
            ...s.wallet,
            usdBalance: +(s.wallet.usdBalance + usd).toFixed(2),
          },
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, balance: +(c.balance - usd).toFixed(2) } : c
          ),
        },
        txn
      );
    });
    return { ok: true };
  };

  const setCardFrozen: StoreContextValue["setCardFrozen"] = async (
    cardId,
    frozen
  ) => {
    const card = state?.cards.find((c) => c.id === cardId);
    if (!card) return;
    if (frozen) await issuer.freezeCard(card.providerRef);
    else await issuer.unfreezeCard(card.providerRef);
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        cards: s.cards.map((c) =>
          c.id === cardId
            ? { ...c, status: frozen ? "frozen" : "active" }
            : c
        ),
      };
    });
  };

  const terminateCard: StoreContextValue["terminateCard"] = async (cardId) => {
    const card = state?.cards.find((c) => c.id === cardId);
    if (!card) return;
    await issuer.terminateCard(card.providerRef);
    setState((s) => {
      if (!s) return s;
      // Refund remaining card balance to wallet on termination.
      const refund = card.balance;
      const txns: Transaction[] = [];
      if (refund > 0) {
        txns.push({
          id: uid("txn_"),
          type: "card_refund",
          status: "success",
          amountUsd: refund,
          cardId,
          cardLast4: card.last4,
          reference: newReference(),
          note: "Balance returned on termination",
          createdAt: new Date().toISOString(),
        });
      }
      return {
        ...s,
        wallet: {
          ...s.wallet,
          usdBalance: +(s.wallet.usdBalance + refund).toFixed(2),
        },
        cards: s.cards.map((c) =>
          c.id === cardId ? { ...c, status: "terminated", balance: 0 } : c
        ),
        transactions: [...txns, ...s.transactions],
      };
    });
  };

  const spend: StoreContextValue["spend"] = async (cardId, usd, merchant) => {
    if (!state) return { ok: false, error: "Not signed in." };
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return { ok: false, error: "Card not found." };

    const auth = await issuer.authorize({
      providerRef: card.providerRef,
      amountUsd: usd,
      merchant,
    });

    const declined = (reason: string) => {
      setState((s) => {
        if (!s) return s;
        const txn: Transaction = {
          id: uid("txn_"),
          type: "card_spend",
          status: "declined",
          amountUsd: -usd,
          merchant,
          cardId,
          cardLast4: card.last4,
          reference: newReference(),
          note: reason,
          createdAt: new Date().toISOString(),
        };
        return pushTxn(s, txn);
      });
      return { ok: false, error: reason };
    };

    if (!auth.approved) return declined(auth.reason ?? "Declined");
    if (card.status !== "active") return declined("Card is not active");
    if (card.balance < usd) return declined("Insufficient card balance");

    setState((s) => {
      if (!s) return s;
      const txn: Transaction = {
        id: uid("txn_"),
        type: "card_spend",
        status: "success",
        amountUsd: -usd,
        merchant,
        cardId,
        cardLast4: card.last4,
        reference: newReference(),
        createdAt: new Date().toISOString(),
      };
      return pushTxn(
        {
          ...s,
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, balance: +(c.balance - usd).toFixed(2) } : c
          ),
        },
        txn
      );
    });
    return { ok: true };
  };

  const value: StoreContextValue = {
    ready,
    state,
    isDemo,
    signUp,
    login,
    loginDemo,
    logout,
    submitKyc,
    fundWallet,
    issueCard,
    fundCard,
    withdrawCard,
    setCardFrozen,
    terminateCard,
    spend,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
