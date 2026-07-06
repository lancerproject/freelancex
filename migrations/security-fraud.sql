-- ============================================================================
-- Xwork — Account Security & Fraud Detection system.
-- Adds richer account status to profiles + the fraud/security log tables.
-- These log tables have RLS ENABLED with NO public policies, so only the
-- service role (createAdminClient) can read/write them — users can never see
-- other people's fraud data. Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

-- Richer status on profiles (keeps the existing `suspended` boolean in sync).
alter table public.profiles add column if not exists account_status   text default 'active';
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles add column if not exists suspended_at      timestamptz;

-- 1) Platform IP blacklist — checked first on every login/registration.
create table if not exists public.ip_blacklist (
  id         uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  reason     text,
  added_by   text default 'system',        -- admin id or 'system'
  created_at timestamptz default now()
);

-- 2) Fraud alerts for the (future) admin review dashboard.
create table if not exists public.fraud_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,
  alert_type  text not null,               -- e.g. identity_country_mismatch, vpn_proxy_detected
  details     jsonb,
  status      text default 'pending',       -- 'pending' | 'reviewed'
  reviewed_by uuid references public.profiles (id),
  created_at  timestamptz default now()
);

-- 3) Every external IP intelligence check (audit trail).
create table if not exists public.ip_checks_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles (id) on delete set null,
  ip_address     text,
  vpn_detected   boolean,
  proxy_detected boolean,
  tor_detected   boolean,
  abuse_score    integer,
  check_source   text,                      -- 'ipqualityscore' | 'abuseipdb' | 'fallback'
  created_at     timestamptz default now()
);

-- 4) General security event log (suspensions, flags, blocks, bot signals…).
create table if not exists public.security_events_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  event_type  text not null,
  description text,
  ip_address  text,
  device_info text,
  created_at  timestamptz default now()
);

create index if not exists fraud_alerts_status_idx on public.fraud_alerts (status);
create index if not exists ip_checks_user_idx on public.ip_checks_log (user_id);

-- RLS on: no policies → only the service role can touch these tables.
alter table public.ip_blacklist enable row level security;
alter table public.fraud_alerts enable row level security;
alter table public.ip_checks_log enable row level security;
alter table public.security_events_log enable row level security;

-- ============================================================================
-- DONE.
-- ============================================================================
