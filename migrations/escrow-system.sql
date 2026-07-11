-- =====================================================================
-- xWork escrow & milestone payment system — Phase 1 (schema foundation)
-- =====================================================================
-- Additive and idempotent: safe to run on the live DB. Nothing here drops
-- or rewrites existing columns; the current funded→released flow keeps
-- working while the new system is built alongside it.
--
-- Money rules baked in here:
--   * All currency is NUMERIC(12,2) — never float.
--   * escrow_transactions is an APPEND-ONLY ledger (a trigger blocks
--     UPDATE/DELETE). Wallet balances are always SUM(ledger), never stored.
--   * Every fee is its own ledger row (auditable), never "subtracted and
--     forgotten".
--   * Fees are driven by the fee_rules table, not hardcoded, so tiered fees
--     can be added later with no schema change.
-- =====================================================================

-- ---------- ENUM TYPES (created only if absent) ----------------------
do $$ begin
  create type milestone_escrow_status as enum (
    'FUNDED',              -- money in escrow, work in progress
    'IN_REVIEW',           -- freelancer submitted, client checking
    'PENDING',             -- approved; freelancer fee finalized; clearing
    'AVAILABLE',           -- clearance period passed; withdrawable
    'WITHDRAWN',           -- paid out to the freelancer's payout method
    'CANCELLATION_WINDOW', -- client ended/rejected; 7-day freelancer window
    'DISPUTE_HELD',        -- locked in platform custody, admin-only
    'REFUNDED'             -- returned to the client
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type escrow_txn_type as enum (
    'fund',            -- client money into escrow
    'fee_client',      -- marketplace fee charged to the client at funding
    'fee_freelancer',  -- service fee deducted from the freelancer at PENDING
    'release',         -- (net) escrow released toward the freelancer
    'refund',          -- escrow returned to the client
    'withdrawal',      -- freelancer balance paid out
    'bonus',           -- one-off client tip/bonus (still fee-deducted)
    'chargeback',      -- bank/gateway reversal against the platform
    'adjustment'       -- admin manual correction (always audited)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_status as enum ('open','under_review','resolved','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_resolution as enum ('release','refund','split');
exception when duplicate_object then null; end $$;

-- ---------- MILESTONES: new lifecycle columns (additive) -------------
alter table milestones
  add column if not exists escrow_status milestone_escrow_status,
  add column if not exists currency text not null default 'USD',
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists auto_approve_at timestamptz,          -- IN_REVIEW → PENDING deadline
  add column if not exists security_period_ends_at timestamptz,  -- PENDING → AVAILABLE clearance
  add column if not exists cancellation_window_ends_at timestamptz, -- CANCELLATION_WINDOW → AUTO_REFUND
  add column if not exists contract_type text not null default 'fixed'; -- 'fixed' | 'hourly' (hourly later)

-- Backfill escrow_status from the legacy payment_status so existing rows are
-- valid in the new machine. released → AVAILABLE (net already in balance),
-- returned → REFUNDED, funded → FUNDED. Only sets rows not already migrated.
-- payment_status is an enum; cast to text so unknown labels can't error.
update milestones set escrow_status =
  case
    when payment_status::text = 'released' then 'AVAILABLE'::milestone_escrow_status
    when payment_status::text = 'returned' then 'REFUNDED'::milestone_escrow_status
    when payment_status::text = 'funded'   then 'FUNDED'::milestone_escrow_status
    else escrow_status
  end
where escrow_status is null and payment_status is not null;

-- ---------- APPEND-ONLY ESCROW LEDGER --------------------------------
create table if not exists escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid references milestones(id) on delete set null,
  contract_id  uuid references contracts(id)  on delete set null,
  type escrow_txn_type not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  -- Parties: 'client' | 'freelancer' | 'platform' | 'escrow' | 'gateway'
  from_party text,
  to_party text,
  gateway_reference text,
  -- Idempotency: a gateway webhook or a double-click must never post twice.
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists escrow_txn_milestone_idx on escrow_transactions(milestone_id);
create index if not exists escrow_txn_contract_idx on escrow_transactions(contract_id);
create index if not exists escrow_txn_type_idx on escrow_transactions(type);

-- Enforce append-only: block any UPDATE or DELETE at the DB level so balances
-- are always reconstructable from history.
create or replace function escrow_txn_immutable() returns trigger as $$
begin
  raise exception 'escrow_transactions is append-only (% not allowed)', tg_op;
end; $$ language plpgsql;

drop trigger if exists escrow_txn_no_update on escrow_transactions;
create trigger escrow_txn_no_update before update or delete on escrow_transactions
  for each row execute function escrow_txn_immutable();

-- ---------- CONFIGURABLE FEE RULES -----------------------------------
create table if not exists fee_rules (
  id uuid primary key default gen_random_uuid(),
  role text not null,                       -- 'client' | 'freelancer'
  plan text,                                -- 'basic' | 'pro' | null (any)
  fee_type text not null default 'percent', -- 'percent' | 'flat' | 'tiered'
  value numeric(6,4) not null,              -- 0.1000 = 10%  (or flat amount)
  -- Optional lifetime-billed tier bounds (per client) for future sliding scale.
  tier_min numeric(12,2),
  tier_max numeric(12,2),
  applies_to text not null default 'milestone', -- 'milestone' | 'bonus' | 'withdrawal'
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed current live fees (only if the table is empty).
insert into fee_rules (role, plan, fee_type, value, applies_to)
select * from (values
  ('freelancer','basic','percent',0.1000,'milestone'),
  ('freelancer','pro','percent',0.0500,'milestone'),
  ('client',null,'percent',0.0200,'milestone')  -- kept hidden on the freelancer UI
) as v(role,plan,fee_type,value,applies_to)
where not exists (select 1 from fee_rules);

-- ---------- DISPUTES (money-authoritative) ---------------------------
create table if not exists escrow_disputes (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid references milestones(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  opened_by uuid references profiles(id) on delete set null,
  reason text,
  evidence jsonb not null default '[]'::jsonb,
  status dispute_status not null default 'open',
  resolution dispute_resolution,
  release_amount numeric(12,2),   -- admin split: to freelancer
  refund_amount numeric(12,2),    -- admin split: to client
  admin_id uuid references profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists escrow_disputes_milestone_idx on escrow_disputes(milestone_id);
create index if not exists escrow_disputes_status_idx on escrow_disputes(status);

-- ---------- WITHDRAWALS: fields the new payout flow needs ------------
alter table withdrawals
  add column if not exists gateway_reference text,
  add column if not exists idempotency_key text,
  add column if not exists processed_at timestamptz,
  add column if not exists failure_reason text;
create unique index if not exists withdrawals_idem_idx
  on withdrawals(idempotency_key) where idempotency_key is not null;

-- ---------- CHARGEBACKS (bank/gateway reversals) ---------------------
-- Separate from internal disputes: this is the client disputing the CHARGE
-- with their bank, possibly after funds are already available/withdrawn.
create table if not exists chargebacks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid references milestones(id) on delete set null,
  contract_id uuid references contracts(id) on delete set null,
  gateway_reference text,
  amount numeric(12,2) not null,
  status text not null default 'received', -- received | contesting | lost | won
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------- AUDIT LOG (every transition & admin action) --------------
create table if not exists escrow_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  actor_role text,
  action text not null,          -- e.g. 'milestone.approve', 'dispute.resolve'
  entity_type text not null,     -- 'milestone' | 'dispute' | 'withdrawal' ...
  entity_id uuid,
  from_status text,
  to_status text,
  amount numeric(12,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists escrow_audit_entity_idx on escrow_audit_log(entity_type, entity_id);

-- ---------- WALLET VIEW (derived, never stored) ----------------------
-- Balances are always computed from the append-only ledger. This view is a
-- convenience read model; it is never the source of truth.
create or replace view wallet_balances as
select
  p.id as user_id,
  -- Work-in-progress: full gross of the freelancer's FUNDED / IN_REVIEW
  -- milestones (shown gross, no fee yet — per the spec's visibility rule).
  coalesce((
    select sum(m.amount) from milestones m
    join contracts c on c.id = m.contract_id
    where c.freelancer_id = p.id
      and m.escrow_status in ('FUNDED','IN_REVIEW')
  ),0)::numeric(12,2) as work_in_progress_balance,
  -- Pending: net releases (release rows) for milestones still clearing.
  coalesce((
    select sum(t.amount) from escrow_transactions t
    join milestones m on m.id = t.milestone_id
    join contracts c on c.id = m.contract_id
    where c.freelancer_id = p.id and t.type = 'release'
      and m.escrow_status = 'PENDING'
  ),0)::numeric(12,2) as pending_balance,
  -- Available: net releases that have cleared, minus withdrawals.
  coalesce((
    select sum(t.amount) from escrow_transactions t
    join milestones m on m.id = t.milestone_id
    join contracts c on c.id = m.contract_id
    where c.freelancer_id = p.id and t.type = 'release'
      and m.escrow_status in ('AVAILABLE','WITHDRAWN')
  ),0)::numeric(12,2)
  - coalesce((
    select sum(t.amount) from escrow_transactions t
    where t.to_party = 'freelancer' and t.type = 'withdrawal'
      and t.created_by = p.id
  ),0)::numeric(12,2) as available_balance
from profiles p;
