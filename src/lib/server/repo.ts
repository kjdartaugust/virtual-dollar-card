import "server-only";
import { query, queryOne, withTransaction } from "@/lib/db";
import { CONFIG, ghsToUsd } from "@/lib/config";
import { getIssuer } from "@/lib/issuer";
import {
  DEFAULT_CONTROLS,
  evaluateControls,
  mccForMerchant,
  type Channel,
  type SpendingControls,
} from "@/lib/spending-controls";
import type {
  AppState,
  Card,
  CardBrand,
  IdType,
  Kyc,
  Profile,
  Transaction,
  Wallet,
} from "@/lib/types";

function ref(): string {
  const r = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2)
    )
      .slice(0, 8)
      .toUpperCase();
  return `DOLA-${r()}${r().slice(0, 2)}`;
}

/* ---------- mappers (Postgres numerics come back as strings) ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(r: any): Profile {
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    phone: r.phone ?? undefined,
    country: r.country,
    createdAt: new Date(r.created_at).toISOString(),
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapKyc(r: any | null): Kyc {
  if (!r) return { status: "unverified" };
  return {
    status: r.status,
    idType: r.id_type ?? undefined,
    idNumber: r.id_number ?? undefined,
    dateOfBirth: r.date_of_birth
      ? new Date(r.date_of_birth).toISOString().slice(0, 10)
      : undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    submittedAt: r.submitted_at
      ? new Date(r.submitted_at).toISOString()
      : undefined,
    reviewedAt: r.reviewed_at
      ? new Date(r.reviewed_at).toISOString()
      : undefined,
    rejectionReason: r.rejection_reason ?? undefined,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCard(r: any): Card {
  return {
    id: r.id,
    providerRef: r.provider_ref,
    brand: r.brand,
    label: r.label,
    pan: r.pan ?? `0000000000000000`.slice(0, 12) + r.last4,
    cvv: r.cvv ?? "000",
    expMonth: r.exp_month,
    expYear: r.exp_year,
    cardholder: r.cardholder,
    balance: Number(r.balance),
    status: r.status,
    color: r.color,
    createdAt: new Date(r.created_at).toISOString(),
    last4: r.last4,
    controls: { ...DEFAULT_CONTROLS, ...(r.spending_controls ?? {}) },
    spentThisMonth: Number(r.spent_this_month ?? 0),
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTxn(r: any): Transaction {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    amountUsd: Number(r.amount_usd),
    amountGhs: r.amount_ghs != null ? Number(r.amount_ghs) : undefined,
    rate: r.rate != null ? Number(r.rate) : undefined,
    fee: r.fee != null ? Number(r.fee) : undefined,
    merchant: r.merchant ?? undefined,
    cardId: r.card_id ?? undefined,
    cardLast4: r.card_last4 ?? undefined,
    reference: r.reference,
    note: r.note ?? undefined,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/* ---------- users / auth ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserByEmail(email: string): Promise<any | null> {
  return queryOne(`select * from users where lower(email) = lower($1)`, [
    email,
  ]);
}

export async function createUser(p: {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
}): Promise<string> {
  return withTransaction(async (c) => {
    const u = await c.query(
      `insert into users (email, password_hash, full_name, phone)
       values ($1,$2,$3,$4) returning id`,
      [p.email, p.passwordHash, p.fullName, p.phone ?? null]
    );
    const id = u.rows[0].id as string;
    await c.query(`insert into kyc (user_id) values ($1)`, [id]);
    await c.query(`insert into wallets (user_id) values ($1)`, [id]);
    return id;
  });
}

/* ---------- full state ---------- */
export async function getFullState(userId: string): Promise<AppState | null> {
  const profile = await queryOne(`select * from users where id = $1`, [userId]);
  if (!profile) return null;
  const kyc = await queryOne(`select * from kyc where user_id = $1`, [userId]);
  const wallet = await queryOne(`select * from wallets where user_id = $1`, [
    userId,
  ]);
  const cards = await query(
    `select c.*, s.pan, s.cvv,
            coalesce((
              select sum(abs(t.amount_usd)) from transactions t
              where t.card_id = c.id and t.type = 'card_spend'
                and t.status = 'success'
                and t.created_at >= date_trunc('month', now())
            ), 0) as spent_this_month
     from cards c
     left join card_secrets s on s.card_id = c.id
     where c.user_id = $1 order by c.created_at desc`,
    [userId]
  );
  const txns = await query(
    `select * from transactions where user_id = $1 order by created_at desc limit 200`,
    [userId]
  );
  const w: Wallet = wallet
    ? { usdBalance: Number(wallet.usd_balance), currency: "USD" }
    : { usdBalance: 0, currency: "USD" };
  return {
    profile: mapProfile(profile),
    kyc: mapKyc(kyc),
    wallet: w,
    cards: cards.map(mapCard),
    transactions: txns.map(mapTxn),
  };
}

