import postgres from "postgres";
import { getFirstEnv } from "./_payment-config.js";
import { hashPassword } from "./_auth.js";

let sql;
let paymentSchemaReady;
let appSchemaReady;

export function getSql() {
  if (!sql) {
    sql = postgres(getFirstEnv(["POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"]), {
      ssl: "require",
      max: 1
    });
  }

  return sql;
}

export async function ensurePaymentSchema() {
  if (!paymentSchemaReady) {
    paymentSchemaReady = createPaymentSchema();
  }

  return paymentSchemaReady;
}

export async function ensureAppSchema() {
  if (!appSchemaReady) {
    appSchemaReady = createAppSchema();
  }

  return appSchemaReady;
}

export async function listLeaderboardUsers() {
  const db = getSql();
  await ensureAppSchema();

  return db`
    select
      id,
      name,
      role,
      pickup_line,
      tier,
      score,
      note,
      delta,
      is_boostable,
      has_login,
      created_at
    from app_users
    where role = 'user'
    order by score desc, created_at asc
  `;
}

export async function findLoginUserByName(name) {
  const db = getSql();
  await ensureAppSchema();

  const users = await db`
    select id, name, role, pickup_line, password_hash, has_login
    from app_users
    where lower(name) = lower(${name}) and has_login = true
    limit 1
  `;
  return users[0] ?? null;
}

export async function findUserById(id) {
  const db = getSql();
  await ensureAppSchema();

  const users = await db`
    select id, name, role, pickup_line, password_hash, has_login
    from app_users
    where id = ${id}
    limit 1
  `;
  return users[0] ?? null;
}

export async function createRegisteredUser({ name, pickupLine, password }) {
  const db = getSql();
  await ensureAppSchema();
  const passwordHash = await hashPassword(password);

  const users = await db`
    insert into app_users (
      name,
      role,
      pickup_line,
      password_hash,
      has_login,
      tier,
      score,
      note,
      delta,
      is_boostable
    )
    values (
      ${name},
      'user',
      ${pickupLine},
      ${passwordHash},
      true,
      'C-Tier',
      0,
      ${pickupLine},
      'New',
      false
    )
    returning id, name, role, pickup_line, has_login
  `;

  return users[0];
}

export async function createLeaderboardUser(candidate) {
  const db = getSql();
  await ensureAppSchema();
  const passwordHash = candidate.password ? await hashPassword(candidate.password) : null;

  const users = await db`
    insert into app_users (
      name,
      role,
      pickup_line,
      password_hash,
      has_login,
      tier,
      score,
      note,
      delta,
      is_boostable
    )
    values (
      ${candidate.name},
      'user',
      ${candidate.pickupLine ?? null},
      ${passwordHash},
      ${Boolean(candidate.password)},
      ${candidate.tier},
      ${candidate.score},
      ${candidate.note},
      ${candidate.delta || null},
      ${Boolean(candidate.isUser)}
    )
    returning id
  `;

  if (candidate.isUser) {
    await clearOtherBoostableUsers(users[0].id);
  }

  return users[0];
}

export async function updateLeaderboardUser(id, candidate) {
  const db = getSql();
  await ensureAppSchema();

  await db`
    update app_users
    set
      name = ${candidate.name},
      pickup_line = ${candidate.pickupLine ?? null},
      tier = ${candidate.tier},
      score = ${candidate.score},
      note = ${candidate.note},
      delta = ${candidate.delta || null},
      is_boostable = ${Boolean(candidate.isUser)},
      updated_at = now()
    where id = ${id} and role = 'user'
  `;

  if (candidate.isUser) {
    await clearOtherBoostableUsers(id);
  }
}

export async function deleteLeaderboardUser(id) {
  const db = getSql();
  await ensureAppSchema();
  await db`delete from app_users where id = ${id} and role = 'user'`;
}

export async function updateUserPassword(id, password) {
  const db = getSql();
  await ensureAppSchema();
  const passwordHash = await hashPassword(password);

  await db`
    update app_users
    set password_hash = ${passwordHash}, has_login = true, updated_at = now()
    where id = ${id}
  `;
}

