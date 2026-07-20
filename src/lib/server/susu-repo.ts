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
  owner: boolean; // true when the current user organizes this circle
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
  /** The signed-in user's name, so any device can greet them after login. */
  userName: string;
  /** The signed-in user's id, so the client can tell which member is them
   *  without comparing display names (which are free text and collide). */
  userId: string;
}

export const paidKey = (cycleIndex: number, memberId: string) =>
  `${cycleIndex}:${memberId}`;

/* ---------------------------------------------------------------- read ---- */

export async function getSusuState(userId: string): Promise<SusuState> {
  // Circles the user organizes OR belongs to (a slot claimed via an invite).
  const circleRows = await query(
    `select id, name, contribution, frequency, start_date, owner_id
       from circles
      where owner_id = $1
         or id in (select circle_id from circle_members where user_id = $1)
      order by created_at`,
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

  const userRow = await queryOne(
    `select full_name from users where id = $1`,
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
      owner: c.owner_id === userId,
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

  return { circles, goals, userName: userRow?.full_name ?? "", userId };
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
      // Position 0 is the organiser — the app pre-fills their own name as the
      // first member. Claiming that slot for them means they are identifiable
      // among the members (so "you" and their own contributions resolve), and
      // they are never offered an invite to their own seat.
      await client.query(
        `insert into circle_members (circle_id, position, name, user_id)
         values ($1, $2, $3, $4)`,
        [circleId, i, names[i], i === 0 ? userId : null]
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

/* --------------------------------------------------------------- invites -- */

function inviteToken(): string {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  ).slice(0, 24);
}

// Owner creates (or reuses) an invite for one still-unclaimed member slot.
export async function createInvite(
  userId: string,
  circleId: string,
  memberId: string
): Promise<string> {
  if (!(await ownsCircle(userId, circleId)))
    throw new Error("Circle not found");
  const member = await queryOne(
    `select user_id from circle_members where id = $1 and circle_id = $2`,
    [memberId, circleId]
  );
  if (!member) throw new Error("Member not found");
  if (member.user_id) throw new Error("That member has already joined");

  const existing = await queryOne(
    `select token from circle_invites
      where member_id = $1 and claimed_by is null limit 1`,
    [memberId]
  );
  if (existing) return existing.token;

  const token = inviteToken();
  await query(
    `insert into circle_invites (token, circle_id, member_id) values ($1, $2, $3)`,
    [token, circleId, memberId]
  );
  return token;
}

export interface InvitePreview {
  circleName: string;
  memberName: string;
  contribution: number;
  claimed: boolean;
  frequency: Frequency;
  /** Everyone in the circle, in payout order, so the invitee can see the group
   *  and their own seat in it before committing. */
  members: string[];
  /** The invitee's position in that list. */
  position: number;
  /** Who organises the circle. */
  organiser: string;
}

export async function getInvitePreview(
  token: string
): Promise<InvitePreview | null> {
  const row = await queryOne(
    `select ci.claimed_by, ci.circle_id, cm.name as member_name,
            cm.position, c.name as circle_name, c.contribution, c.frequency,
            owner.full_name as organiser
       from circle_invites ci
       join circle_members cm on cm.id = ci.member_id
       join circles c on c.id = ci.circle_id
       join users owner on owner.id = c.owner_id
      where ci.token = $1`,
    [token]
  );
  if (!row) return null;

  const memberRows = await query(
    `select name from circle_members where circle_id = $1 order by position`,
    [row.circle_id]
  );

  return {
    circleName: row.circle_name,
    memberName: row.member_name,
    contribution: Number(row.contribution),
    claimed: !!row.claimed_by,
    frequency: row.frequency as Frequency,
    members: memberRows.map((m) => m.name),
    position: Number(row.position),
    organiser: row.organiser,
  };
}

// The invitee claims the slot: their user id is written onto the member row and
// the invite is marked used. Row-locked so a slot can't be claimed twice.
export async function acceptInvite(
  userId: string,
  token: string
): Promise<SusuState> {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `select member_id, claimed_by from circle_invites where token = $1 for update`,
      [token]
    );
    const invite = rows[0];
    if (!invite) throw new Error("Invite not found");
    if (invite.claimed_by) throw new Error("This invite has already been used");

    const { rows: mrows } = await client.query(
      `select circle_id, user_id from circle_members where id = $1`,
      [invite.member_id]
    );
    const member = mrows[0];
    if (!member) throw new Error("Member not found");
    if (member.user_id) throw new Error("That slot is already taken");

    const { rows: dup } = await client.query(
      `select 1 from circle_members where circle_id = $1 and user_id = $2`,
      [member.circle_id, userId]
    );
    if (dup[0]) throw new Error("You're already in this circle");

    await client.query(`update circle_members set user_id = $1 where id = $2`, [
      userId,
      invite.member_id,
    ]);
    await client.query(
      `update circle_invites set claimed_by = $1, claimed_at = now() where token = $2`,
      [userId, token]
    );
  });
  return getSusuState(userId);
}
