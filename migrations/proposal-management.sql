-- ============================================================================
-- Xwork — Proposal Management migration
-- Withdraw-with-reason, client invites (+blocks), and the full job-offer
-- lifecycle (offers live on the contracts table with status='offer').
-- Run in Supabase -> SQL Editor. Safe to re-run (all "if not exists").
-- ============================================================================

-- --- Proposals: withdrawal details ------------------------------------------
alter table public.proposals add column if not exists withdrawal_reason        text;
alter table public.proposals add column if not exists withdrawal_reason_custom text;
alter table public.proposals add column if not exists withdrawn_at             timestamptz;

-- --- Contracts: offer fields (an offer IS a contract with status='offer') ----
alter table public.contracts add column if not exists rate_type             text default 'fixed';
alter table public.contracts add column if not exists contract_duration     text;
alter table public.contracts add column if not exists client_message        text;  -- "About this Offer"
alter table public.contracts add column if not exists offer_milestones      jsonb; -- [{name, amount, due_date}]
alter table public.contracts add column if not exists offer_expires_at      timestamptz;
alter table public.contracts add column if not exists decline_reason        text;
alter table public.contracts add column if not exists decline_reason_custom text;
alter table public.contracts add column if not exists responded_at          timestamptz;

-- --- Messages: typed messages (offer cards + system notices) ----------------
alter table public.messages add column if not exists kind     text default 'text'; -- 'text'|'attachment'|'offer'|'system'
alter table public.messages add column if not exists offer_id uuid references public.contracts (id) on delete set null;

-- --- Invites (client invites a freelancer to apply to a job) ----------------
create table if not exists public.invites (
  id                     uuid primary key default gen_random_uuid(),
  job_id                 uuid references public.jobs (id) on delete cascade,
  client_id              uuid references public.profiles (id) on delete cascade,
  freelancer_id          uuid references public.profiles (id) on delete cascade,
  status                 text default 'pending', -- 'pending'|'accepted'|'declined'
  decline_reason         text,
  decline_reason_custom  text,
  declined_at            timestamptz,
  accepted_at            timestamptz,
  sent_at                timestamptz default now(),
  resulting_proposal_id  uuid references public.proposals (id) on delete set null
);
create index if not exists invites_freelancer_idx on public.invites (freelancer_id, status);
create index if not exists invites_job_idx        on public.invites (job_id);

-- --- Invite blocks (freelancer silently blocks a client's future invites) ---
create table if not exists public.client_invite_blocks (
  id            uuid primary key default gen_random_uuid(),
  freelancer_id uuid references public.profiles (id) on delete cascade,
  client_id     uuid references public.profiles (id) on delete cascade,
  blocked_at    timestamptz default now(),
  unique (freelancer_id, client_id)
);

-- --- RLS ---------------------------------------------------------------------
alter table public.invites             enable row level security;
alter table public.client_invite_blocks enable row level security;

-- invites: both parties can read; the client creates; the freelancer responds.
drop policy if exists "invites_select" on public.invites;
drop policy if exists "invites_insert" on public.invites;
drop policy if exists "invites_update" on public.invites;
create policy "invites_select" on public.invites
  for select to authenticated
  using (auth.uid() = freelancer_id or auth.uid() = client_id);
create policy "invites_insert" on public.invites
  for insert to authenticated with check (auth.uid() = client_id);
create policy "invites_update" on public.invites
  for update to authenticated
  using (auth.uid() = freelancer_id or auth.uid() = client_id)
  with check (auth.uid() = freelancer_id or auth.uid() = client_id);

-- client_invite_blocks: the freelancer manages their own block list. Clients
-- never see it (blocks are silent) — inviteToJob checks it server-side.
drop policy if exists "blocks_select" on public.client_invite_blocks;
drop policy if exists "blocks_insert" on public.client_invite_blocks;
drop policy if exists "blocks_delete" on public.client_invite_blocks;
create policy "blocks_select" on public.client_invite_blocks
  for select to authenticated using (auth.uid() = freelancer_id);
create policy "blocks_insert" on public.client_invite_blocks
  for insert to authenticated with check (auth.uid() = freelancer_id);
create policy "blocks_delete" on public.client_invite_blocks
  for delete to authenticated using (auth.uid() = freelancer_id);

-- ============================================================================
-- DONE — proposal-management schema ready.
-- ============================================================================