export async function createPendingBoostPayment({
  stripeSessionId,
  candidateId,
  candidateName,
  boostId,
  spots,
  amountCents,
  currency
}) {
  const db = getSql();
  await ensurePaymentSchema();

  await db`
    insert into boost_payments (
      stripe_session_id,
      candidate_id,
      candidate_name,
      boost_id,
      spots,
      amount_cents,
      currency,
      status
    )
    values (
      ${stripeSessionId},
      ${candidateId},
      ${candidateName},
      ${boostId},
      ${spots},
      ${amountCents},
      ${currency},
      'pending'
    )
    on conflict (stripe_session_id) do nothing
  `;
}

export async function markBoostPaymentPaid({
  stripeSessionId,
  stripePaymentIntentId,
  candidateId,
  candidateName,
  boostId,
  spots
}) {
  const db = getSql();
  await ensurePaymentSchema();

  await db.begin(async (transaction) => {
    await transaction`
      update boost_payments
      set
        status = 'paid',
        stripe_payment_intent_id = ${stripePaymentIntentId ?? null},
        paid_at = now()
      where stripe_session_id = ${stripeSessionId}
    `;

    await transaction`
      insert into paid_rank_boosts (
        stripe_session_id,
        candidate_id,
        candidate_name,
        boost_id,
        spots
      )
      values (
        ${stripeSessionId},
        ${candidateId},
        ${candidateName},
        ${boostId},
        ${spots}
      )
      on conflict (stripe_session_id) do nothing
    `;
  });
}

async function createPaymentSchema() {
  const db = getSql();

  await db`create extension if not exists pgcrypto`;

  await db`
    create table if not exists boost_payments (
      id uuid primary key default gen_random_uuid(),
      stripe_session_id text not null unique,
      stripe_payment_intent_id text,
      candidate_id text not null,
      candidate_name text not null default '',
      boost_id text not null check (boost_id in ('nudge', 'push', 'launch')),
      spots integer not null check (spots > 0),
      amount_cents integer not null check (amount_cents > 0),
      currency text not null default 'usd',
      status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
      paid_at timestamptz,
      created_at timestamptz not null default now()
    )
  `;

  await db`
    create table if not exists paid_rank_boosts (
      id uuid primary key default gen_random_uuid(),
      stripe_session_id text not null unique references boost_payments(stripe_session_id) on delete cascade,
      candidate_id text not null,
      candidate_name text not null default '',
      boost_id text not null check (boost_id in ('nudge', 'push', 'launch')),
      spots integer not null check (spots > 0),
      created_at timestamptz not null default now()
    )
  `;

  await db`create index if not exists boost_payments_candidate_id_idx on boost_payments(candidate_id)`;
  await db`create index if not exists boost_payments_status_idx on boost_payments(status)`;
  await db`create index if not exists paid_rank_boosts_candidate_id_idx on paid_rank_boosts(candidate_id)`;
}

