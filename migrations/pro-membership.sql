-- ============================================================================
-- Xwork — Pro Membership migration
-- Adds the Pro plan columns, the payments/insights ledgers, and RLS.
-- Run in Supabase -> SQL Editor. Safe to re-run (all "if not exists").
-- ============================================================================

-- --- Profiles: membership + billing metadata -------------------------------
alter table public.profiles add column if not exists plan                       text        default 'basic';
alter table public.profiles add column if not exists membership_status          text        default 'inactive';
alter table public.profiles add column if not exists membership_start_date      timestamptz;
alter table public.profiles add column if not exists membership_end_date        timestamptz;
alter table public.profiles add column if not exists membership_autorenew       boolean     default true;
alter table public.profiles add column if not exists stripe_customer_id         text;
alter table public.profiles add column if not exists stripe_payment_method_id   text;
alter table public.profiles add column if not exists stripe_subscription_id     text;
alter table public.profiles add column if not exists paypal_email               text;
alter table public.profiles add column if not exists paypal_billing_agreement_id text;
alter table public.profiles add column if not exists last_payment_method        text;
alter table public.profiles add column if not exists card_brand                 text;
alter table public.profiles add column if not exists card_last4                 text;
alter table public.profiles add column if not exists last_active_at             timestamptz;
alter table public.profiles add column if not exists custom_slug_active         boolean     default false;

-- Columns reused as-is (already present): username (custom slug),
-- hide_earnings (private earnings), notification_prefs (job-alert toggles).

-- --- Membership payments ledger --------------------------------------------
create table if not exists public.membership_payments (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references public.profiles (id) on delete cascade,
  amount                   numeric,
  currency                 text default 'usd',
  method                   text,        -- 'balance' | 'card' | 'paypal'
  status                   text,        -- 'paid' | 'failed'
  payment_date             timestamptz default now(),
  billing_period_start     timestamptz,
  billing_period_end       timestamptz,
  stripe_payment_intent_id text,
  paypal_transaction_id    text,
  note                     text,
  created_at               timestamptz default now()
);

-- --- Job payments ledger (net-after-fee, per released milestone) ------------
create table if not exists public.job_payments (
  id                     uuid primary key default gen_random_uuid(),
  job_id                 uuid references public.jobs (id) on delete set null,
  milestone_id           uuid references public.milestones (id) on delete set null,
  freelancer_id          uuid references public.profiles (id) on delete cascade,
  gross_amount           numeric,
  marketplace_fee_rate   numeric,
  marketplace_fee_amount numeric,
  net_amount             numeric,
  plan_at_time_of_payment text,
  payment_date           timestamptz default now(),
  created_at             timestamptz default now()
);

-- One ledger row per milestone (idempotent write from approveMilestone()).
create unique index if not exists job_payments_milestone_uidx
  on public.job_payments (milestone_id);

-- --- Proposal insights (Pro analytics) -------------------------------------
create table if not exists public.proposal_insights (
  id                     uuid primary key default gen_random_uuid(),
  proposal_id            uuid references public.proposals (id) on delete cascade,
  job_id                 uuid references public.jobs (id) on delete cascade,
  freelancer_id          uuid references public.profiles (id) on delete cascade,
  viewed_by_client       boolean default false,
  viewed_at              timestamptz,
  client_last_active     timestamptz,
  proposal_rank          integer,
  profile_views_from_job integer default 0,
  updated_at             timestamptz default now()
);
create unique index if not exists proposal_insights_proposal_uidx
  on public.proposal_insights (proposal_id);

-- --- Profile view events (feeds profile_views_from_job) ---------------------
create table if not exists public.profile_view_events (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  viewer_id  uuid references public.profiles (id) on delete set null,
  job_id     uuid references public.jobs (id) on delete set null,
  created_at timestamptz default now()
);

-- --- RLS --------------------------------------------------------------------
alter table public.membership_payments enable row level security;
alter table public.job_payments        enable row level security;
alter table public.proposal_insights   enable row level security;
alter table public.profile_view_events enable row level security;

-- membership_payments: a user reads only their own payments.
drop policy if exists "own_membership_pay_select" on public.membership_payments;
create policy "own_membership_pay_select" on public.membership_payments
  for select to authenticated using (auth.uid() = user_id);

-- job_payments: a freelancer reads only their own earnings rows.
drop policy if exists "own_job_pay_select" on public.job_payments;
create policy "own_job_pay_select" on public.job_payments
  for select to authenticated using (auth.uid() = freelancer_id);

-- proposal_insights: a freelancer reads only their own insight rows.
drop policy if exists "own_insights_select" on public.proposal_insights;
create policy "own_insights_select" on public.proposal_insights
  for select to authenticated using (auth.uid() = freelancer_id);

-- profile_view_events: the profile owner reads their own view events; any
-- authenticated user may record a view.
drop policy if exists "own_profile_views_select" on public.profile_view_events;
drop policy if exists "any_profile_views_insert" on public.profile_view_events;
create policy "own_profile_views_select" on public.profile_view_events
  for select to authenticated using (auth.uid() = profile_id);
create policy "any_profile_views_insert" on public.profile_view_events
  for insert to authenticated with check (auth.uid() = viewer_id);

-- Writes to the ledgers/insights are done with the service-role key
-- (createAdminClient), which bypasses RLS — so no insert/update policies are
-- needed for membership_payments / job_payments / proposal_insights.

-- --- Backfill job_payments from existing released milestones ---------------
-- Historical earnings were all at the Basic 10% rate; record them so the new
-- earnings ledger matches what freelancers already see today.
insert into public.job_payments
  (job_id, milestone_id, freelancer_id, gross_amount, marketplace_fee_rate,
   marketplace_fee_amount, net_amount, plan_at_time_of_payment, payment_date)
select
  m.job_id,
  m.id,
  c.freelancer_id,
  coalesce(m.amount, 0),
  0.10,
  round(coalesce(m.amount, 0) * 0.10, 2),
  round(coalesce(m.amount, 0) * 0.90, 2),
  'basic',
  coalesce(m.approved_at, m.created_at, now())
from public.milestones m
join public.contracts c on c.id = m.contract_id
where m.payment_status = 'released'
  and c.freelancer_id is not null
on conflict (milestone_id) do nothing;

-- ============================================================================
-- DONE — Pro Membership schema ready.
-- ============================================================================