/* ---------- KYC ---------- */
export async function submitKyc(
  userId: string,
  p: {
    idType: IdType;
    idNumber: string;
    dateOfBirth: string;
    address: string;
    city: string;
  }
): Promise<void> {
  await query(
    `update kyc set status='verified', id_type=$2, id_number=$3,
       date_of_birth=$4, address=$5, city=$6, submitted_at=now(), reviewed_at=now()
     where user_id=$1`,
    [userId, p.idType, p.idNumber, p.dateOfBirth, p.address, p.city]
  );
}

/* ---------- wallet funding (Paystack) ---------- */
export async function createPayment(
  userId: string,
  ghs: number,
  method: string,
  reference: string
): Promise<{ usd: number; rate: number }> {
  const { usd, rate } = ghsToUsd(ghs);
  await query(
    `insert into payments (reference, user_id, amount_ghs, amount_usd, rate, method)
     values ($1,$2,$3,$4,$5,$6)`,
    [reference, userId, ghs, usd, rate, method]
  );
  return { usd, rate };
}

// Idempotent: credits the wallet exactly once for a successful payment.
export async function creditPayment(
  reference: string
): Promise<{ credited: boolean; userId?: string }> {
  return withTransaction(async (c) => {
    const pRes = await c.query(
      `select * from payments where reference = $1 for update`,
      [reference]
    );
    const pay = pRes.rows[0];
    if (!pay) return { credited: false };
    if (pay.credited) return { credited: false, userId: pay.user_id };

    await c.query(
      `update payments set status='success', credited=true where reference=$1`,
      [reference]
    );
    await c.query(
      `update wallets set usd_balance = usd_balance + $2 where user_id=$1`,
      [pay.user_id, pay.amount_usd]
    );
    await c.query(
      `insert into transactions (user_id, type, status, amount_usd, amount_ghs, rate, reference, note)
       values ($1,'fund_wallet','success',$2,$3,$4,$5,$6)`,
      [
        pay.user_id,
        pay.amount_usd,
        pay.amount_ghs,
        pay.rate,
        reference,
        `Paystack · ${pay.method ?? "card"}`,
      ]
    );
    return { credited: true, userId: pay.user_id };
  });
}

