-- ============================================================================
-- Xwork — Messages inbox migration
-- Chat safety consent, out-of-office, per-user conversation preferences
-- (pin/favorite/hide), saved messages, ended conversations, and the
-- freelancer→client "propose contract" requests.
-- Run in Supabase -> SQL Editor. Safe to re-run (all "if not exists").
-- ============================================================================

-- --- Profiles: chat consent + out-of-office ---------------------------------
alter table public.profiles add column if not exists chat_rules_accepted_at timestamptz;
alter table public.profiles add column if not exists out_of_office          boolean default false;
alter table public.profiles add column if not exists out_of_office_until    date;

-- --- Conversations: ended state ----------------------------------------------
alter table public.conversations add column if not exists ended_at timestamptz;
alter table public.conversations add column if not exists ended_by uuid references public.profiles (id) on delete set null;

-- --- Contract requests (freelancer proposes a contract to the client) --------
create table if not exists public.contract_requests (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations (id) on delete cascade,
  job_id          uuid references public.jobs (id) on delete set null,
  client_id       uuid references public.profiles (id) on delete cascade,
  freelancer_id   uuid references public.profiles (id) on delete cascade,
  title           text,
  amount          numeric,
  rate_type       text default 'fixed',   -- 'fixed' | 'hourly'
  duration        text,
  description     text,
  milestones      jsonb,                  -- [{name, amount, due_date}]
  status          text default 'pending', -- 'pending' | 'offer_sent' | 'declined'
  created_at      timestamptz default now(),
  responded_at    timestamptz
);
create index if not exists contract_requests_client_idx
  on public.contract_requests (client_id, status);
create index if not exists contract_requests_freelancer_idx
  on public.contract_requests (freelancer_id);

-- --- Messages: link to a contract request ------------------------------------
-- (kind gains the value 'contract_request')
alter table public.messages add column if not exists request_id uuid references public.contract_requests (id) on delete set null;

-- --- Per-user conversation preferences ----------------------------------------
create table if not exists public.conversation_prefs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  pinned          boolean default false,
  favorite        boolean default false,
  hidden          boolean default false,
  updated_at      timestamptz default now(),
  unique (user_id, conversation_id)
);

-- --- Saved (starred) messages ---------------------------------------------------
create table if not exists public.saved_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete cascade,
  message_id      uuid references public.messages (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  created_at      timestamptz default now(),
  unique (user_id, message_id)
);

-- --- RLS -----------------------------------------------------------------------
alter table public.conversation_prefs enable row level security;
alter table public.saved_messages     enable row level security;
alter table public.contract_requests  enable row level security;

-- conversation_prefs: each user manages only their own rows.
drop policy if exists "own_convo_prefs" on public.conversation_prefs;
create policy "own_convo_prefs" on public.conversation_prefs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_messages: each user manages only their own stars.
drop policy if exists "own_saved_messages" on public.saved_messages;
create policy "own_saved_messages" on public.saved_messages
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- contract_requests: both parties read; the freelancer creates; the client
-- responds (status flip). The freelancer may also update (e.g. withdraw later).
drop policy if exists "contract_requests_select" on public.contract_requests;
drop policy if exists "contract_requests_insert" on public.contract_requests;
drop policy if exists "contract_requests_update" on public.contract_requests;
create policy "contract_requests_select" on public.contract_requests
  for select to authenticated
  using (auth.uid() = freelancer_id or auth.uid() = client_id);
create policy "contract_requests_insert" on public.contract_requests
  for insert to authenticated with check (auth.uid() = freelancer_id);
create policy "contract_requests_update" on public.contract_requests
  for update to authenticated
  using (auth.uid() = freelancer_id or auth.uid() = client_id)
  with check (auth.uid() = freelancer_id or auth.uid() = client_id);

-- ============================================================================
-- DONE — messages-inbox schema ready.
-- ============================================================================
