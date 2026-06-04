create extension if not exists pgcrypto;

create table if not exists public.boost_payments (
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
);

create table if not exists public.paid_rank_boosts (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique references public.boost_payments(stripe_session_id) on delete cascade,
  candidate_id text not null,
  candidate_name text not null default '',
  boost_id text not null check (boost_id in ('nudge', 'push', 'launch')),
  spots integer not null check (spots > 0),
  created_at timestamptz not null default now()
);

create index if not exists boost_payments_candidate_id_idx on public.boost_payments(candidate_id);
create index if not exists boost_payments_status_idx on public.boost_payments(status);
create index if not exists paid_rank_boosts_candidate_id_idx on public.paid_rank_boosts(candidate_id);

alter table public.boost_payments enable row level security;
alter table public.paid_rank_boosts enable row level security;

drop policy if exists "Service role can manage boost payments" on public.boost_payments;
create policy "Service role can manage boost payments"
  on public.boost_payments
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can manage paid rank boosts" on public.paid_rank_boosts;
create policy "Service role can manage paid rank boosts"
  on public.paid_rank_boosts
  for all
  to service_role
  using (true)
  with check (true);
