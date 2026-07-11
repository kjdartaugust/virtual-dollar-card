import "server-only";
import { query, queryOne, withTransaction } from "@/lib/db";
import { CONFIG, ghsToUsd } from "@/lib/config";
import { getIssuer } from "@/lib/issuer";
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
    `select c.*, s.pan, s.cvv from cards c
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
