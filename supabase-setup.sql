-- ============================================================================
-- Xwork — Complete Supabase database setup
-- ============================================================================
-- HOW TO USE:
--   1. Open your Supabase project → SQL Editor → New query
--   2. Paste this ENTIRE file and click "Run"
--   3. Done — all tables, security policies, storage, and the auto-profile
--      trigger are created.
--
-- Safe to re-run: every statement uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- Profiles: one row per user (linked to Supabase auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  username    text,
  role        text default 'client',          -- 'client' | 'freelancer'
  full_name   text,
  bio         text,
  skills      text,
  location    text,
  website     text,
  phone       text,
  created_at  timestamptz default now()
);

-- Jobs: posted by clients
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  budget      numeric,
  client_id   uuid references public.profiles (id) on delete cascade,
  created_at  timestamptz default now()
);

-- Proposals: freelancers applying to jobs
create table if not exists public.proposals (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.jobs (id) on delete cascade,
  freelancer_id uuid references public.profiles (id) on delete cascade,
  cover_letter  text,
  bid_amount    numeric,
  delivery_days integer,
  status        text default 'pending',        -- 'pending' | 'accepted'
  created_at    timestamptz default now()
);

-- Contracts: created when a client hires a freelancer
create table if not exists public.contracts (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.jobs (id) on delete cascade,
  client_id     uuid references public.profiles (id) on delete cascade,
  freelancer_id uuid references public.profiles (id) on delete cascade,
  proposal_id   uuid references public.proposals (id) on delete set null,
  title         text,
  amount        numeric,
  status        text default 'active',         -- 'active' | 'completed'
  start_date    timestamptz,
  end_date      timestamptz,
  created_at    timestamptz default now()
);

-- Milestones: payment/work milestones within a contract
create table if not exists public.milestones (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid references public.contracts (id) on delete cascade,
  job_id         uuid references public.jobs (id) on delete cascade,
  proposal_id    uuid references public.proposals (id) on delete set null,
  title          text,
  amount         numeric,
  due_date       date,
  status         text default 'pending',       -- 'pending'|'submitted'|'approved'
  payment_status text,                          -- 'released'
  submitted_at   timestamptz,
  approved_at    timestamptz,
  created_at     timestamptz default now()
);

-- Conversations: a chat thread between two participants
create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.jobs (id) on delete cascade,
  contract_id   uuid references public.contracts (id) on delete cascade,
  participant_1 uuid references public.profiles (id) on delete cascade,
  participant_2 uuid references public.profiles (id) on delete cascade,
  created_at    timestamptz default now()
);

-- Messages: individual chat messages
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations (id) on delete cascade,
  sender_id       uuid references public.profiles (id) on delete cascade,
  content         text,
  created_at      timestamptz default now()
);

-- Notifications
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  type       text,                              -- 'proposal' | 'system' | ...
  title      text,
  message    text,
  link       text,
  is_read    boolean default false,
  created_at timestamptz default now()
);

-- Contract files: metadata for files uploaded to the 'project-files' bucket
create table if not exists public.contract_files (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete cascade,
  file_name   text,
  file_path   text,
  file_size   bigint,
  created_at  timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 2. AUTO-CREATE A PROFILE WHEN A USER SIGNS UP
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, role)
  values (
    new.id,
    new.email,
    split_part(coalesce(new.email, 'user'), '@', 1),
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- These are permissive policies suitable for getting the app running.
-- Tighten them before going to production.

alter table public.profiles       enable row level security;
alter table public.jobs            enable row level security;
alter table public.proposals       enable row level security;
alter table public.contracts       enable row level security;
alter table public.milestones      enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;
alter table public.notifications   enable row level security;
alter table public.contract_files  enable row level security;

-- Anyone authenticated can read everything (marketplace is browsable).
-- Writes are allowed for authenticated users.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','jobs','proposals','contracts','milestones',
    'conversations','messages','notifications','contract_files'
  ]
  loop
    execute format('drop policy if exists "read_all_%1$s"  on public.%1$s;', t);
    execute format('drop policy if exists "write_auth_%1$s" on public.%1$s;', t);

    execute format(
      'create policy "read_all_%1$s" on public.%1$s
         for select using (true);', t);

    execute format(
      'create policy "write_auth_%1$s" on public.%1$s
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 4. STORAGE BUCKET FOR PROJECT FILES
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do nothing;

drop policy if exists "project_files_read"   on storage.objects;
drop policy if exists "project_files_write"  on storage.objects;
drop policy if exists "project_files_delete" on storage.objects;

create policy "project_files_read" on storage.objects
  for select using (bucket_id = 'project-files');

create policy "project_files_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-files');

create policy "project_files_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-files');

-- ============================================================================
-- DONE. Your Xwork database is ready.
-- ============================================================================
