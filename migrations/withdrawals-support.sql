-- ============================================================================
-- Xwork — Withdrawals, refund requests, support tickets
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

-- ---- 1) Withdrawals ledger (freelancer cashes out available balance) -------
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  method_id uuid references public.payout_methods(id) on delete set null,
  method_label text not null,
  amount numeric not null,
  fee numeric not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
alter table public.withdrawals enable row level security;

drop policy if exists "withdrawals own read" on public.withdrawals;
create policy "withdrawals own read" on public.withdrawals
  for select using (auth.uid() = user_id);

drop policy if exists "withdrawals own insert" on public.withdrawals;
create policy "withdrawals own insert" on public.withdrawals
  for insert with check (auth.uid() = user_id);

create index if not exists withdrawals_user_idx
  on public.withdrawals (user_id, created_at desc);

-- ---- 2) Refund requests on contracts ---------------------------------------
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  reason text not null,
  status text not null default 'pending', -- pending | accepted | declined | cancelled
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.refund_requests enable row level security;

-- Both contract parties can see and update; only a party can create.
drop policy if exists "refunds party read" on public.refund_requests;
create policy "refunds party read" on public.refund_requests
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and (c.freelancer_id = auth.uid() or c.client_id = auth.uid())
    )
  );

drop policy if exists "refunds party insert" on public.refund_requests;
create policy "refunds party insert" on public.refund_requests
  for insert with check (
    auth.uid() = requester_id
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and (c.freelancer_id = auth.uid() or c.client_id = auth.uid())
    )
  );

drop policy if exists "refunds party update" on public.refund_requests;
create policy "refunds party update" on public.refund_requests
  for update using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and (c.freelancer_id = auth.uid() or c.client_id = auth.uid())
    )
  );

create index if not exists refund_requests_contract_idx
  on public.refund_requests (contract_id, created_at desc);

-- ---- 3) Support tickets -----------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  category text not null default 'other',
  status text not null default 'open', -- open | closed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;

drop policy if exists "tickets own read" on public.support_tickets;
create policy "tickets own read" on public.support_tickets
  for select using (auth.uid() = user_id);

drop policy if exists "tickets own insert" on public.support_tickets;
create policy "tickets own insert" on public.support_tickets
  for insert with check (auth.uid() = user_id);

drop policy if exists "tickets own update" on public.support_tickets;
create policy "tickets own update" on public.support_tickets
  for update using (auth.uid() = user_id);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  is_staff boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.support_messages enable row level security;

drop policy if exists "ticket messages read" on public.support_messages;
create policy "ticket messages read" on public.support_messages
  for select using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "ticket messages insert" on public.support_messages;
create policy "ticket messages insert" on public.support_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

create index if not exists support_messages_ticket_idx
  on public.support_messages (ticket_id, created_at);

-- ============================================================================
-- DONE.
-- ============================================================================