/* ---------- cards ---------- */
export async function issueCard(
  userId: string,
  p: { label: string; brand: CardBrand; color: string; initialLoadUsd: number }
): Promise<{ ok: boolean; error?: string; cardId?: string }> {
  const user = await queryOne(
    `select full_name, email, phone, provider_customer_id from users where id=$1`,
    [userId]
  );
  const kyc = await queryOne(
    `select status, date_of_birth, id_number, address, city from kyc where user_id=$1`,
    [userId]
  );
  if (!user) return { ok: false, error: "User not found." };
  if (!kyc || kyc.status !== "verified")
    return { ok: false, error: "Complete identity verification first." };
  if (p.initialLoadUsd < CONFIG.minCardLoad)
    return { ok: false, error: `Load at least $${CONFIG.minCardLoad}.` };

  const total = p.initialLoadUsd + CONFIG.cardIssueFee;

  const [firstName, ...rest] = String(user.full_name).trim().split(/\s+/);
  let issued;
  try {
    issued = await getIssuer().issueCard({
      cardholder: user.full_name,
      brand: p.brand,
      initialLoadUsd: p.initialLoadUsd,
      label: p.label,
      customer: {
        firstName: firstName || "Card",
        lastName: rest.join(" ") || "Holder",
        email: user.email,
        phone: user.phone ?? undefined,
        dob: kyc.date_of_birth
          ? new Date(kyc.date_of_birth).toISOString().slice(0, 10)
          : undefined,
        idNumber: kyc.id_number ?? undefined,
        address: kyc.address ?? undefined,
        city: kyc.city ?? undefined,
        country: "Ghana",
        providerCustomerId: user.provider_customer_id ?? undefined,
      },
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Card issuer error.",
    };
  }

  return withTransaction(async (c) => {
    const wRes = await c.query(
      `select usd_balance from wallets where user_id=$1 for update`,
      [userId]
    );
    const bal = Number(wRes.rows[0]?.usd_balance ?? 0);
    if (bal < total)
      return {
        ok: false,
        error: `You need $${total.toFixed(2)} (load + $${CONFIG.cardIssueFee} fee).`,
      };

    const cardholder = String(user.full_name).toUpperCase();

    const cRes = await c.query(
      `insert into cards (user_id, provider_ref, brand, label, last4, exp_month, exp_year, cardholder, balance, color)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [
        userId,
        issued.providerRef,
        issued.brand,
        p.label,
        issued.last4,
        issued.expMonth,
        issued.expYear,
        cardholder,
        p.initialLoadUsd,
        p.color,
      ]
    );
    const cardId = cRes.rows[0].id as string;
    await c.query(
      `insert into card_secrets (card_id, pan, cvv) values ($1,$2,$3)`,
      [cardId, issued.pan, issued.cvv]
    );
    await c.query(
      `update wallets set usd_balance = usd_balance - $2 where user_id=$1`,
      [userId, total]
    );
    await c.query(
      `insert into transactions (user_id, card_id, type, status, amount_usd, card_last4, reference, note)
       values ($1,$2,'card_issue','success',$3,$4,$5,'Card creation fee')`,
      [userId, cardId, -CONFIG.cardIssueFee, issued.last4, ref()]
    );
    await c.query(
      `insert into transactions (user_id, card_id, type, status, amount_usd, card_last4, reference, note)
       values ($1,$2,'card_fund','success',$3,$4,$5,'Initial load · wallet → card')`,
      [userId, cardId, -p.initialLoadUsd, issued.last4, ref()]
    );
    // Remember the issuer cardholder id so future cards reuse it.
    if (issued.providerCustomerId && !user.provider_customer_id) {
      await c.query(`update users set provider_customer_id=$2 where id=$1`, [
        userId,
        issued.providerCustomerId,
      ]);
    }
    return { ok: true, cardId };
  });
}

type CardAction =
  | { kind: "fund"; amount: number }
  | { kind: "withdraw"; amount: number }
  | { kind: "spend"; amount: number; merchant: string }
  | { kind: "freeze" }
  | { kind: "unfreeze" }
  | { kind: "terminate" };

export async function cardAction(
  userId: string,
  cardId: string,
  action: CardAction
): Promise<{ ok: boolean; error?: string }> {
  const card = await queryOne(
    `select c.*, s.pan from cards c left join card_secrets s on s.card_id=c.id
     where c.id=$1 and c.user_id=$2`,
    [cardId, userId]
  );
  if (!card) return { ok: false, error: "Card not found." };
  const issuer = getIssuer();

  if (action.kind === "freeze" || action.kind === "unfreeze") {
    const frozen = action.kind === "freeze";
    if (frozen) await issuer.freezeCard(card.provider_ref);
    else await issuer.unfreezeCard(card.provider_ref);
    await query(`update cards set status=$2 where id=$1`, [
      cardId,
      frozen ? "frozen" : "active",
    ]);
    return { ok: true };
  }

  if (action.kind === "terminate") {
    await issuer.terminateCard(card.provider_ref);
    return withTransaction(async (c) => {
      const refund = Number(card.balance);
      if (refund > 0) {
        await c.query(
          `update wallets set usd_balance = usd_balance + $2 where user_id=$1`,
          [userId, refund]
        );
        await c.query(
          `insert into transactions (user_id, card_id, type, status, amount_usd, card_last4, reference, note)
           values ($1,$2,'card_refund','success',$3,$4,$5,'Balance returned on termination')`,
          [userId, cardId, refund, card.last4, ref()]
        );
      }
      await c.query(
        `update cards set status='terminated', balance=0 where id=$1`,
        [cardId]
      );
      return { ok: true };
    });
  }

  // On a live issuer, spends are decided by our JIT gateway, not by a
  // synchronous issuer call (issuer.authorize always declines — the network
  // authorizes). Route the spend through the gateway over HTTP so it takes the
  // exact path a real merchant charge takes. This must happen OUTSIDE the
  // transaction below: the gateway locks the same card row, so self-calling
  // while holding the lock would deadlock.
  if (action.kind === "spend" && issuer.live) {
    return networkSpend(userId, card, action.amount, action.merchant);
  }

  // Money-moving actions
  return withTransaction(async (c) => {
    const cRes = await c.query(
      `select balance, status, last4 from cards where id=$1 for update`,
      [cardId]
    );
    const bal = Number(cRes.rows[0].balance);
    const status = cRes.rows[0].status;
    const last4 = cRes.rows[0].last4;

    if (action.kind === "fund") {
      const wRes = await c.query(
        `select usd_balance from wallets where user_id=$1 for update`,
        [userId]
      );
      if (Number(wRes.rows[0].usd_balance) < action.amount)
        return { ok: false, error: "Insufficient wallet balance." };
      await c.query(
        `update wallets set usd_balance = usd_balance - $2 where user_id=$1`,
        [userId, action.amount]
      );
      await c.query(`update cards set balance = balance + $2 where id=$1`, [
        cardId,
        action.amount,
      ]);
      await c.query(
        `insert into transactions (user_id, card_id, type, status, amount_usd, card_last4, reference, note)
         values ($1,$2,'card_fund','success',$3,$4,$5,'Wallet → card')`,
        [userId, cardId, -action.amount, last4, ref()]
      );
      return { ok: true };
    }

    if (action.kind === "withdraw") {
      if (bal < action.amount)
        return { ok: false, error: "Amount exceeds card balance." };
      await c.query(
        `update wallets set usd_balance = usd_balance + $2 where user_id=$1`,
        [userId, action.amount]
      );
      await c.query(`update cards set balance = balance - $2 where id=$1`, [
        cardId,
        action.amount,
      ]);
      await c.query(
        `insert into transactions (user_id, card_id, type, status, amount_usd, card_last4, reference, note)
         values ($1,$2,'card_refund','success',$3,$4,$5,'Card → wallet')`,
        [userId, cardId, action.amount, last4, ref()]
      );
      return { ok: true };
    }

    // spend
    const decline = async (reason: string) => {
      await c.query(
        `insert into transactions (user_id, card_id, type, status, amount_usd, merchant, card_last4, reference, note)
         values ($1,$2,'card_spend','declined',$3,$4,$5,$6,$7)`,
        [userId, cardId, -action.amount, action.merchant, last4, ref(), reason]
      );
      return { ok: false, error: reason };
    };
    if (status !== "active") return decline("Card is not active");
    if (bal < action.amount) return decline("Insufficient card balance");
    const auth = await issuer.authorize({
      providerRef: card.provider_ref,
      amountUsd: action.amount,
      merchant: action.merchant,
    });
    if (!auth.approved) return decline(auth.reason ?? "Declined");

    await c.query(`update cards set balance = balance - $2 where id=$1`, [
      cardId,
      action.amount,
    ]);
    await c.query(
      `insert into transactions (user_id, card_id, type, status, amount_usd, merchant, card_last4, reference)
       values ($1,$2,'card_spend','success',$3,$4,$5,$6)`,
      [userId, cardId, -action.amount, action.merchant, last4, ref()]
    );
    return { ok: true };
  });
}

// Drives a spend on a live (issuer-backed) card through Dola's own JIT
// authorization gateway — the same endpoint, payload and ISO 8583 contract the
// card network uses when the card is charged at a real merchant. Nothing here
// is faked: the gateway approves or declines against the card's real balance,
// and the debit is written by the same handler a settled Sudo transaction hits.
//
// (Sudo's sandbox authorization simulator returns "Simulated successfully" but
// dispatches nothing, so it cannot be used to exercise this.)
const DECLINE_REASONS: Record<string, string> = {
  "51": "Insufficient card balance",
  "62": "Card is not active",
  "14": "Card not recognized by the issuer",
  "96": "Issuer system error",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function networkSpend(
  userId: string,
  card: any,
  amountUsd: number,
  merchant: string
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.ISSUER_WEBHOOK_URL;
  const token = process.env.SUDO_WEBHOOK_TOKEN;
  if (!url || !token)
    return { ok: false, error: "Authorization gateway is not configured." };

  const reference = ref();
  let declineReason: string | undefined;
  const post = async (body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: token },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    declineReason = json?.data?.reason;
    return json?.data?.responseCode as string | undefined;
  };

  const code = await post({
    type: "authorization.request",
    environment: "development",
    createdAt: Math.floor(Date.now() / 1000),
    data: {
      object: {
        _id: reference,
        card: { _id: card.provider_ref },
        currency: "USD",
        status: "pending",
        // Real MCCs, so category rules are exercised the way the network would.
        merchant: { name: merchant, category: mccForMerchant(merchant) },
        transactionMetadata: { channel: "web", type: "purchase", reference },
        // Authorizations carry minor units.
        pendingRequest: {
          amount: Math.round(amountUsd * 100),
          currency: "USD",
        },
      },
    },
  });

  if (code !== "00") {
    const reason =
      declineReason ?? DECLINE_REASONS[code ?? ""] ?? "Declined by issuer";
    await query(
      `insert into transactions (user_id, card_id, type, status, amount_usd, merchant, card_last4, reference, note)
       values ($1,$2,'card_spend','declined',$3,$4,$5,$6,$7)`,
      [userId, card.id, -amountUsd, merchant, card.last4, reference, reason]
    );
    return { ok: false, error: reason };
  }

  // Approved — the network settles, and the gateway writes the debit.
  await post({
    type: "transaction.created",
    data: {
      object: {
        _id: reference,
        card: card.provider_ref,
        // Settled amounts arrive in dollars, negative for a debit.
        amount: -amountUsd,
        currency: "USD",
        merchant: { name: merchant },
        transactionMetadata: { reference },
      },
    },
  });
  return { ok: true };
}

// Returns full PAN/CVV for a card the user owns. Prefers the issuer's secure
// reveal (Sudo vault); falls back to our own store (mock cards).
export async function revealCard(
  userId: string,
  cardId: string
): Promise<{ ok: boolean; pan?: string; cvv?: string; error?: string }> {
  const card = await queryOne(
    `select c.provider_ref, s.pan, s.cvv from cards c
     left join card_secrets s on s.card_id=c.id
     where c.id=$1 and c.user_id=$2`,
    [cardId, userId]
  );
  if (!card) return { ok: false, error: "Card not found." };
  try {
    const fromIssuer = await getIssuer().revealCard(card.provider_ref);
    if (fromIssuer) return { ok: true, ...fromIssuer };
  } catch (e) {
    console.error("revealCard issuer error:", e);
  }
  if (card.pan) return { ok: true, pan: card.pan, cvv: card.cvv };
  return { ok: false, error: "Card details unavailable." };
}

// Real-time authorization decision. Sudo's JIT gateway gives us ~4 seconds to
// answer, so this stays two indexed reads — no transaction, no issuer call.
// Response codes are ISO 8583, which is what the card network speaks.
export async function authorizeCardSpend(
  providerRef: string,
  amountUsd: number,
  ctx: { mcc?: string; channel?: Channel } = {}
): Promise<{ approved: boolean; responseCode: string; reason?: string }> {
  const card = await queryOne(
    `select id, status, balance, spending_controls from cards where provider_ref=$1`,
    [providerRef]
  );
  if (!card) return { approved: false, responseCode: "14" }; // no such card
  if (card.status === "terminated")
    return { approved: false, responseCode: "54" }; // expired/closed card
  if (card.status !== "active")
    return { approved: false, responseCode: "62" }; // restricted (frozen)
  if (Number(card.balance) < amountUsd)
    return { approved: false, responseCode: "51" }; // insufficient funds

  // The cardholder's own policy — the reason being the authorizer is worth
  // something. A monthly limit only needs a month-to-date sum when one is set.
  const controls: SpendingControls = {
    ...DEFAULT_CONTROLS,
    ...(card.spending_controls ?? {}),
  };
  const spentThisMonthUsd =
    controls.monthlyLimitUsd != null
      ? await cardSpentThisMonth(card.id)
      : 0;

  const verdict = evaluateControls(controls, {
    amountUsd,
    mcc: ctx.mcc,
    channel: ctx.channel,
    spentThisMonthUsd,
  });
  if (!verdict.allowed)
    return {
      approved: false,
      responseCode: verdict.responseCode,
      reason: verdict.reason,
    };

  return { approved: true, responseCode: "00" };
}

// Settled spend on a card since the start of the current calendar month.
// Declined attempts don't count against the limit.
async function cardSpentThisMonth(cardId: string): Promise<number> {
  const row = await queryOne(
    `select coalesce(sum(abs(amount_usd)), 0) as total from transactions
     where card_id=$1 and type='card_spend' and status='success'
       and created_at >= date_trunc('month', now())`,
    [cardId]
  );
  return Number(row?.total ?? 0);
}

// Persists the cardholder's policy and mirrors it onto the issuer, so a blocked
// spend is refused network-side even if our gateway is unreachable.
export async function setSpendingControls(
  userId: string,
  cardId: string,
  controls: SpendingControls
): Promise<{ ok: boolean; error?: string }> {
  const card = await queryOne(
    `select provider_ref from cards where id=$1 and user_id=$2`,
    [cardId, userId]
  );
  if (!card) return { ok: false, error: "Card not found." };

  await query(`update cards set spending_controls=$2 where id=$1`, [
    cardId,
    JSON.stringify(controls),
  ]);

  try {
    await getIssuer().setSpendingControls?.(card.provider_ref, controls);
  } catch (e) {
    // Ours is the enforcing copy; the issuer's is a backstop. Don't fail the
    // user's save because the issuer mirror didn't take.
    console.error("setSpendingControls issuer mirror failed:", e);
  }
  return { ok: true };
}

// Balance enquiry (card.balance): the network asks what the card is worth.
export async function cardBalanceUsd(
  providerRef: string
): Promise<number | null> {
  const card = await queryOne(
    `select balance from cards where provider_ref=$1`,
    [providerRef]
  );
  return card ? Number(card.balance) : null;
}

// Records a real card authorization delivered by the issuer webhook. Idempotent
// on the provider event reference so retries/duplicate deliveries are safe.
export async function recordCardSpend(p: {
  providerRef: string;
  amountUsd: number;
  merchant: string;
  externalRef: string;
}): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  return withTransaction(async (c) => {
    const dup = await c.query(`select 1 from transactions where reference=$1`, [
      p.externalRef,
    ]);
    if (dup.rows.length) return { ok: true, duplicate: true };

    const cardRes = await c.query(
      `select id, user_id, last4 from cards where provider_ref=$1 for update`,
      [p.providerRef]
    );
    const card = cardRes.rows[0];
    if (!card) return { ok: false, error: "Card not found for provider ref." };

    await c.query(
      `update cards set balance = greatest(0, balance - $2) where id=$1`,
      [card.id, p.amountUsd]
    );
    await c.query(
      `insert into transactions (user_id, card_id, type, status, amount_usd, merchant, card_last4, reference, note)
       values ($1,$2,'card_spend','success',$3,$4,$5,$6,'Live card authorization')`,
      [card.user_id, card.id, -p.amountUsd, p.merchant, card.last4, p.externalRef]
    );
    return { ok: true };
  });
}
