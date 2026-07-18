import "server-only";
import { query, queryOne, withTransaction } from "@/lib/db";

// Susu backend — rotating savings circles and personal savings goals for the
// native app, sharing Dola's Postgres and user accounts. Amounts are in GHS
// (the app's base currency); display conversion to USD stays client-side.
//
// The shapes returned here intentionally mirror the susu app's own types so the
// client can drop server data straight into its store (see step 3 of the merge).

export type Frequency = "weekly" | "biweekly" | "monthly";

export interface SusuMember {
  id: string;
  name: string;
  userId?: string | null; // set once a real user claims this slot (invites)
}

export interface SusuCircle {
  id: string;
  name: string;
  contribution: number; // GHS per member, per cycle
  frequency: Frequency;
  startDate: string; // ISO date
  members: SusuMember[]; // ordered by payout position
  paid: Record<string, boolean>; // `${cycleIndex}:${memberId}` -> true
}

export interface SusuTxn {
  id: string;
  amount: number; // GHS, + deposit / - withdrawal
  note: string;
  date: string; // ISO
}

export interface SusuGoal {
  id: string;
  name: string;
  target: number; // GHS
  txns: SusuTxn[];
}

export interface SusuState {
  circles: SusuCircle[];
  goals: SusuGoal[];
}

export const paidKey = (cycleIndex: number, memberId: string) =>
  `${cycleIndex}:${memberId}`;

/* ---------------------------------------------------------------- read ---- */

export async function getSusuState(userId: string): Promise<SusuState> {
  // Circles the user organizes. (Step 4 will widen this to circles they're a
  // member of, once slots link to real users.)
  const circleRows = await query(
    `select id, name, contribution, frequency, start_date
       from circles where owner_id = $1 order by created_at`,
    [userId]
  );
  const circleIds = circleRows.map((c) => c.id);

  const memberRows = circleIds.length
    ? await query(
        `select id, circle_id, position, name, user_id
           from circle_members where circle_id = any($1) order by position`,
        [circleIds]
      )
    : [];
  const paymentRows = circleIds.length
    ? await query(
        `select circle_id, member_id, cycle_index
           from circle_payments where circle_id = any($1)`,
        [circleIds]
      )
    : [];

  const goalRows = await query(
    `select id, name, target from goals where user_id = $1 order by created_at`,
    [userId]
  );
  const goalIds = goalRows.map((g) => g.id);
  const txnRows = goalIds.length
    ? await query(
        `select id, goal_id, amount, note, created_at
           from goal_txns where goal_id = any($1) order by created_at`,
        [goalIds]
      )
    : [];

  const circles: SusuCircle[] = circleRows.map((c) => {
    const members = memberRows
      .filter((m) => m.circle_id === c.id)
      .map((m) => ({ id: m.id, name: m.name, userId: m.user_id ?? null }));
    const paid: Record<string, boolean> = {};
    for (const p of paymentRows) {
      if (p.circle_id === c.id) paid[paidKey(p.cycle_index, p.member_id)] = true;
    }
    return {
      id: c.id,
      name: c.name,
      contribution: Number(c.contribution),
      frequency: c.frequency as Frequency,
      startDate: new Date(c.start_date).toISOString().slice(0, 10),
      members,
      paid,
    };
  });

  const goals: SusuGoal[] = goalRows.map((g) => ({
    id: g.id,
    name: g.name,
    target: Number(g.target),
    txns: txnRows
      .filter((t) => t.goal_id === g.id)
      .map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        note: t.note,
        date: new Date(t.created_at).toISOString(),
      })),
  }));

  return { circles, goals };
}

/* --------------------------------------------------------------- write ---- */

export interface NewCircle {
  name: string;
  contribution: number;
  frequency: Frequency;
  startDate: string; // ISO date
  members: string[]; // display names, in payout order
}

export async function createCircle(
  userId: string,
  input: NewCircle
): Promise<SusuState> {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `insert into circles (owner_id, name, contribution, frequency, start_date)
       values ($1, $2, $3, $4, $5) returning id`,
      [
        userId,
        input.name,
        input.contribution,
        input.frequency,
        input.startDate,
      ]
    );
    const circleId = rows[0].id;
    const names = input.members.length ? input.members : ["Me"];
    for (let i = 0; i < names.length; i++) {
      await client.query(
        `insert into circle_members (circle_id, position, name) values ($1, $2, $3)`,
        [circleId, i, names[i]]
      );
    }
  });
  return getSusuState(userId);
}

// Verifies the caller owns the circle before touching it.
async function ownsCircle(userId: string, circleId: string): Promise<boolean> {
  const row = await queryOne(
    `select 1 from circles where id = $1 and owner_id = $2`,
    [circleId, userId]
  );
  return !!row;
}

export async function deleteCircle(
  userId: string,
  circleId: string
): Promise<SusuState> {
  await query(`delete from circles where id = $1 and owner_id = $2`, [
    circleId,
    userId,
  ]);
  return getSusuState(userId);
}

export async function setPaid(
  userId: string,
  circleId: string,
  memberId: string,
  cycleIndex: number,
  paid: boolean
): Promise<SusuState> {
  if (!(await ownsCircle(userId, circleId)))
    throw new Error("Circle not found");
  // Guard the member belongs to this circle so a caller can't write rows for an
  // arbitrary member id.
  const member = await queryOne(
    `select 1 from circle_members where id = $1 and circle_id = $2`,
    [memberId, circleId]
  );
  if (!member) throw new Error("Member not found");

  if (paid) {
    await query(
      `insert into circle_payments (circle_id, member_id, cycle_index)
       values ($1, $2, $3) on conflict do nothing`,
      [circleId, memberId, cycleIndex]
    );
  } else {
    await query(
      `delete from circle_payments
        where circle_id = $1 and member_id = $2 and cycle_index = $3`,
      [circleId, memberId, cycleIndex]
    );
  }
  return getSusuState(userId);
}

export async function createGoal(
  userId: string,
  input: { name: string; target: number }
): Promise<SusuState> {
  await query(`insert into goals (user_id, name, target) values ($1, $2, $3)`, [
    userId,
    input.name,
    input.target,
  ]);
  return getSusuState(userId);
}

export async function deleteGoal(
  userId: string,
  goalId: string
): Promise<SusuState> {
  await query(`delete from goals where id = $1 and user_id = $2`, [
    goalId,
    userId,
  ]);
  return getSusuState(userId);
}

export async function addGoalTxn(
  userId: string,
  goalId: string,
  input: { amount: number; note?: string }
): Promise<SusuState> {
  // Scope the insert to a goal the caller owns via a subquery, so an id they
  // don't own inserts nothing.
  await query(
    `insert into goal_txns (goal_id, amount, note)
     select $1, $2, $3 where exists
       (select 1 from goals where id = $1 and user_id = $4)`,
    [goalId, input.amount, input.note ?? "", userId]
  );
  return getSusuState(userId);
}
