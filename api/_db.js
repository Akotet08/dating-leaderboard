import postgres from "postgres";
import { getFirstEnv } from "./_payment-config.js";

let sql;
let schemaReady;

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
  if (!schemaReady) {
    schemaReady = createPaymentSchema();
  }

  return schemaReady;
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