async function createAppSchema() {
  const db = getSql();

  await db`create extension if not exists pgcrypto`;

  await db`
    create table if not exists app_users (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      role text not null default 'user' check (role in ('admin', 'user')),
      pickup_line text,
      password_hash text,
      has_login boolean not null default false,
      tier text not null default 'C-Tier' check (tier in ('S-Tier', 'A-Tier', 'B-Tier', 'C-Tier')),
      score integer not null default 0 check (score >= 0 and score <= 80),
      note text not null default '',
      delta text,
      is_boostable boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await db`create unique index if not exists app_users_lower_name_idx on app_users (lower(name))`;
  await db`create unique index if not exists app_users_one_admin_idx on app_users ((role)) where role = 'admin'`;
  await db`create index if not exists app_users_role_score_idx on app_users(role, score desc)`;

  await seedAdminUser();
  await seedDemoLeaderboard();
}

async function seedAdminUser() {
  const db = getSql();
  const passwordHash = await hashPassword(process.env.ADMIN_DEFAULT_PASSWORD ?? "Deme_looking_for_the_one");

  await db`
    insert into app_users (
      name,
      role,
      pickup_line,
      password_hash,
      has_login,
      tier,
      score,
      note,
      delta,
      is_boostable
    )
    values (
      'Deme',
      'admin',
      null,
      ${passwordHash},
      true,
      'S-Tier',
      80,
      'Admin',
      null,
      false
    )
    on conflict do nothing
  `;
}

async function seedDemoLeaderboard() {
  const db = getSql();
  const existing = await db`select count(*)::int as count from app_users where role = 'user'`;

  if (existing[0]?.count > 0) {
    return;
  }

  for (const candidate of defaultLeaderboardUsers) {
    await db`
      insert into app_users (
        name,
        role,
        pickup_line,
        has_login,
        tier,
        score,
        note,
        delta,
        is_boostable
      )
      values (
        ${candidate.name},
        'user',
        ${candidate.pickupLine ?? null},
        false,
        ${candidate.tier},
        ${candidate.score},
        ${candidate.note},
        ${candidate.delta ?? null},
        ${Boolean(candidate.isUser)}
      )
      on conflict do nothing
    `;
  }
}

async function clearOtherBoostableUsers(activeId) {
  const db = getSql();
  await db`
    update app_users
    set is_boostable = false
    where id <> ${activeId} and role = 'user'
  `;
}

const defaultLeaderboardUsers = [
  {
    name: "Tyrone",
    tier: "S-Tier",
    score: 79,
    note: "Remembers every detail you mention and still shows up 10 minutes early.",
    delta: "+4"
  },
  {
    name: "Dante",
    tier: "S-Tier",
    score: 76,
    note: "Main-character energy, replies in under 3 minutes, and has a 5-year plan.",
    delta: "+2"
  },
  {
    name: "Isaac",
    tier: "S-Tier",
    score: 72,
    note: "Asked one thoughtful question and accidentally cleared the field.",
    delta: "New"
  },
  {
    name: "Hector",
    tier: "A-Tier",
    score: 68,
    note: "Brings flowers without making it a personality reveal.",
    delta: "+1"
  },
  {
    name: "Jordan",
    tier: "A-Tier",
    score: 64,
    note: "Great dinner pick. Suspiciously vague about his weekday schedule.",
    delta: "-1"
  },
  {
    name: "Andre",
    tier: "A-Tier",
    score: 61,
    note: "Sent a voice note that was somehow charming and under 20 seconds.",
    delta: "+3"
  },
  {
    name: "Marcus",
    tier: "A-Tier",
    score: 58,
    note: "Reliable, kind, and still recovering from the group chat audit.",
    delta: "-2"
  },
  {
    name: "Caleb",
    tier: "B-Tier",
    score: 54,
    note: "Has potential if the phrase 'let's play it by ear' is retired.",
    delta: "+1"
  },
  {
    name: "Nate",
    tier: "B-Tier",
    score: 51,
    note: "Good vibes, solid intentions, still working on the follow-through.",
    delta: "-1"
  },
  {
    name: "Miles",
    tier: "B-Tier",
    score: 48,
    note: "Sweet and spontaneous - just needs to answer texts before 11 PM.",
    delta: "+2"
  },
  {
    name: "Cole",
    tier: "B-Tier",
    score: 46,
    note: "Looks great on paper. The paper is a parking ticket.",
    delta: "-3"
  },
  {
    name: "Jalen",
    tier: "B-Tier",
    score: 45,
    note: "Nice guy. Took 48 hours to confirm dinner plans.",
    delta: "0"
  },
  {
    name: "You",
    tier: "B-Tier",
    score: 44,
    note: "You have potential - real potential - but 'I'm bad at texting' is not a personality trait.",
    delta: "You",
    isUser: true
  },
  {
    name: "Trey",
    tier: "C-Tier",
    score: 38,
    note: "Keeps cancelling plans because of a 'work thing.' That thing is a PS5.",
    delta: "-4"
  },
  {
    name: "Kendrick",
    tier: "C-Tier",
    score: 34,
    note: "Emotionally available once a month, around the new moon, if conditions are right.",
    delta: "-1"
  }
];
